import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const COLECOES = ['Músicas', 'Hinos da Harpa'];
const CACHE_DB = 'filhos-asafe-instrumentos-cache';
const CACHE_VERSION = 1;
const CACHE_STORES = { documentos: 'documentos', configuracoes: 'configuracoes', meta: 'meta' };
const CONFIGURACOES_PADRAO = [
  { key: 'clarinete', nomeExibicao: 'Clarinete', aliases: ['Clarinete', 'Clarinete 1', 'Clarinete I'], ativo: true, ordem: 20 },
  { key: 'trombone', nomeExibicao: 'Trombone', aliases: ['Trombone', 'Trombone 1', 'Trombone I', 'Trombone 01'], ativo: true, ordem: 40 },
  { key: 'trompete', nomeExibicao: 'Trompete', aliases: ['Trompete', 'Trumpet', 'Cornet'], ativo: true, ordem: 45 },
  { key: 'violino', nomeExibicao: 'Violino', aliases: ['Violino', 'Violino 1', 'Violino I'], ativo: true, ordem: 80 }
];
let pdfLib = null;
let JSZip = null;
let documentos = [];
let configuracoes = [];
let selecionados = new Set();
let instrumentoAtualKey = '';
let instrumentoAtualNome = '';
let carregamentoConcluido = false;

const $ = id => document.getElementById(id);

function normalizar(texto = '') {
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function escapar(texto = '') {
  return String(texto).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function nomeSeguro(nome) { return nome.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 150) || 'partitura'; }
function chaveDocumento(colId, docId) { return `${colId}:${docId}`; }
function formatarData(data) { return data ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data)) : ''; }

function setLoading(title, message, visible = true) {
  $('loading-card').hidden = !visible;
  $('loading-title').textContent = title;
  $('loading-message').textContent = message;
}
function setStatus(message = '', error = false) {
  $('status').textContent = message;
  $('status').className = error ? 'status error' : 'status';
}
function setControls(disabled) {
  $('instrument-select').disabled = disabled;
  $('collection-select').disabled = disabled;
  $('refresh-labels').disabled = disabled;
  $('select-all').disabled = disabled;
  $('clear-selection').disabled = disabled;
}

function abrirCache() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const request = indexedDB.open(CACHE_DB, CACHE_VERSION);
    request.onupgradeneeded = () => {
      const dbCache = request.result;
      Object.values(CACHE_STORES).forEach(nome => { if (!dbCache.objectStoreNames.contains(nome)) dbCache.createObjectStore(nome, { keyPath: 'key' }); });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha ao abrir cache'));
  });
}
function transacaoCache(modo, callback) {
  return abrirCache().then(dbCache => new Promise((resolve, reject) => {
    const tx = dbCache.transaction(Object.values(CACHE_STORES), modo);
    const resultado = callback(tx.objectStore(CACHE_STORES.documentos), tx.objectStore(CACHE_STORES.configuracoes), tx.objectStore(CACHE_STORES.meta));
    tx.oncomplete = () => { dbCache.close(); resolve(resultado); };
    tx.onerror = () => { dbCache.close(); reject(tx.error || new Error('Falha no cache')); };
  }));
}
function lerCache() {
  return transacaoCache('readonly', (documentosStore, configStore, metaStore) => new Promise((resolve, reject) => {
    const docs = documentosStore.getAll();
    const configs = configStore.getAll();
    const meta = metaStore.get('controle');
    let concluido = 0; const resultados = {};
    [ ['documentos', docs], ['configuracoes', configs], ['meta', meta] ].forEach(([nome, req]) => {
      req.onsuccess = () => { resultados[nome] = req.result; if (++concluido === 3) resolve(resultados); };
      req.onerror = () => reject(req.error);
    });
  }));
}
function salvarCache(novosDocumentos, novasConfiguracoes) {
  const agora = new Date().toISOString();
  return transacaoCache('readwrite', (documentosStore, configStore, metaStore) => {
    documentosStore.clear(); configStore.clear();
    novosDocumentos.forEach(item => documentosStore.put({ key: chaveDocumento(item.colId, item.id), ...item }));
    novasConfiguracoes.forEach(item => configStore.put({ key: item.key || item.id, ...item }));
    metaStore.put({ key: 'controle', schema: CACHE_VERSION, atualizadoEm: agora, quantidadeDocumentos: novosDocumentos.length, quantidadeConfiguracoes: novasConfiguracoes.length });
  });
}
function aplicarConfiguracoesPadrao(remotas = []) {
  const mapa = new Map(CONFIGURACOES_PADRAO.map(config => [config.key, config]));
  remotas.forEach(config => { const key = config.key || config.id || normalizar(config.nomeExibicao); mapa.set(key, { ...config, key }); });
  return [...mapa.values()].filter(config => config.ativo !== false);
}

