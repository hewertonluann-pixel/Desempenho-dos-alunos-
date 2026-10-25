import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, setDoc, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const COLECOES = ['Músicas', 'Hinos da Harpa'];
const CACHE_DB = 'filhos-asafe-instrumentos-cache';
const CACHE_VERSION = 1;
const CACHE_STORES = { documentos: 'documentos', configuracoes: 'configuracoes', meta: 'meta' };
const ALGORITMO_RECONHECIMENTO_VERSAO = 4;
const CONFIGURACOES_PADRAO = [
  { key: 'clarinete', nomeExibicao: 'Clarinete', aliases: ['Clarinete', 'Clarinete 1', 'Clarinete I', 'Clarinete em Sib', 'Clarinete Sib', 'Clarinete Si Bemol', 'Clarinet in Bb', 'Clarinet in B Flat'], ativo: true, ordem: 20 },
  { key: 'trombone', nomeExibicao: 'Trombone', aliases: ['Trombone', 'Trombone 1', 'Trombone I', 'Trombone 01'], ativo: true, ordem: 40 },
  { key: 'trompete', nomeExibicao: 'Trompete', aliases: ['Trompete', 'Trumpet', 'Cornet'], ativo: true, ordem: 45 },
  { key: 'violino', nomeExibicao: 'Violino', aliases: ['Violino', 'Violino 1', 'Violino I'], ativo: true, ordem: 80 }
];
let pdfLib = null;
let pdfJs = null;
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
  remotas.forEach(config => { const key = config.key || config.id || normalizar(config.nomeExibicao); const padrao = mapa.get(key); mapa.set(key, { ...padrao, ...config, key, aliases: [...new Set([...(padrao?.aliases || []), ...(config.aliases || [])])] }); });
  return [...mapa.values()];
}

function atualizarInfoCache(meta, origem) {
  if (!meta?.atualizadoEm) { $('cache-info').textContent = origem === 'cache' ? 'Rótulos carregados do dispositivo.' : ''; return; }
  $('cache-info').textContent = `${origem === 'cache' ? 'Carregados do dispositivo' : 'Dados atualizados'} em ${formatarData(meta.atualizadoEm)} · ${meta.quantidadeDocumentos || documentos.length} documentos`;
}

const CATALOGO_REPROCESSAMENTO = [
  ['Violino I', ['violino i', 'violino 1', 'violin i', 'violin 1']], ['Violino II', ['violino ii', 'violino 2', 'violin ii', 'violin 2']], ['Violino', ['violino', 'violin']], ['Viola', ['viola']], ['Violoncelo', ['violoncelo', 'violoncello', 'cello']], ['Contrabaixo', ['contrabaixo', 'contrabasso', 'contrabass', 'double bass']], ['Flauta', ['flauta transversal', 'flauta', 'flute']], ['Escaleta', ['escaleta', 'melodica', 'melódica', 'melodion']], ['Oboé', ['oboé', 'oboe']], ['Clarinete em Sib', ['clarinet in bb', 'clarinet in b flat', 'clarinete em sib', 'clarinete sib', 'clarinete si bemol']], ['Clarinete em Dó', ['clarinet in c', 'clarinete em do', 'clarinete dó', 'clarinete c']], ['Clarinete', ['clarinete', 'clarinet']], ['Fagote', ['fagote', 'bassoon']], ['Saxofone Soprano', ['saxofone soprano', 'sax soprano', 'soprano sax', 'soprano saxophone', 'saxophone soprano']], ['Saxofone Alto', ['saxofone alto', 'alto saxofone', 'saxophone alto', 'alto saxophone', 'sax alto', 'alto sax']], ['Saxofone Tenor', ['saxofone tenor', 'tenor saxophone', 'saxophone tenor', 'sax tenor', 'tenor sax']], ['Saxofone Barítono', ['saxofone barítono', 'saxofone baritono', 'baritone saxophone', 'saxophone baritone', 'sax baritono']], ['Saxofone', ['saxofone', 'saxophone']], ['Trompete', ['trompete', 'trumpet', 'cornet']], ['Trompa', ['trompa', 'french horn']], ['Trombone 01', ['trombone 01', 'trombone 1']], ['Trombone 02', ['trombone 02', 'trombone 2']], ['Trombone Base', ['trombone base', 'bass trombone', 'trombone baixo']], ['Trombone', ['trombone']], ['Tuba', ['tuba']], ['Souzafone', ['souzafone', 'sousafone', 'sousaphone', 'souzafone sib', 'sousafone sib', 'sousaphone sib', 'souzafone in sib', 'sousafone in sib', 'sousaphone in sib', 'souzafone em sib', 'sousafone em sib', 'sousaphone em sib']], ['Bombardino', ['bombardino', 'euphonium']], ['Percussão', ['percussão', 'percussao', 'bateria', 'tímpano', 'timpani']], ['Piano', ['piano', 'teclado', 'keyboard']], ['Órgão', ['órgão', 'orgao', 'organ']]
].map(([nome, aliases]) => ({ nome, aliases }));
const TERMOS_GRADE_REPROCESSAMENTO = ['grade', 'partitura geral', 'full score', 'orchestral score', 'conductor score'];

