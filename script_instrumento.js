import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, addDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
const COLECOES = ['Músicas', 'Hinos da Harpa'];
const INSTRUMENTOS = [
  'Violino I','Violino II','Violino','Viola','Violoncelo','Contrabaixo','Flauta','Escaleta','Oboé',
  'Clarinete em Sib','Clarinete em Dó','Clarinete','Fagote','Saxofone Soprano','Saxofone Alto',
  'Saxofone Tenor','Saxofone Barítono','Saxofone','Trompete','Trompa','Trombone 01','Trombone 02',
  'Trombone Base','Trombone','Tuba','Bombardino','Percussão','Piano','Órgão','Soprano','Contralto','Tenor','Baixo'
];
let pdfLib = null;
let JSZip = null;
let documentos = [];
let selecionados = new Set();
let instrumentoAtual = '';

const $ = id => document.getElementById(id);

function normalizar(texto = '') {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function escapar(texto = '') {
  return String(texto).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function nomeSeguro(nome) {
  return nome.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 150) || 'partitura';
}
function queryInstrumento() {
  const value = new URLSearchParams(location.search).get('instrumento');
  return value ? INSTRUMENTOS.find(i => normalizar(i) === normalizar(value)) || value : '';
}

async function carregarBibliotecas() {
  const colSnap = await getDocs(collection(db, 'biblioteca_colecoes'));
  const colunas = colSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => COLECOES.includes(c.nome));
  const carregados = [];
  for (const col of colunas) {
    const docsSnap = await getDocs(collection(db, 'biblioteca_colecoes', col.id, 'documentos'));
    for (const d of docsSnap.docs) {
      const data = d.data();
      let grupos = [];
      try {
        const rotulo = await getDoc(doc(db, 'biblioteca_rotulos', `${col.id}_${d.id}`));
        if (rotulo.exists()) grupos = Array.isArray(rotulo.data().grupos) ? rotulo.data().grupos : [];
      } catch (error) { console.warn('Não foi possível carregar o rótulo de', data.nome, error); }
      carregados.push({ id: d.id, colId: col.id, colecao: col.nome, nome: data.nome || 'Sem nome', url: data.url, grupos });
    }
  }
  documentos = carregados.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

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

function instrumentosIdentificados() {
  const encontrados = new Map();
  documentos.forEach(item => {
    item.grupos.forEach(grupo => {
      const nome = String(grupo?.nome || '').trim();
      const tipo = String(grupo?.tipo || '').toLowerCase();
      const paginas = Array.isArray(grupo?.paginas) ? grupo.paginas : [];
      const desconhecido = tipo === 'desconhecido' || /^página\s+\d+\s*[—-]\s*revisar$/i.test(nome);
      if (!nome || !paginas.length || tipo === 'grade' || normalizar(nome) === 'grade' || desconhecido) return;
      const chave = normalizar(nome);
      if (!encontrados.has(chave)) encontrados.set(chave, nome);
    });
  });
  return [...encontrados.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function preencherInstrumentos(preferido = '') {
  const select = $('instrument-select');
  const disponiveis = instrumentosIdentificados();
  select.innerHTML = '<option value="">Selecione um instrumento</option>' + disponiveis.map(i => `<option value="${escapar(i)}">${escapar(i)}</option>`).join('');
  const encontrado = disponiveis.find(i => normalizar(i) === normalizar(preferido));
  instrumentoAtual = encontrado || '';
  select.value = instrumentoAtual;
  if (!disponiveis.length) $('status').textContent = 'Nenhum instrumento foi identificado nas partituras disponíveis.';
}

function gruposDoDocumento(item) {
  const alvo = normalizar(instrumentoAtual);
  const paginas = item.grupos.filter(g => g && g.tipo !== 'grade' && normalizar(g.nome) === alvo).flatMap(g => Array.isArray(g.paginas) ? g.paginas : []);
  return [...new Set(paginas)].sort((a, b) => a - b);
}
function documentosFiltrados() {
  const colecao = $('collection-select').value;
  return documentos.map(item => ({ ...item, paginas: gruposDoDocumento(item) })).filter(item => (colecao === 'all' || item.colecao === colecao) && item.paginas.length > 0);
}

function renderizar() {
  const lista = $('scores-list');
  const disponiveis = documentosFiltrados();
  selecionados = new Set([...selecionados].filter(key => disponiveis.some(d => `${d.colId}:${d.id}` === key)));
  $('results-count').textContent = instrumentoAtual ? `${disponiveis.length} partitura${disponiveis.length === 1 ? '' : 's'} encontrada${disponiveis.length === 1 ? '' : 's'}` : 'Escolha um instrumento';
  atualizarContador();
  if (!instrumentoAtual) { lista.innerHTML = '<div class="empty"><i class="fas fa-music"></i>Selecione um instrumento para ver as partituras disponíveis.</div>'; return; }
  if (!disponiveis.length) { lista.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i>Nenhuma partitura encontrada para este instrumento.</div>'; return; }
  lista.innerHTML = disponiveis.map(item => `
    <article class="score-card">
      <div class="score-top">
        <input type="checkbox" class="score-check" data-id="${escapar(item.id)}" data-col="${escapar(item.colId)}" ${selecionados.has(`${item.colId}:${item.id}`) ? 'checked' : ''} aria-label="Selecionar ${escapar(item.nome)}">
        <div><div class="score-name">${escapar(item.nome)}</div><div class="score-meta">${escapar(item.colecao)} · ${item.paginas.length} página${item.paginas.length === 1 ? '' : 's'}</div></div>
      </div>
      <div class="score-actions">
        <a href="partes.html?col=${encodeURIComponent(item.colId)}&doc=${encodeURIComponent(item.id)}" target="_blank" rel="noopener"><i class="fas fa-eye"></i> Visualizar</a>
        <button type="button" class="download-one" data-id="${escapar(item.id)}" data-col="${escapar(item.colId)}"><i class="fas fa-download"></i> Baixar</button>
      </div>
    </article>`).join('');
  lista.querySelectorAll('.score-check').forEach(input => input.addEventListener('change', e => { const key = `${e.target.dataset.col}:${e.target.dataset.id}`; e.target.checked ? selecionados.add(key) : selecionados.delete(key); atualizarContador(); }));
  lista.querySelectorAll('.download-one').forEach(button => button.addEventListener('click', () => baixarIndividual(button.dataset.col, button.dataset.id)));
}
function atualizarContador() { $('selection-count').textContent = selecionados.size ? ` · ${selecionados.size} selecionada${selecionados.size === 1 ? '' : 's'}` : ''; $('download-selected').disabled = selecionados.size === 0; }
function selecionarTodos() { documentosFiltrados().forEach(item => selecionados.add(`${item.colId}:${item.id}`)); renderizar(); }
function limparSelecao() { selecionados.clear(); renderizar(); }

async function carregarBiblioteca(nome) { if (nome === 'jszip') { if (JSZip) return JSZip; await carregarScript(JSZIP_CDN); JSZip = window.JSZip; return JSZip; } if (pdfLib) return pdfLib; await carregarScript(PDFLIB_CDN); pdfLib = window.PDFLib; return pdfLib; }
function carregarScript(src) { return new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = src; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); }
async function criarPdf(item) {
  if (!item.url || !item.paginas.length) throw new Error('Partitura sem páginas disponíveis');
  const { PDFDocument } = await carregarBiblioteca('pdflib');
  const response = await fetch(item.url); if (!response.ok) throw new Error(`Falha ao baixar ${item.nome}`);
  const original = await PDFDocument.load(await response.arrayBuffer());
  const novo = await PDFDocument.create();
  const paginas = await novo.copyPages(original, item.paginas.filter(p => p > 0 && p <= original.getPageCount()).map(p => p - 1));
  paginas.forEach(page => novo.addPage(page));
  return novo.save();
}
function progresso(atual, total, texto) { $('progress').hidden = false; $('progress-fill').style.width = `${Math.round(atual / total * 100)}%`; $('progress-text').textContent = texto; }
function finalizarProgresso() { $('progress').hidden = true; $('progress-fill').style.width = '0'; }
async function registrarDownload(nomeArquivo, tipo = 'partitura_instrumento', quantidade = 1) {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    await addDoc(collection(db, 'downloads'), {
      nomeAluno: usuario.nome || 'Visitante', nomeArquivo, tipo, quantidade,
      instrumento: instrumentoAtual, data: Timestamp.fromDate(new Date())
    });
  } catch (error) { console.warn('Não foi possível registrar o download', error); }
}
async function baixarIndividual(colId, id) {
  const item = documentosFiltrados().find(d => d.colId === colId && d.id === id); if (!item) return;
  try { $('status').textContent = `Gerando ${item.nome}...`; const bytes = await criarPdf(item); const nome = `${nomeSeguro(item.nome)} - ${nomeSeguro(instrumentoAtual)}.pdf`; baixarBlob(new Blob([bytes], { type: 'application/pdf' }), nome); await registrarDownload(nome); $('status').textContent = 'Download concluído.'; } catch (error) { console.error(error); $('status').textContent = 'Não foi possível gerar esta partitura.'; $('status').className = 'status error'; }
}
async function baixarSelecionadas() {
  const itens = documentosFiltrados().filter(d => selecionados.has(`${d.colId}:${d.id}`)); if (!itens.length) return;
  const button = $('download-selected'); button.disabled = true; $('status').className = 'status';
  try { const zip = await carregarBiblioteca('jszip'); const pacote = new zip(); for (let i = 0; i < itens.length; i++) { const item = itens[i]; progresso(i, itens.length, `Gerando ${i + 1} de ${itens.length}: ${item.nome}`); const bytes = await criarPdf(item); pacote.folder(item.colecao).file(`${nomeSeguro(item.nome)} - ${nomeSeguro(instrumentoAtual)}.pdf`, bytes); } progresso(itens.length, itens.length, 'Compactando o pacote...'); const nomePacote = `Partituras - ${nomeSeguro(instrumentoAtual)}.zip`; const blob = await pacote.generateAsync({ type: 'blob', compression: 'DEFLATE' }); baixarBlob(blob, nomePacote); await registrarDownload(nomePacote, 'pacote_instrumento', itens.length); $('status').textContent = `${itens.length} partitura${itens.length === 1 ? '' : 's'} baixada${itens.length === 1 ? '' : 's'} com sucesso.`; selecionados.clear(); renderizar(); } catch (error) { console.error('Erro ao gerar pacote:', error); $('status').className = 'status error'; $('status').textContent = 'Não foi possível gerar o pacote. Tente novamente.'; } finally { button.disabled = false; finalizarProgresso(); atualizarContador(); }
}
function baixarBlob(blob, nome) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); }

async function init() {
  try { $('instrument-select').addEventListener('change', e => { instrumentoAtual = e.target.value; selecionados.clear(); renderizar(); }); $('collection-select').addEventListener('change', renderizar); $('select-all').addEventListener('click', selecionarTodos); $('clear-selection').addEventListener('click', limparSelecao); $('download-selected').addEventListener('click', baixarSelecionadas); await carregarBibliotecas(); const perfil = await instrumentoDoPerfil(); preencherInstrumentos(queryInstrumento() || perfil); renderizar(); } catch (error) { console.error(error); $('results-count').textContent = 'Erro ao carregar'; $('status').className = 'status error'; $('status').textContent = 'Não foi possível carregar as partituras. Verifique sua conexão e tente novamente.'; }
}
document.addEventListener('DOMContentLoaded', init);