function atualizarInfoCache(meta, origem) {
  if (!meta?.atualizadoEm) { $('cache-info').textContent = origem === 'cache' ? 'Rótulos carregados do dispositivo.' : ''; return; }
  $('cache-info').textContent = `${origem === 'cache' ? 'Carregados do dispositivo' : 'Dados atualizados'} em ${formatarData(meta.atualizadoEm)} · ${meta.quantidadeDocumentos || documentos.length} documentos`;
}

async function buscarDoFirestore() {
  setLoading('Buscando instrumentos identificados...', 'Carregando nomes dos rótulos das partituras...');
  const colSnap = await getDocs(collection(db, 'biblioteca_colecoes'));
  const colunas = colSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => COLECOES.includes(c.nome));
  const carregados = [];
  for (const col of colunas) {
    setLoading('Buscando instrumentos identificados...', `Lendo documentos da coleção ${col.nome}...`);
    const docsSnap = await getDocs(collection(db, 'biblioteca_colecoes', col.id, 'documentos'));
    const itens = await Promise.all(docsSnap.docs.map(async d => {
      const data = d.data(); let grupos = [];
      try {
        const rotulo = await getDoc(doc(db, 'biblioteca_rotulos', `${col.id}_${d.id}`));
        if (rotulo.exists()) { const r = rotulo.data(); grupos = Array.isArray(r.grupos) ? r.grupos : []; }
      } catch (error) { console.warn('Não foi possível carregar o rótulo de', data.nome, error); }
      return { id: d.id, colId: col.id, colecao: col.nome, nome: data.nome || 'Sem nome', url: data.url, grupos };
    }));
    carregados.push(...itens);
  }
  setLoading('Organizando instrumentos...', 'Aplicando agrupamentos e preparando a lista...');
  let configs = [];
  try {
    const configSnap = await getDocs(collection(db, 'biblioteca_instrumentos'));
    configs = configSnap.docs.map(d => ({ id: d.id, key: d.id, ...d.data() })).filter(c => c.ativo !== false);
  } catch (error) { console.warn('Configuração de agrupamentos indisponível; usando nomes originais.', error); }
  const ordenados = carregados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const configuracoesEfetivas = aplicarConfiguracoesPadrao(configs);
  await salvarCache(ordenados, configuracoesEfetivas);
  return { documentos: ordenados, configuracoes: configuracoesEfetivas, meta: { atualizadoEm: new Date().toISOString(), quantidadeDocumentos: ordenados.length }, origem: 'servidor' };
}

async function carregarDados(force = false) {
  if (!force) {
    try {
      setLoading('Carregando instrumentos...', 'Lendo os rótulos salvos neste dispositivo...');
      const cache = await lerCache();
      if (cache.meta?.schema === CACHE_VERSION && cache.documentos?.length) {
        return { documentos: cache.documentos, configuracoes: aplicarConfiguracoesPadrao(cache.configuracoes || []), meta: cache.meta, origem: 'cache' };
      }
    } catch (error) { console.warn('Cache indisponível; buscando no servidor.', error); }
  }
  return buscarDoFirestore();
}