function migrarPaginasAntigas(paginas) {
  const mapa = new Map();
  Object.entries(paginas || {}).forEach(([numero, nome]) => { const chave = String(nome || '').trim() || `Página ${numero} — revisar`; if (!mapa.has(chave)) mapa.set(chave, []); mapa.get(chave).push(Number(numero)); });
  return [...mapa.entries()].map(([nome, paginasDoGrupo]) => ({ nome, tipo: 'instrumento', paginas: paginasDoGrupo.sort((a, b) => a - b), instrumentosDetectados: [nome], confianca: 0.5, origem: 'migrado', fonte: 'formato-antigo' }));
}
function localizarInstrumentoReprocessamento(texto) {
  const normalizado = ` ${normalizar(texto)} `;
  const encontrados = [];
  CATALOGO_REPROCESSAMENTO.forEach(item => item.aliases.slice().sort((a, b) => normalizar(b).length - normalizar(a).length).some(alias => {
    const chave = normalizar(alias); if (!normalizado.includes(` ${chave} `)) return false; encontrados.push({ nome: item.nome, alias: chave }); return true;
  }));
  return encontrados.filter((item, _, lista) => !lista.some(outro => outro !== item && outro.alias.length > item.alias.length && ` ${outro.alias} `.includes(` ${item.alias} `)));
}
function contemGradeReprocessamento(texto) { const normalizado = ` ${normalizar(texto)} `; return TERMOS_GRADE_REPROCESSAMENTO.some(termo => normalizado.includes(` ${normalizar(termo)} `)); }
async function carregarPdfJs() {
  if (pdfJs) return pdfJs;
  await carregarScript(PDFJS_CDN);
  pdfJs = window.pdfjsLib; pdfJs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return pdfJs;
}
async function analisarPdfParaGrupos(item) {
  if (!item.url) throw new Error('PDF sem URL');
  const resposta = await fetch(item.url); if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  const biblioteca = await carregarPdfJs();
  const pdf = await biblioteca.getDocument({ data: await resposta.arrayBuffer() }).promise;
  const grupos = []; let grupoAtual = null;
  for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
    const page = await pdf.getPage(pagina); const content = await page.getTextContent();
    const itens = (content.items || []).filter(i => String(i.str || '').trim()).map(i => ({ texto: i.str, x: Number(i.transform?.[4] || 0), y: Number(i.transform?.[5] || 0) })).sort((a, b) => b.y - a.y || a.x - b.x);
    const textoPagina = itens.map(i => i.texto).join(' '); const yMax = itens.length ? Math.max(...itens.map(i => i.y)) : 0; const textoCabecalho = itens.filter(i => i.y >= yMax - 180).map(i => i.texto).join(' ');
    const cabecalho = localizarInstrumentoReprocessamento(textoCabecalho); const paginaInteira = localizarInstrumentoReprocessamento(textoPagina); const deteccoes = cabecalho.length ? cabecalho : paginaInteira; const nome = contemGradeReprocessamento(textoCabecalho) || cabecalho.length >= 2 || paginaInteira.length >= 2 ? 'GRADE' : deteccoes[0]?.nome;
    const tipo = nome === 'GRADE' ? 'grade' : nome ? 'instrumento' : 'desconhecido';
    const fonteCabecalho = Boolean(cabecalho.length || contemGradeReprocessamento(textoCabecalho));
    if (fonteCabecalho && grupoAtual && grupoAtual.nome !== nome) { grupoAtual = { nome, tipo, paginas: [pagina], instrumentosDetectados: deteccoes.map(d => d.nome), confianca: tipo === 'grade' ? 0.9 : 0.85, origem: 'reprocessado', fonte: 'cabecalho' }; grupos.push(grupoAtual); }
    else if (grupoAtual) grupoAtual.paginas.push(pagina);
    else { grupoAtual = { nome: nome || `Página ${pagina} — revisar`, tipo, paginas: [pagina], instrumentosDetectados: deteccoes.map(d => d.nome), confianca: nome ? 0.7 : 0, origem: 'reprocessado', fonte: fonteCabecalho ? 'cabecalho' : 'pagina' }; grupos.push(grupoAtual); }
  }
  return grupos;
}
async function reprocessarPendentes(itens) {
  const pendentes = itens.filter(item => !item.grupos.length || item.formatoAntigo || Number(item.algoritmoVersao || 0) < ALGORITMO_RECONHECIMENTO_VERSAO);
  if (!pendentes.length) return { processados: 0, falhas: [] };
  setLoading('Processando partituras pendentes...', `Analisando 0 de ${pendentes.length} PDFs...`);
  const falhas = []; let processados = 0;
  for (const item of pendentes) {
    try {
      setLoading('Processando partituras pendentes...', `Analisando ${processados + 1} de ${pendentes.length}: ${item.nome}`);
      const grupos = item.formatoAntigo ? item.grupos : await analisarPdfParaGrupos(item);
      item.grupos = grupos; item.formatoAntigo = false; item.algoritmoVersao = ALGORITMO_RECONHECIMENTO_VERSAO;
      await setDoc(doc(db, 'biblioteca_rotulos', `${item.colId}_${item.id}`), { grupos, algoritmoVersao: ALGORITMO_RECONHECIMENTO_VERSAO, atualizadoEm: Timestamp.fromDate(new Date()), migradoAutomaticamente: true }, { merge: true });
      processados++;
    } catch (error) { console.error(`Falha ao processar ${item.nome}`, error); falhas.push({ nome: item.nome, erro: error.message }); }
  }
  return { processados, falhas };
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
      const data = d.data(); let grupos = []; let formatoAntigo = false; let algoritmoVersao = 0;
      try {
        const rotulo = await getDoc(doc(db, 'biblioteca_rotulos', `${col.id}_${d.id}`));
        if (rotulo.exists()) { const r = rotulo.data(); algoritmoVersao = Number(r.algoritmoVersao || 0); if (Array.isArray(r.grupos) && r.grupos.length) grupos = r.grupos; else if (r.paginas && typeof r.paginas === 'object') { grupos = migrarPaginasAntigas(r.paginas); formatoAntigo = true; } }
      } catch (error) { console.warn('Não foi possível carregar o rótulo de', data.nome, error); }
      return { id: d.id, colId: col.id, colecao: col.nome, nome: data.nome || 'Sem nome', url: data.url, grupos, formatoAntigo, algoritmoVersao };
    }));
    carregados.push(...itens);
  }
  setLoading('Organizando instrumentos...', 'Aplicando agrupamentos e preparando a lista...');
  let configs = [];
  try {
    const configSnap = await getDocs(collection(db, 'biblioteca_instrumentos'));
    configs = configSnap.docs.map(d => ({ id: d.id, key: d.id, ...d.data() }));
  } catch (error) { console.warn('Configuração de agrupamentos indisponível; usando nomes originais.', error); }
  const resultadoReprocessamento = await reprocessarPendentes(carregados);
  if (resultadoReprocessamento.falhas.length) setStatus(`${resultadoReprocessamento.processados} partituras processadas; ${resultadoReprocessamento.falhas.length} precisam de revisão.`, true);
  const ordenados = carregados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const configuracoesEfetivas = aplicarConfiguracoesPadrao(configs);
  await salvarCache(ordenados, configuracoesEfetivas);
  return { documentos: ordenados, configuracoes: configuracoesEfetivas, meta: { atualizadoEm: new Date().toISOString(), quantidadeDocumentos: ordenados.length }, origem: 'servidor', reprocessamento: resultadoReprocessamento };
}