function aliasesDaConfiguracao(config) {
  return [config.nomeExibicao, config.chaveCanonica, ...(Array.isArray(config.aliases) ? config.aliases : [])].filter(Boolean).map(normalizar);
}
function agrupamentoParaNome(nome) {
  const chave = normalizar(nome);
  const config = configuracoes.find(c => aliasesDaConfiguracao(c).includes(chave));
  return config ? { key: config.key || config.id || normalizar(config.nomeExibicao), nome: config.nomeExibicao || nome, config } : { key: chave, nome };
}
function grupoValido(grupo) {
  const nome = String(grupo?.nome || '').trim();
  const tipo = String(grupo?.tipo || '').toLowerCase();
  const paginas = Array.isArray(grupo?.paginas) ? grupo.paginas : [];
  return nome && paginas.length && tipo !== 'grade' && normalizar(nome) !== 'grade' && tipo !== 'desconhecido' && !/^página\s+\d+\s*[—-]\s*revisar$/i.test(nome);
}
function instrumentosIdentificados() {
  const encontrados = new Map();
  documentos.forEach(item => item.grupos.filter(grupoValido).forEach(grupo => {
    const agrupado = agrupamentoParaNome(String(grupo.nome).trim());
    if (!encontrados.has(agrupado.key)) encontrados.set(agrupado.key, { ...agrupado, grupos: 0, paginas: 0 });
    const itemInstrumento = encontrados.get(agrupado.key);
    itemInstrumento.grupos += 1; itemInstrumento.paginas += grupo.paginas.length;
  }));
  return [...encontrados.values()].sort((a, b) => (a.config?.ordem ?? 9999) - (b.config?.ordem ?? 9999) || a.nome.localeCompare(b.nome, 'pt-BR'));
}
function resolverPreferido(preferido, disponiveis) {
  const alvo = normalizar(preferido);
  return disponiveis.find(item => item.key === alvo || normalizar(item.nome) === alvo || aliasesDaConfiguracao(item.config || {}).includes(alvo));
}
function queryInstrumento() { return new URLSearchParams(location.search).get('instrumento') || ''; }
async function instrumentoDoPerfil() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    if (usuario.instrumento) return usuario.instrumento;
    if (usuario.docId) {
      const snap = await getDoc(doc(db, 'alunos', usuario.docId));
      if (snap.exists() && snap.data().instrumento) return snap.data().instrumento;
    }
  } catch (error) { console.warn('Não foi possível carregar o instrumento do perfil', error); }
  return '';
}
function preencherInstrumentos(preferido = '') {
  const select = $('instrument-select'); const disponiveis = instrumentosIdentificados();
  select.innerHTML = '<option value="">Selecione um instrumento</option>' + disponiveis.map(i => `<option value="${escapar(i.key)}">${escapar(i.nome)} (${i.grupos} ${i.grupos === 1 ? 'grupo' : 'grupos'})</option>`).join('');
  const encontrado = resolverPreferido(preferido, disponiveis);
  instrumentoAtualKey = encontrado?.key || ''; instrumentoAtualNome = encontrado?.nome || ''; select.value = instrumentoAtualKey; select.disabled = false;
  $('results-count').textContent = `${disponiveis.length} instrumento${disponiveis.length === 1 ? '' : 's'} encontrado${disponiveis.length === 1 ? '' : 's'}`;
}

function gruposDoDocumento(item) {
  const paginas = item.grupos.filter(grupoValido).filter(g => agrupamentoParaNome(g.nome).key === instrumentoAtualKey).flatMap(g => g.paginas);
  return [...new Set(paginas)].sort((a, b) => a - b);
}
function documentosFiltrados() {
  const colecao = $('collection-select').value;
  return documentos.map(item => ({ ...item, paginas: gruposDoDocumento(item) })).filter(item => (colecao === 'all' || item.colecao === colecao) && item.paginas.length > 0);
}
function atualizarContador() { $('selection-count').textContent = selecionados.size ? ` · ${selecionados.size} selecionada${selecionados.size === 1 ? '' : 's'}` : ''; $('download-selected').disabled = selecionados.size === 0 || !carregamentoConcluido; }
function renderizar() {
  const lista = $('scores-list'); const disponiveis = documentosFiltrados();
  selecionados = new Set([...selecionados].filter(key => disponiveis.some(d => chaveDocumento(d.colId, d.id) === key)));
  atualizarContador();
  if (!instrumentoAtualKey) { $('results-count').textContent = `${instrumentosIdentificados().length} instrumentos encontrados`; lista.innerHTML = '<div class="empty"><i class="fas fa-music"></i>Selecione um instrumento para ver as partituras disponíveis.</div>'; return; }
  $('results-count').textContent = `${disponiveis.length} partitura${disponiveis.length === 1 ? '' : 's'} encontrada${disponiveis.length === 1 ? '' : 's'} para ${instrumentoAtualNome}`;
  if (!disponiveis.length) { lista.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i>Nenhuma partitura encontrada para este instrumento.</div>'; return; }
  lista.innerHTML = disponiveis.map(item => `<article class="score-card"><div class="score-top"><input type="checkbox" class="score-check" data-id="${escapar(item.id)}" data-col="${escapar(item.colId)}" ${selecionados.has(chaveDocumento(item.colId, item.id)) ? 'checked' : ''} aria-label="Selecionar ${escapar(item.nome)}"><div><div class="score-name">${escapar(item.nome)}</div><div class="score-meta">${escapar(item.colecao)} · ${item.paginas.length} página${item.paginas.length === 1 ? '' : 's'}</div></div></div><div class="score-actions"><a href="partes.html?col=${encodeURIComponent(item.colId)}&doc=${encodeURIComponent(item.id)}" target="_blank" rel="noopener"><i class="fas fa-eye"></i> Visualizar</a><button type="button" class="download-one" data-id="${escapar(item.id)}" data-col="${escapar(item.colId)}"><i class="fas fa-download"></i> Baixar</button></div></article>`).join('');
  lista.querySelectorAll('.score-check').forEach(input => input.addEventListener('change', e => { const key = chaveDocumento(e.target.dataset.col, e.target.dataset.id); e.target.checked ? selecionados.add(key) : selecionados.delete(key); atualizarContador(); }));
  lista.querySelectorAll('.download-one').forEach(button => button.addEventListener('click', () => baixarIndividual(button.dataset.col, button.dataset.id)));
}
function selecionarTodos() { documentosFiltrados().forEach(item => selecionados.add(chaveDocumento(item.colId, item.id))); renderizar(); }
function limparSelecao() { selecionados.clear(); renderizar(); }

async function carregarBiblioteca(nome) { if (nome === 'jszip') { if (JSZip) return JSZip; await carregarScript(JSZIP_CDN); JSZip = window.JSZip; return JSZip; } if (pdfLib) return pdfLib; await carregarScript(PDFLIB_CDN); pdfLib = window.PDFLib; return pdfLib; }
function carregarScript(src) { return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); }
async function criarPdf(item) { if (!item.url || !item.paginas.length) throw new Error('Partitura sem páginas disponíveis'); const { PDFDocument } = await carregarBiblioteca('pdflib'); const response = await fetch(item.url); if (!response.ok) throw new Error(`Falha ao baixar ${item.nome}`); const original = await PDFDocument.load(await response.arrayBuffer()); const novo = await PDFDocument.create(); const paginas = await novo.copyPages(original, item.paginas.filter(p => p > 0 && p <= original.getPageCount()).map(p => p - 1)); paginas.forEach(page => novo.addPage(page)); return novo.save(); }
function progresso(atual, total, texto) { $('progress').hidden = false; $('progress-fill').style.width = `${Math.round(atual / total * 100)}%`; $('progress-text').textContent = texto; }
function finalizarProgresso() { $('progress').hidden = true; $('progress-fill').style.width = '0'; }
async function registrarDownload(nomeArquivo, tipo = 'partitura_instrumento', quantidade = 1) { try { const usuario = JSON.parse(localStorage.getItem('usuarioAtual') || '{}'); await addDoc(collection(db, 'downloads'), { nomeAluno: usuario.nome || 'Visitante', nomeArquivo, tipo, quantidade, instrumento: instrumentoAtualNome, data: Timestamp.fromDate(new Date()) }); } catch (error) { console.warn('Não foi possível registrar o download', error); } }
async function baixarIndividual(colId, id) { const item = documentosFiltrados().find(d => d.colId === colId && d.id === id); if (!item) return; try { setStatus(`Gerando ${item.nome}...`); const bytes = await criarPdf(item); const nome = `${nomeSeguro(item.nome)} - ${nomeSeguro(instrumentoAtualNome)}.pdf`; baixarBlob(new Blob([bytes], { type: 'application/pdf' }), nome); await registrarDownload(nome); setStatus('Download concluído.'); } catch (error) { console.error(error); setStatus('Não foi possível gerar esta partitura.', true); } }
async function baixarSelecionadas() { const itens = documentosFiltrados().filter(d => selecionados.has(chaveDocumento(d.colId, d.id))); if (!itens.length) return; const button = $('download-selected'); button.disabled = true; try { const zip = await carregarBiblioteca('jszip'); const pacote = new zip(); for (let i = 0; i < itens.length; i++) { const item = itens[i]; progresso(i, itens.length, `Gerando ${i + 1} de ${itens.length}: ${item.nome}`); const bytes = await criarPdf(item); pacote.folder(item.colecao).file(`${nomeSeguro(item.nome)} - ${nomeSeguro(instrumentoAtualNome)}.pdf`, bytes); } progresso(itens.length, itens.length, 'Compactando o pacote...'); const nomePacote = `Partituras - ${nomeSeguro(instrumentoAtualNome)}.zip`; const blob = await pacote.generateAsync({ type: 'blob', compression: 'DEFLATE' }); baixarBlob(blob, nomePacote); await registrarDownload(nomePacote, 'pacote_instrumento', itens.length); setStatus(`${itens.length} partitura${itens.length === 1 ? '' : 's'} baixada${itens.length === 1 ? '' : 's'} com sucesso.`); selecionados.clear(); renderizar(); } catch (error) { console.error(error); setStatus('Não foi possível gerar o pacote. Tente novamente.', true); } finally { button.disabled = false; finalizarProgresso(); atualizarContador(); } }
function baixarBlob(blob, nome) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); }