async function carregarDados(force = false) {
  if (!force) {
    try {
      setLoading('Carregando instrumentos...', 'Lendo os rótulos salvos neste dispositivo...');
      const cache = await lerCache();
      if (cache.meta?.schema === CACHE_VERSION && cache.documentos?.length) {
        const documentosCache = cache.documentos;
        let configuracoesCache = aplicarConfiguracoesPadrao(cache.configuracoes || []);
        try {
          const configSnap = await getDocs(collection(db, 'biblioteca_instrumentos'));
          const remotas = configSnap.docs.map(d => ({ id: d.id, key: d.id, ...d.data() }));
          configuracoesCache = aplicarConfiguracoesPadrao(remotas);
        } catch (error) { console.warn('Não foi possível atualizar a configuração de instrumentos; usando cache.', error); }
        const resultadoReprocessamento = await reprocessarPendentes(documentosCache);
        if (resultadoReprocessamento.processados) await salvarCache(documentosCache, configuracoesCache);
        return { documentos: documentosCache, configuracoes: configuracoesCache, meta: cache.meta, origem: 'cache', reprocessamento: resultadoReprocessamento };
      }
    } catch (error) { console.warn('Cache indisponível; buscando no servidor.', error); }
  }
  return buscarDoFirestore();
}

function normalizarVarianteInstrumento(valor = '') {
  return normalizar(valor)
    .replace(/\b(sousafone|sousaphone)\b/g, 'souzafone')
    .replace(/\b(in|em)\s+(sib|si bemol)\b/g, '$2')
    .replace(/\bsi bemol\b/g, 'sib');
}
function aliasesDaConfiguracao(config) {
  const aliases = [config.nomeExibicao, config.chaveCanonica, ...(Array.isArray(config.aliases) ? config.aliases : [])].filter(Boolean).map(normalizarVarianteInstrumento);
  const ehSouzafone = aliases.some(alias => alias === 'souzafone' || alias.startsWith('souzafone '));
  if (ehSouzafone) aliases.push('souzafone', 'sousafone', 'souzafone sib', 'sousafone sib', 'souzafone in sib', 'sousafone in sib', 'souzafone em sib', 'sousafone em sib');
  return [...new Set(aliases)];
}
function agrupamentoParaNome(nome) {
  const chave = normalizarVarianteInstrumento(nome);
  const config = configuracoes.find(c => aliasesDaConfiguracao(c).includes(chave));
  return config ? { key: config.key || config.id || normalizar(config.nomeExibicao), nome: config.nomeExibicao || nome, config } : { key: chave, nome: chave === 'souzafone' ? 'Souzafone' : nome };
}
function grupoValido(grupo) {
  const nome = String(grupo?.nome || '').trim();
  const tipo = String(grupo?.tipo || '').toLowerCase();
  const paginas = Array.isArray(grupo?.paginas) ? grupo.paginas : [];
  return nome && paginas.length && tipo !== 'grade' && normalizar(nome) !== 'grade' && tipo !== 'desconhecido' && !/^página\s+\d+\s*[—-]\s*revisar$/i.test(nome);
}
function instrumentosIdentificados() {
  const encontrados = new Map();
  documentos.forEach(item => {
    const gruposDoDocumento = item.grupos.filter(grupoValido);
    const instrumentosDoDocumento = new Map();
    gruposDoDocumento.forEach(grupo => {
      const agrupado = agrupamentoParaNome(String(grupo.nome).trim());
      if (agrupado.config?.ativo === false) return;
      if (!instrumentosDoDocumento.has(agrupado.key)) instrumentosDoDocumento.set(agrupado.key, { ...agrupado, grupos: 0, paginas: 0 });
      const instrumentoDoDocumento = instrumentosDoDocumento.get(agrupado.key);
      instrumentoDoDocumento.grupos += 1;
      instrumentoDoDocumento.paginas += grupo.paginas.length;
    });
    instrumentosDoDocumento.forEach(dados => {
      if (!encontrados.has(dados.key)) encontrados.set(dados.key, { ...dados, grupos: 0, paginas: 0, partituras: 0 });
      const instrumento = encontrados.get(dados.key);
      instrumento.partituras += 1;
      instrumento.grupos += dados.grupos;
      instrumento.paginas += dados.paginas;
    });
  });
  return [...encontrados.values()].sort((a, b) => (a.config?.ordem ?? 9999) - (b.config?.ordem ?? 9999) || a.nome.localeCompare(b.nome, 'pt-BR'));
}
function resolverPreferido(preferido, disponiveis) {
  const alvo = normalizarVarianteInstrumento(preferido);
  return disponiveis.find(item => item.key === alvo || normalizarVarianteInstrumento(item.nome) === alvo || aliasesDaConfiguracao(item.config || {}).includes(alvo));
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
  select.innerHTML = '<option value="">Selecione um instrumento</option>' + disponiveis.map(i => `<option value="${escapar(i.key)}">${escapar(i.nome)} (${i.partituras} ${i.partituras === 1 ? 'partitura' : 'partituras'})</option>`).join('');
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
  lista.innerHTML = disponiveis.map(item => { const selecionado = selecionados.has(chaveDocumento(item.colId, item.id)); return `<article class="score-card${selecionado ? ' is-selected' : ''}" tabindex="0" role="checkbox" aria-checked="${selecionado}" aria-label="Selecionar ${escapar(item.nome)}"><div class="score-top"><input type="checkbox" class="score-check" data-id="${escapar(item.id)}" data-col="${escapar(item.colId)}" ${selecionado ? 'checked' : ''} aria-label="Selecionar ${escapar(item.nome)}"><div><div class="score-name">${escapar(item.nome)}</div><div class="score-meta">${escapar(item.colecao)} · ${item.paginas.length} página${item.paginas.length === 1 ? '' : 's'}</div></div></div><div class="score-actions"><button type="button" class="download-one" data-id="${escapar(item.id)}" data-col="${escapar(item.colId)}" aria-label="Baixar ${escapar(item.nome)}" title="Baixar partitura"><i class="fas fa-download" aria-hidden="true"></i></button></div></article>`; }).join('');
  const atualizarSelecao = input => { const card = input.closest('.score-card'); const key = chaveDocumento(input.dataset.col, input.dataset.id); input.checked ? selecionados.add(key) : selecionados.delete(key); card?.classList.toggle('is-selected', input.checked); card?.setAttribute('aria-checked', String(input.checked)); atualizarContador(); };
  const alternarSelecao = card => { const input = card.querySelector('.score-check'); if (!input) return; input.checked = !input.checked; atualizarSelecao(input); };
  lista.querySelectorAll('.score-check').forEach(input => input.addEventListener('change', e => atualizarSelecao(e.target)));
  lista.querySelectorAll('.score-card').forEach(card => { card.addEventListener('click', e => { if (e.target.closest('.download-one') || e.target.closest('.score-check')) return; alternarSelecao(card); }); card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarSelecao(card); } }); });
  lista.querySelectorAll('.download-one').forEach(button => button.addEventListener('click', e => { e.stopPropagation(); baixarIndividual(button.dataset.col, button.dataset.id); }));
}
function selecionarTodos() { documentosFiltrados().forEach(item => selecionados.add(chaveDocumento(item.colId, item.id))); renderizar(); }
function limparSelecao() { selecionados.clear(); renderizar(); }

async function carregarBiblioteca() { if (pdfLib) return pdfLib; await carregarScript(PDFLIB_CDN); pdfLib = window.PDFLib; return pdfLib; }
function carregarScript(src) { return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); }
async function criarPdf(item) { if (!item.url || !item.paginas.length) throw new Error('Partitura sem páginas disponíveis'); const { PDFDocument } = await carregarBiblioteca(); const response = await fetch(item.url); if (!response.ok) throw new Error(`Falha ao baixar ${item.nome}`); const original = await PDFDocument.load(await response.arrayBuffer()); const novo = await PDFDocument.create(); const paginas = await novo.copyPages(original, item.paginas.filter(p => p > 0 && p <= original.getPageCount()).map(p => p - 1)); paginas.forEach(page => novo.addPage(page)); return novo.save(); }
function progresso(atual, total, texto) { $('progress').hidden = false; $('progress-fill').style.width = `${Math.round(atual / total * 100)}%`; $('progress-text').textContent = texto; }
function finalizarProgresso() { $('progress').hidden = true; $('progress-fill').style.width = '0'; }
async function registrarDownload(nomeArquivo, tipo = 'partitura_instrumento', quantidade = 1) { try { const usuario = JSON.parse(localStorage.getItem('usuarioAtual') || '{}'); await addDoc(collection(db, 'downloads'), { nomeAluno: usuario.nome || 'Visitante', nomeArquivo, tipo, quantidade, instrumento: instrumentoAtualNome, data: Timestamp.fromDate(new Date()) }); } catch (error) { console.warn('Não foi possível registrar o download', error); } }
async function baixarIndividual(colId, id) { const item = documentosFiltrados().find(d => d.colId === colId && d.id === id); if (!item) return; try { setStatus(`Gerando ${item.nome}...`); const bytes = await criarPdf(item); const nome = `${nomeSeguro(item.nome)} - ${nomeSeguro(instrumentoAtualNome)}.pdf`; baixarBlob(new Blob([bytes], { type: 'application/pdf' }), nome); await registrarDownload(nome); setStatus('Download concluído.'); } catch (error) { console.error(error); setStatus('Não foi possível gerar esta partitura.', true); } }
async function baixarSelecionadas() { const itens = documentosFiltrados().filter(d => selecionados.has(chaveDocumento(d.colId, d.id))).sort((a, b) => a.colecao.localeCompare(b.colecao, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR')); if (!itens.length) return; const button = $('download-selected'); button.disabled = true; try { const { PDFDocument } = await carregarBiblioteca(); const consolidado = await PDFDocument.create(); consolidado.setTitle(`Partituras - ${instrumentoAtualNome}`); consolidado.setAuthor('Orquestra Filhos de Asafe'); for (let i = 0; i < itens.length; i++) { const item = itens[i]; progresso(i, itens.length, `Unindo ${i + 1} de ${itens.length}: ${item.nome}`); const bytes = await criarPdf(item); const origem = await PDFDocument.load(bytes); const paginas = await consolidado.copyPages(origem, origem.getPageIndices()); paginas.forEach(page => consolidado.addPage(page)); } progresso(itens.length, itens.length, 'Finalizando o PDF consolidado...'); const nomePdf = `Partituras - ${nomeSeguro(instrumentoAtualNome)}.pdf`; const bytesFinais = await consolidado.save(); baixarBlob(new Blob([bytesFinais], { type: 'application/pdf' }), nomePdf); await registrarDownload(nomePdf, 'pdf_consolidado_instrumento', itens.length); setStatus(`${itens.length} partitura${itens.length === 1 ? '' : 's'} unida${itens.length === 1 ? '' : 's'} em um único PDF.`); selecionados.clear(); renderizar(); } catch (error) { console.error(error); setStatus('Não foi possível gerar o PDF consolidado. Tente novamente.', true); } finally { button.disabled = false; finalizarProgresso(); atualizarContador(); } }
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
  try { const dados = await carregarDados(false); documentos = dados.documentos; configuracoes = dados.configuracoes; const perfil = await instrumentoDoPerfil(); preencherInstrumentos(queryInstrumento() || perfil); atualizarInfoCache(dados.meta, dados.origem); carregamentoConcluido = true; setLoading('', '', false); setControls(false); renderizar(); if (dados.reprocessamento?.processados || dados.reprocessamento?.falhas?.length) setStatus(`${dados.reprocessamento.processados} partituras processadas automaticamente${dados.reprocessamento.falhas.length ? `; ${dados.reprocessamento.falhas.length} precisam de revisão.` : '.'}`, Boolean(dados.reprocessamento.falhas.length)); else if (dados.origem === 'cache') setStatus('Rótulos carregados do dispositivo. Use “Atualizar rótulos” para verificar alterações.'); } catch (error) { console.error(error); setLoading('Não foi possível carregar os instrumentos.', 'Verifique sua conexão e tente novamente.'); $('loading-card').hidden = false; setStatus('Não foi possível carregar os rótulos. Tente novamente.', true); $('refresh-labels').innerHTML = '<i class="fas fa-rotate"></i> Tentar novamente'; $('refresh-labels').disabled = false; } finally { atualizarContador(); }
}
document.addEventListener('DOMContentLoaded', init);