async function atualizarRotulos() {
  if (!carregamentoConcluido && documentos.length) return;
  setControls(true); $('refresh-labels').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...'; setLoading('Atualizando rótulos...', 'Verificando alterações no Firestore...'); setStatus('');
  try { const antes = documentos.length; const dados = await carregarDados(true); documentos = dados.documentos; configuracoes = dados.configuracoes; preencherInstrumentos(instrumentoAtualNome); renderizar(); atualizarInfoCache(dados.meta, 'servidor'); const depois = documentos.length; setStatus(`Atualização concluída: ${depois - antes > 0 ? depois - antes : 0} novos documentos verificados.`); } catch (error) { console.error(error); setStatus(carregamentoConcluido ? 'Não foi possível atualizar agora. Exibindo os dados carregados anteriormente.' : 'Não foi possível carregar os rótulos. Tente novamente.', true); } finally { $('refresh-labels').innerHTML = carregamentoConcluido ? '<i class="fas fa-rotate"></i> Atualizar rótulos' : '<i class="fas fa-rotate"></i> Tentar novamente'; $('loading-card').hidden = carregamentoConcluido; setControls(false); }
}
async function init() {
  setControls(true); $('scores-list').innerHTML = '';
  $('instrument-select').addEventListener('change', e => { const item = instrumentosIdentificados().find(i => i.key === e.target.value); instrumentoAtualKey = item?.key || ''; instrumentoAtualNome = item?.nome || ''; selecionados.clear(); renderizar(); });
  $('collection-select').addEventListener('change', renderizar); $('select-all').addEventListener('click', selecionarTodos); $('clear-selection').addEventListener('click', limparSelecao); $('download-selected').addEventListener('click', baixarSelecionadas); $('refresh-labels').addEventListener('click', atualizarRotulos);
  try { const dados = await carregarDados(false); documentos = dados.documentos; configuracoes = dados.configuracoes; const perfil = await instrumentoDoPerfil(); preencherInstrumentos(queryInstrumento() || perfil); atualizarInfoCache(dados.meta, dados.origem); carregamentoConcluido = true; setLoading('', '', false); setControls(false); renderizar(); if (dados.origem === 'cache') setStatus('Rótulos carregados do dispositivo. Use “Atualizar rótulos” para verificar alterações.'); } catch (error) { console.error(error); setLoading('Não foi possível carregar os instrumentos.', 'Verifique sua conexão e tente novamente.'); $('loading-card').hidden = false; setStatus('Não foi possível carregar os rótulos. Tente novamente.', true); $('refresh-labels').innerHTML = '<i class="fas fa-rotate"></i> Tentar novamente'; $('refresh-labels').disabled = false; } finally { atualizarContador(); }
}
document.addEventListener('DOMContentLoaded', init);
