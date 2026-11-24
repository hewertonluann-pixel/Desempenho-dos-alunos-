// script_biblioteca.js
import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";
import {
  analisarPartitura,
  salvarRotulosESincronizar,
  carregarConfiguracoesInstrumentos
} from './processador-partituras.js';

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib = null;

async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { pdfjsLib = window.pdfjsLib; resolve(pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      pdfjsLib = window.pdfjsLib;
      resolve(pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const storage = getStorage();

let userRole = 'student';
let currentCollectionId = null;
let currentDocumentId = null;
let currentReplaceDocumentId = null;
let currentYoutubeDocumentId = null;
let youtubeModalReturnFocus = null;
let collections = [];
let documents = [];
let currentView = localStorage.getItem('bibliotecaView') || 'list';
// modoPartes da coleção aberta (true = abre partes.html, false = só download)
let currentColModoPartes = true;
let activeAudio = null;
let activePlayer = null;
const documentosEmProcessamento = new Set();

const INITIAL_COLLECTIONS = ['Métodos', 'Hinos da Harpa', 'Músicas'];

function normalizarNomeColecao(nome = '') {
  return String(nome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function idDeterministicoColecao(nome) {
  const slug = normalizarNomeColecao(nome)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sem-nome';
  return `colecao-${slug}`;
}

let searchTerm = '';
let sortCriterion = 'name-asc';

document.addEventListener('DOMContentLoaded', async () => {
  checkUserAuth();
  setupEventListeners();
  setupGlobalSearch();
  await ensureInitialCollections();
  await loadCollections();
  renderCollections();
  updateUIBasedOnRole();
  setupSearchSortListeners();
  applyViewToggleUI();
});

function applyViewToggleUI() {
  const btnList = document.getElementById('btn-view-list');
  const btnGrid = document.getElementById('btn-view-grid');
  if (!btnList || !btnGrid) return;
  btnList.classList.toggle('active', currentView === 'list');
  btnGrid.classList.toggle('active', currentView === 'grid');
}

function setView(mode) {
  currentView = mode;
  localStorage.setItem('bibliotecaView', mode);
  applyViewToggleUI();
  renderDocuments();
}

async function gerarMiniaturaPDF(url, wrapEl) {
  try {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({ url, cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/', cMapPacked: true });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const scale = 1.2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    wrapEl.innerHTML = '';
    wrapEl.appendChild(canvas);
  } catch (err) {
    console.warn('PDF.js: erro ao gerar miniatura', err);
    wrapEl.innerHTML = `
      <div class="pdf-thumb-error">
        <i class="fas fa-file-pdf"></i>
        <span>Pré-visualização<br>indisponível</span>
      </div>`;
  }
}

async function registrarDownload(nomeArquivo) {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
    const nomeAluno = usuario.nome || "Visitante";
    await addDoc(collection(db, "downloads"), {
      nomeAluno,
      nomeArquivo,
      data: Timestamp.fromDate(new Date())
    });
  } catch (erro) {
    console.error("Erro ao registrar download:", erro);
  }
}

document.addEventListener('click', (e) => {
  const downloadBtn = e.target.closest('.btn-download');
  if (downloadBtn && downloadBtn.hasAttribute('data-nome-arquivo')) {
    registrarDownload(downloadBtn.getAttribute('data-nome-arquivo'));
  }
});

function checkUserAuth() {
  const usuarioLogado = localStorage.getItem("usuarioAtual");
  const roleSelector = document.getElementById('user-role');
  // O modo aluno é sempre a visualização inicial. Usuários classificados
  // continuam podendo alternar para professor pelo seletor, mas nunca entram
  // automaticamente no modo de edição.
  userRole = 'student';
  if (usuarioLogado) {
    try {
      const user = JSON.parse(usuarioLogado);
      if (user.classificado === true) {
        if (roleSelector) { roleSelector.style.display = 'block'; roleSelector.value = 'student'; }
      } else {
        if (roleSelector) roleSelector.style.display = 'none';
      }
    } catch (e) {
      userRole = 'student';
      if (roleSelector) roleSelector.style.display = 'none';
    }
  } else {
    userRole = 'student';
    if (roleSelector) roleSelector.style.display = 'none';
  }
}

async function ensureInitialCollections() {
  try {
    const snap = await getDocs(collection(db, 'biblioteca_colecoes'));
    const existingNames = new Set(snap.docs.map(d => normalizarNomeColecao(d.data().nome)));
    for (const colName of INITIAL_COLLECTIONS) {
      if (!existingNames.has(normalizarNomeColecao(colName))) {
        // Métodos começa com modoPartes=false; demais com true
        const modoPartes = colName !== 'Métodos';
        await setDoc(doc(db, 'biblioteca_colecoes', idDeterministicoColecao(colName)), { nome: colName, modoPartes, criadoEm: serverTimestamp() });
        existingNames.add(normalizarNomeColecao(colName));
      }
    }
  } catch (error) {
    console.error('Erro ao garantir coleções iniciais:', error);
  }
}

function setupEventListeners() {
  document.getElementById('user-role').addEventListener('change', e => {
    userRole = e.target.value;
    updateUIBasedOnRole();
    // Re-renderiza cards para mostrar/ocultar toggles
    renderCollections();
    if (currentCollectionId) renderDocuments();
  });
  document.getElementById('search-input').addEventListener('input', filterAndSortDocuments);
  document.getElementById('sort-select').addEventListener('change', filterAndSortDocuments);
  document.addEventListener('keydown', event => {
    const modal = document.getElementById('youtube-modal');
    if (!modal || modal.style.display !== 'block') return;
    if (event.key === 'Escape') { closeYoutubeModal(); return; }
    if (event.key !== 'Tab') return;
    const focaveis = [...modal.querySelectorAll('button:not(:disabled):not([hidden]), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')]
      .filter(elemento => elemento.getClientRects().length > 0);
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (event.shiftKey && (document.activeElement === primeiro || !modal.contains(document.activeElement))) {
      event.preventDefault();
      ultimo.focus();
    } else if (!event.shiftKey && (document.activeElement === ultimo || !modal.contains(document.activeElement))) {
      event.preventDefault();
      primeiro.focus();
    }
  });
}

function updateUIBasedOnRole() {
  document.querySelectorAll('.is-teacher').forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');
  document.querySelectorAll('.btn-delete').forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');
  document.querySelectorAll('.btn-edit').forEach(el => el.style.display = userRole === 'teacher' ? 'inline-block' : 'none');
  document.querySelectorAll('.btn-delete-collection').forEach(el => el.style.display = userRole === 'teacher' ? 'flex' : 'none');
  document.querySelectorAll('.modo-partes-toggle').forEach(el => el.style.display = userRole === 'teacher' ? 'flex' : 'none');
  // Badge de status interno (quando dentro de uma coleção)
  const badge = document.getElementById('modo-partes-badge');
  if (badge) badge.style.display = userRole === 'teacher' ? 'inline-flex' : 'none';
}

async function loadCollections() {
  collections = [];
  const snap = await getDocs(collection(db, 'biblioteca_colecoes'));
  const collectionsWithCount = await Promise.all(snap.docs.map(async (docSnap) => {
    const colData = docSnap.data();
    const colId = docSnap.id;
    const docsSnap = await getDocs(collection(db, 'biblioteca_colecoes', colId, 'documentos'));
    return {
      id: colId,
      ...colData,
      modoPartes: colData.modoPartes !== false, // undefined → true (retrocompatível)
      fileCount: docsSnap.size
    };
  }));
  collections = collectionsWithCount;
}

function getCollectionIcon(name) {
  if (name.includes('Métodos')) return '📚';
  if (name.includes('Harpa')) return '📖';
  if (name.includes('Músicas')) return '🎵';
  return '📁';
}

function renderCollections() {
  const grid = document.getElementById('collections-grid');
  grid.innerHTML = '';
  collections.forEach(col => {
    const modoAtivo = col.modoPartes !== false;
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.onclick = (e) => {
      if (e.target.closest('.btn-delete-collection')) return;
      if (e.target.closest('.modo-partes-toggle')) return;
      openCollection(col.id, col.nome, modoAtivo);
    };
    card.innerHTML = `
      <button class="btn-delete-collection" onclick="deleteCollection('${col.id}', '${col.nome}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
      <span class="icon-folder">${getCollectionIcon(col.nome)}</span>
      <h3>${col.nome}</h3>
      <p class="file-count">${col.fileCount || 0} ${col.fileCount === 1 ? 'arquivo' : 'arquivos'}</p>
      <div class="modo-partes-toggle" style="display:none;" title="${modoAtivo ? 'Modo partes ativo — clique para desativar' : 'Modo partes inativo — clique para ativar'}">
        <span class="modo-partes-label">${modoAtivo ? '🎼 Partes' : '📄 PDF direto'}</span>
        <button class="modo-partes-btn ${modoAtivo ? 'on' : 'off'}" onclick="toggleModoPartes('${col.id}', ${modoAtivo})">
          ${modoAtivo ? 'ON' : 'OFF'}
        </button>
      </div>
      <p class="tap-hint">Toque para abrir</p>
    `;
    grid.appendChild(card);
  });
  updateUIBasedOnRole();
}

async function toggleModoPartes(colId, estadoAtual) {
  const novoEstado = !estadoAtual;
  try {
    await updateDoc(doc(db, 'biblioteca_colecoes', colId), { modoPartes: novoEstado });
    const col = collections.find(c => c.id === colId);
    if (col) col.modoPartes = novoEstado;
    renderCollections();
  } catch (err) {
    console.error('Erro ao alternar modo partes:', err);
    alert('❌ Erro ao salvar configuração.');
  }
}

async function deleteCollection(id, name) {
  if (!confirm(`⚠️ ATENÇÃO: Tem certeza que deseja excluir a coleção "${name}"?\n\nIsso removerá permanentemente todos os documentos e áudios contidos nela.`)) return;
  try {
    const docsRef = collection(db, 'biblioteca_colecoes', id, 'documentos');
    const snap = await getDocs(docsRef);
    for (const d of snap.docs) {
      const data = d.data();
      if (data.storagePath) { try { await deleteObject(ref(storage, data.storagePath)); } catch(e) {} }
      if (data.audioStoragePath) { try { await deleteObject(ref(storage, data.audioStoragePath)); } catch(e) {} }
      await deleteDoc(doc(db, 'biblioteca_colecoes', id, 'documentos', d.id));
    }
    await deleteDoc(doc(db, 'biblioteca_colecoes', id));
    alert(`✅ Coleção "${name}" excluída com sucesso!`);
    await loadCollections();
    renderCollections();
  } catch (error) {
    console.error('Erro ao excluir coleção:', error);
    alert('❌ Erro ao excluir a coleção.');
  }
}

async function openCollection(id, name, modoPartes) {
  currentCollectionId = id;
  currentColModoPartes = modoPartes !== false;
  document.getElementById('collections-view').style.display = 'none';
  document.getElementById('collection-view').classList.add('active');
  document.getElementById('collection-title').textContent = name;

  // Badge de status para professor
  const badge = document.getElementById('modo-partes-badge');
  if (badge) {
    badge.textContent = currentColModoPartes ? '🎼 Modo partes ativo' : '📄 Modo PDF direto';
    badge.className = 'modo-partes-badge ' + (currentColModoPartes ? 'ativo' : 'inativo');
    badge.style.display = userRole === 'teacher' ? 'inline-flex' : 'none';
  }

  document.getElementById('search-input').value = '';
  document.getElementById('sort-select').value = 'name-asc';
  await loadDocuments();
  renderDocuments();
}

function backToCollections() {
  currentCollectionId = null;
  currentDocumentId = null;
  currentColModoPartes = true;
  document.getElementById('collections-view').style.display = 'block';
  document.getElementById('collection-view').classList.remove('active');
  document.getElementById('pdf-file').value = '';
  document.getElementById('audio-file').value = '';
  document.getElementById('file-name').textContent = '';
  document.getElementById('audio-file-name').textContent = '';
}

async function loadDocuments() {
  documents = [];
  const docsRef = collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos');
  const snap = await getDocs(docsRef);
  snap.forEach(d => { documents.push({ id: d.id, ...d.data() }); });
}

function filterAndSortDocuments() {
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  if (!searchInput || !sortSelect) return;
  const term = searchInput.value.toLowerCase();
  const sortBy = sortSelect.value;
  let filtered = documents.filter(doc => doc.nome.toLowerCase().includes(term));
  if (sortBy === 'name-asc') filtered.sort((a, b) => a.nome.localeCompare(b.nome));
  else if (sortBy === 'name-desc') filtered.sort((a, b) => b.nome.localeCompare(a.nome));
  else if (sortBy === 'date-desc') filtered.sort((a, b) => (b.criadoEm?.toDate() || 0) - (a.criadoEm?.toDate() || 0));
  else if (sortBy === 'date-asc') filtered.sort((a, b) => (a.criadoEm?.toDate() || 0) - (b.criadoEm?.toDate() || 0));
  renderDocumentsFiltered(filtered);
}

function renderDocuments() { filterAndSortDocuments(); }

function abrirPartes(colId, docId) {
  window.location.href = `partes.html?col=${colId}&doc=${docId}`;
}

function formatarTempo(segundos) {
  if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = Math.floor(segundos % 60).toString().padStart(2, '0');
  return `${minutos}:${segundosRestantes}`;
}

function limparPlayerAtivo() {
  if (!activePlayer) return;
  activePlayer.item.classList.remove('is-playing');
  activePlayer.button.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';
  activePlayer.button.setAttribute('aria-label', `Reproduzir ${activePlayer.nome}`);
  activePlayer.progress.value = '0';
  activePlayer.currentTime.textContent = '0:00';
  activePlayer.progressWrap.hidden = true;
  activePlayer = null;
}

function pararPlayerAtivo() {
  if (activeAudio) activeAudio.pause();
  limparPlayerAtivo();
  activeAudio = null;
}

function atualizarBotaoPlayer(playing) {
  if (!activePlayer) return;
  activePlayer.button.innerHTML = playing
    ? '<i class="fas fa-pause" aria-hidden="true"></i>'
    : '<i class="fas fa-play" aria-hidden="true"></i>';
  activePlayer.button.setAttribute('aria-label', `${playing ? 'Pausar' : 'Retomar'} ${activePlayer.nome}`);
  activePlayer.button.title = playing ? 'Pausar' : 'Retomar';
  activePlayer.progressWrap.hidden = !playing;
}

function conectarPlayer(item, button, progressWrap, progress, currentTime, totalTime, nome, audioUrl) {
  button.addEventListener('click', () => {
    if (activePlayer?.button === button) {
      if (activeAudio?.paused) {
        activeAudio.play().then(() => atualizarBotaoPlayer(true)).catch(() => setStatusPlayer(button, 'Não foi possível reproduzir este áudio.'));
        return;
      }
      activeAudio.pause();
      atualizarBotaoPlayer(false);
      return;
    }

    pararPlayerAtivo();
    const audio = new Audio(audioUrl);
    activeAudio = audio;
    activePlayer = { item, button, progressWrap, progress, currentTime, totalTime, nome };
    item.classList.add('is-playing');
    progressWrap.hidden = false;
    button.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i>';
    button.setAttribute('aria-label', `Pausar ${nome}`);
    audio.addEventListener('loadedmetadata', () => {
      if (activePlayer?.button !== button) return;
      totalTime.textContent = formatarTempo(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
      if (activePlayer?.button !== button || !Number.isFinite(audio.duration)) return;
      progress.value = String((audio.currentTime / audio.duration) * 100);
      currentTime.textContent = formatarTempo(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      if (activePlayer?.button !== button) return;
      pararPlayerAtivo();
    });
    audio.addEventListener('error', () => {
      if (activePlayer?.button !== button) return;
      setStatusPlayer(button, 'Não foi possível carregar este áudio.');
      pararPlayerAtivo();
    }, { once: true });
    audio.play().catch(() => {
      if (activePlayer?.button !== button) return;
      setStatusPlayer(button, 'Não foi possível reproduzir este áudio.');
      pararPlayerAtivo();
    });
  });
  progress.addEventListener('input', () => {
    if (activePlayer?.button !== button || !activeAudio || !Number.isFinite(activeAudio.duration)) return;
    activeAudio.currentTime = (Number(progress.value) / 100) * activeAudio.duration;
  });
}

function setStatusPlayer(button, mensagem) {
  button.title = mensagem;
  setTimeout(() => { if (button) button.title = ''; }, 3500);
}

function conectarPlayers(container) {
  container.querySelectorAll('.compact-play-button').forEach(button => {
    const item = button.closest('.document-item');
    const progressWrap = item.querySelector('.audio-progress');
    conectarPlayer(
      item,
      button,
      progressWrap,
      progressWrap.querySelector('.progress-range'),
      progressWrap.querySelector('.current-time'),
      progressWrap.querySelector('.total-time'),
      button.dataset.nome || 'áudio',
      button.dataset.audioUrl
    );
  });
}

function escapeHtml(valor = '') {
  return String(valor).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

function nomeDocumentoExibicao(nome = '') {
  return String(nome).replace(/\.pdf$/i, '');
}

function atualizarProgressoProcessamento({ titulo = 'Processando partitura', etapa = 'preparando', percentual = 0, detalhe = '' } = {}) {
  const modal = document.getElementById('processing-modal');
  if (!modal) return;
  const nomes = { validando: 'Validando arquivo...', analisando_paginas: 'Analisando páginas...', salvando_rotulos: 'Salvando rótulos...', sincronizando_indice: 'Sincronizando índice por instrumento...', concluido: 'Processamento concluído', revisao: 'Processado — revisão necessária', erro: 'Erro no processamento' };
  document.getElementById('processing-title').textContent = titulo;
  document.getElementById('processing-stage').textContent = nomes[etapa] || etapa;
  document.getElementById('processing-detail').textContent = detalhe;
  document.getElementById('processing-progress').style.width = `${Math.max(0, Math.min(100, percentual))}%`;
  document.getElementById('processing-percent').textContent = `${Math.round(percentual)}%`;
}
function abrirProgressoProcessamento(titulo) {
  const modal = document.getElementById('processing-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.getElementById('processing-close').disabled = true;
  atualizarProgressoProcessamento({ titulo, etapa: 'validando', percentual: 2 });
}
function fecharProgressoProcessamento() {
  const modal = document.getElementById('processing-modal');
  if (modal) modal.style.display = 'none';
}
async function processarDocumentoBiblioteca(documento, { dadosDocumento = {} } = {}) {
  const colId = documento.colId || currentCollectionId;
  const chave = `${colId}:${documento.id}`;
  if (documentosEmProcessamento.has(chave)) return;
  documentosEmProcessamento.add(chave);
  const refDocumento = doc(db, 'biblioteca_colecoes', colId, 'documentos', documento.id);
  const titulo = `Processando ${nomeDocumentoExibicao(documento.nome || 'partitura')}`;
  abrirProgressoProcessamento(titulo);
  try {
    await updateDoc(refDocumento, { processamentoStatus: 'processando', processamentoAtualizadoEm: serverTimestamp() });
    const analise = await analisarPartitura(documento.url, { onProgress: info => atualizarProgressoProcessamento({ titulo, ...info, detalhe: `Página ${info.pagina} de ${info.totalPaginas}` }) });
    atualizarProgressoProcessamento({ titulo, etapa: 'salvando_rotulos', percentual: 78, detalhe: `${analise.grupos.length} grupos identificados` });
    if (Object.keys(dadosDocumento).length) await updateDoc(refDocumento, { ...dadosDocumento, processamentoStatus: 'salvando_rotulos', processamentoAtualizadoEm: serverTimestamp() });
    const colecao = collections.find(item => item.id === colId)?.nome || '';
    const configuracoes = await carregarConfiguracoesInstrumentos();
    const resultado = await salvarRotulosESincronizar({ colId, colecao, documentoId: documento.id, nome: dadosDocumento.nome || documento.nome, url: dadosDocumento.url || documento.url, grupos: analise.grupos, configuracoes, onProgress: info => atualizarProgressoProcessamento({ titulo, ...info, detalhe: info.registros === undefined ? 'Persistindo os rótulos...' : `${info.registros} instrumentos sincronizados` }) });
    const precisaRevisao = resultado.paginasComRevisao.length > 0;
    await updateDoc(refDocumento, { processamentoStatus: precisaRevisao ? 'revisao-necessaria' : 'concluido', processamentoPercentual: 100, paginasComRevisao: resultado.paginasComRevisao, paginasProcessadas: analise.totalPaginas, processamentoAtualizadoEm: serverTimestamp() });
    atualizarProgressoProcessamento({ titulo: precisaRevisao ? 'Processado — revisão necessária' : 'Processamento concluído', etapa: precisaRevisao ? 'revisao' : 'concluido', percentual: 100, detalhe: precisaRevisao ? `${resultado.paginasComRevisao.length} página(s) precisam de revisão em Partes.` : `${analise.totalPaginas} páginas analisadas e índice atualizado.` });
    document.getElementById('processing-close').disabled = false;
    await loadDocuments(); renderDocuments();
  } catch (error) {
    console.error('Erro no processamento automático:', error);
    try { await updateDoc(refDocumento, { processamentoStatus: 'erro', processamentoErro: error.message || 'Falha desconhecida', processamentoAtualizadoEm: serverTimestamp() }); } catch (_) {}
    atualizarProgressoProcessamento({ titulo: 'Erro no processamento', etapa: 'erro', percentual: 100, detalhe: 'A versão anterior foi preservada. Tente novamente ou abra Partes para revisão.' });
    document.getElementById('processing-close').disabled = false;
    throw error;
  } finally {
    documentosEmProcessamento.delete(chave);
    renderDocuments();
  }
}

function validarUrlYoutube(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return null;
  const entrada = /^https?:\/\//i.test(texto) ? texto : `https://${texto.replace(/^\/\//, '')}`;
  let url;
  try { url = new URL(entrada); } catch { throw new Error('Cole um link válido do YouTube.'); }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const hostsPermitidos = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'youtube-nocookie.com'];
  if (!hostsPermitidos.includes(host) || url.username || url.password) throw new Error('O endereço precisa ser de youtube.com ou youtu.be.');
  const caminho = url.pathname;
  const idValido = /^[A-Za-z0-9_-]{6,}$/;
  const segmentos = caminho.split('/').filter(Boolean);
  const idCurto = host === 'youtu.be' && segmentos.length === 1 && idValido.test(segmentos[0]);
  const idVideo = (caminho === '/watch' && idValido.test(url.searchParams.get('v') || ''))
    || (/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{6,})\/?$/.test(caminho))
    || (/^\/clip\/([A-Za-z0-9_-]{6,})\/?$/.test(caminho));
  const idPlaylist = caminho === '/playlist' && idValido.test(url.searchParams.get('list') || '');
  if (!idCurto && !idVideo && !idPlaylist) throw new Error('Use o link direto do vídeo ou da playlist do YouTube.');
  url.protocol = 'https:';
  return url.toString();
}

function obterUrlYoutube(valor) {
  try { return validarUrlYoutube(valor) || ''; } catch { return ''; }
}

function criarLinkYoutubePublico(valor, nome) {
  const url = obterUrlYoutube(valor);
  if (!url) return '';
  const rotulo = `Abrir vídeo de ${nomeDocumentoExibicao(nome || 'música')} no YouTube`;
  return `<a class="youtube-icon-button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(rotulo)}" aria-label="${escapeHtml(rotulo)}"><i class="fa-brands fa-youtube" aria-hidden="true"></i></a>`;
}

function criarBotaoEditarYoutube(docId, nome) {
  const rotulo = `Adicionar ou editar vídeo de ${nomeDocumentoExibicao(nome || 'música')}`;
  return `<button class="youtube-icon-button youtube-admin-button" type="button" data-youtube-doc-id="${escapeHtml(docId)}" title="${escapeHtml(rotulo)}" aria-label="${escapeHtml(rotulo)}"><i class="fa-brands fa-youtube" aria-hidden="true"></i></button>`;
}

function criarBotaoSubstituir(docId, nome) {
  const rotulo = `Substituir PDF de ${nomeDocumentoExibicao(nome || 'música')}`;
  return `<button class="btn-edit btn-replace" type="button" onclick="openReplaceModal('${escapeHtml(docId)}')" title="${escapeHtml(rotulo)}">↻ PDF</button>`;
}
function criarBotaoReprocessar(docId, nome) {
  const emProcessamento = documentosEmProcessamento.has(`${currentCollectionId}:${docId}`);
  const rotulo = `Reprocessar rótulos de ${nomeDocumentoExibicao(nome || 'música')}`;
  return `<button class="btn-edit btn-reprocess" type="button" onclick="reprocessarDocumento('${escapeHtml(docId)}')" title="${escapeHtml(rotulo)}" ${emProcessamento ? 'disabled' : ''}>${emProcessamento ? '⟳ Processando' : '⟳ Reprocessar'}</button>`;
}
async function reprocessarDocumento(docId) {
  if (userRole !== 'teacher') return;
  const documento = documents.find(item => item.id === docId);
  if (!documento || !documento.url) { alert('❌ PDF não encontrado.'); return; }
  if (!confirm(`Reprocessar os rótulos de “${nomeDocumentoExibicao(documento.nome)}”? Os rótulos atuais serão substituídos após a análise.`)) return;
  try {
    await processarDocumentoBiblioteca({ ...documento, colId: currentCollectionId });
    alert('✅ Rótulos reprocessados e índice atualizado.');
  } catch (_) {
    alert('❌ Não foi possível reprocessar esta partitura. Verifique o status exibido no processamento.');
  }
}

function renderCompactDocument(d, { collectionId = currentCollectionId, modoPartes = currentColModoPartes, showAdminActions = true } = {}) {
  const nome = escapeHtml(nomeDocumentoExibicao(d.nome || 'Documento sem nome'));
  const safeNome = escapeHtml(d.nome || 'Documento sem nome');
  const youtubeLinkAction = criarLinkYoutubePublico(d.youtubeUrl, d.nome);
  const audioHTML = d.audioUrl
    ? `<div class="compact-audio"><div class="audio-progress" hidden><span class="current-time">0:00</span><input class="progress-range" type="range" min="0" max="100" value="0" step="0.1" aria-label="Progresso de ${nome}"><span class="total-time">0:00</span></div></div>`
    : '<span class="audio-unavailable">Sem áudio</span>';
  const titleHTML = modoPartes
    ? `<div class="doc-name doc-name-link" onclick="abrirPartes('${escapeHtml(collectionId)}', '${escapeHtml(d.id)}')" title="Partes">${nome}</div>`
    : `<div class="doc-name">${nome}</div>`;
  const partsAction = modoPartes
    ? `<button class="btn-parts" onclick="abrirPartes('${escapeHtml(collectionId)}', '${escapeHtml(d.id)}')">Partes</button>`
    : '';
  const documentAction = modoPartes
    ? (userRole === 'teacher' ? `<a class="btn-download" href="${escapeHtml(d.url || '')}" target="_blank" rel="noopener" data-nome-arquivo="${safeNome}">📥 PDF Completo</a>` : '')
    : `<a class="btn-download" href="${escapeHtml(d.url || '')}" target="_blank" rel="noopener" data-nome-arquivo="${safeNome}">📥 Baixar PDF</a>`;
  const adminActions = showAdminActions && userRole === 'teacher'
    ? `<div class="media-admin-actions"><button class="btn-edit" type="button" onclick="openEditModal('${escapeHtml(d.id)}')">🎵 Áudio</button>${criarBotaoEditarYoutube(d.id, d.nome)}${criarBotaoReprocessar(d.id, d.nome)}${criarBotaoSubstituir(d.id, d.nome)}</div><button class="btn-delete" onclick="deleteDocument('${escapeHtml(d.id)}', '${escapeHtml(d.storagePath || '')}', '${escapeHtml(d.audioStoragePath || '')}')" aria-label="Excluir ${nome}"><i class="fas fa-trash"></i></button>`
    : '';
  const playHTML = d.audioUrl
    ? `<button class="compact-play-button" type="button" data-audio-url="${escapeHtml(d.audioUrl)}" data-nome="${nome}" aria-label="Reproduzir ${nome}" title="Reproduzir"><i class="fas fa-play" aria-hidden="true"></i></button>`
    : '';
  return `<div class="document-main"><div class="document-header-row">${playHTML}<div class="doc-info">${titleHTML}</div>${youtubeLinkAction}${partsAction}</div><div class="doc-buttons">${documentAction}${adminActions}</div>${audioHTML}</div>`;
}

function renderDocumentsFiltered(docsToRender) {
  pararPlayerAtivo();
  const container = document.getElementById('documents-container');
  if (!container) return;
  container.innerHTML = '';
  container.className = currentView === 'grid' ? 'documents-grid' : 'documents-list';

  const docs = Array.isArray(docsToRender) ? docsToRender : [];

  if (docs.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted); font-style:italic;">Nenhum documento encontrado</div>';
    return;
  }

  docs.forEach(d => {
    const item = document.createElement('div');
    item.className = 'document-item';
    const safeNome = d.nome.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const nomeExibicao = escapeHtml(nomeDocumentoExibicao(d.nome || 'Documento sem nome'));
    const youtubeLinkAction = criarLinkYoutubePublico(d.youtubeUrl, d.nome);
    const youtubeEditAction = userRole === 'teacher' ? criarBotaoEditarYoutube(d.id, d.nome) : '';
    const teacherMediaActions = userRole === 'teacher'
      ? `<div class="media-admin-actions"><button class="btn-edit" type="button" onclick="openEditModal('${d.id}')">🎵 Áudio</button>${youtubeEditAction}${criarBotaoReprocessar(d.id, d.nome)}${criarBotaoSubstituir(d.id, d.nome)}</div>`
      : '';

    if (currentView === 'grid') {

      if (currentColModoPartes) {
        // ── Grade · modo partes ──────────────────────────────────────────
        item.innerHTML = `
          <div class="pdf-thumbnail-wrap" id="thumb-${d.id}" style="cursor:pointer;" title="Ver partes">
            <div class="pdf-thumb-loading">
              <i class="fas fa-spinner"></i>
              <span>Carregando...</span>
            </div>
          </div>
          <div class="doc-grid-info">
            <div class="doc-name" title="${nomeExibicao}">${nomeExibicao}</div>
            <div class="doc-buttons">
              <div class="doc-primary-actions">${youtubeLinkAction}<button class="btn-parts-card" type="button"
                onclick="abrirPartes('${currentCollectionId}', '${d.id}')">Partes</button></div>
              ${userRole === 'teacher' ? `<a class="btn-download" href="${d.url}" target="_blank" data-nome-arquivo="${safeNome}">📥 PDF Completo</a>` : ''}
              ${teacherMediaActions}
              <button class="btn-delete" onclick="deleteDocument('${d.id}', '${d.storagePath}', '${d.audioStoragePath || ''}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>`;
        container.appendChild(item);
        const wrapEl = item.querySelector(`#thumb-${d.id}`);
        wrapEl.onclick = () => abrirPartes(currentCollectionId, d.id);
        gerarMiniaturaPDF(d.url, wrapEl);

      } else {
        // ── Grade · PDF direto ────────────────────────────────────────────
        item.innerHTML = `
          <div class="pdf-thumbnail-wrap" id="thumb-${d.id}" style="cursor:pointer;" title="Baixar PDF">
            <div class="pdf-thumb-loading">
              <i class="fas fa-spinner"></i>
              <span>Carregando...</span>
            </div>
          </div>
          <div class="doc-grid-info">
            <div class="doc-name" title="${nomeExibicao}">${nomeExibicao}</div>
            <div class="doc-buttons">
              <div class="doc-primary-actions">${youtubeLinkAction}<a class="btn-download pdf-direct-button" href="${d.url}" target="_blank" rel="noopener" data-nome-arquivo="${safeNome}">📥 Baixar PDF</a></div>
              ${teacherMediaActions}
              <button class="btn-delete" onclick="deleteDocument('${d.id}', '${d.storagePath}', '${d.audioStoragePath || ''}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>`;
        container.appendChild(item);
        const wrapEl = item.querySelector(`#thumb-${d.id}`);
        wrapEl.onclick = () => window.open(d.url, '_blank');
        gerarMiniaturaPDF(d.url, wrapEl);
      }

    } else {
      // ── Lista compacta compartilhada com a busca global ────────────────
      item.innerHTML = renderCompactDocument(d);
      container.appendChild(item);
    }

    item.querySelectorAll('[data-youtube-doc-id]').forEach(button => {
      button.addEventListener('click', () => openYoutubeModal(button.dataset.youtubeDocId));
    });
  });

  conectarPlayers(container);
  updateUIBasedOnRole();
}

function updateFileName() {
  const file = document.getElementById('pdf-file').files[0];
  document.getElementById('file-name').textContent = file ? `✅ ${file.name}` : '';
}

function updateAudioFileName() {
  const file = document.getElementById('audio-file').files[0];
  document.getElementById('audio-file-name').textContent = file ? `✅ ${file.name}` : '';
}

async function uploadDocument() {
  const pdfFile = document.getElementById('pdf-file').files[0];
  const audioFile = document.getElementById('audio-file').files[0];
  if (!pdfFile || pdfFile.type !== 'application/pdf') { alert('❌ Selecione um PDF válido'); return; }
  if (!currentCollectionId) { alert('❌ Nenhuma coleção selecionada'); return; }
  try {
    const uploadBtn = document.querySelector('.upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Enviando...';
    const pdfPath = `biblioteca/${currentCollectionId}/${Date.now()}_${pdfFile.name}`;
    const pdfRef = ref(storage, pdfPath);
    await uploadBytes(pdfRef, pdfFile);
    const pdfUrl = await getDownloadURL(pdfRef);
    let audioUrl = null, audioStoragePath = null;
    if (audioFile) {
      const audioPath = `biblioteca/${currentCollectionId}/${Date.now()}_audio_${audioFile.name}`;
      const audioRef = ref(storage, audioPath);
      await uploadBytes(audioRef, audioFile);
      audioUrl = await getDownloadURL(audioRef);
      audioStoragePath = audioPath;
    }
    const documentoRef = await addDoc(collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos'), {
      nome: pdfFile.name,
      tamanho: pdfFile.size,
      url: pdfUrl,
      storagePath: pdfPath,
      youtubeUrl: null,
      audioUrl: audioUrl || null,
      audioStoragePath: audioStoragePath || null,
      criadoEm: serverTimestamp(),
      processamentoStatus: 'pendente'
    });
    await processarDocumentoBiblioteca({ id: documentoRef.id, colId: currentCollectionId, nome: pdfFile.name, url: pdfUrl });
    alert('✅ Documento enviado e processado com sucesso!');
    document.getElementById('pdf-file').value = '';
    document.getElementById('audio-file').value = '';
    document.getElementById('file-name').textContent = '';
    document.getElementById('audio-file-name').textContent = '';
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Enviar';
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    alert('❌ Erro ao fazer upload do documento');
    const uploadBtn = document.querySelector('.upload-btn');
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Enviar';
  }
}

async function deleteDocument(docId, pdfPath, audioPath) {
  if (!confirm('Deseja excluir este documento?')) return;
  try {
    await deleteObject(ref(storage, pdfPath));
    if (audioPath) { try { await deleteObject(ref(storage, audioPath)); } catch(e) {} }
    await deleteDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', docId));
    alert('✅ Documento excluído com sucesso!');
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    alert('❌ Erro ao excluir o documento');
  }
}

function openReplaceModal(docId) {
  const documento = documents.find(d => d.id === docId);
  if (!documento) { alert('❌ Documento não encontrado.'); return; }
  currentReplaceDocumentId = docId;
  document.getElementById('replace-document-name').textContent = documento.nome || 'Partitura';
  document.getElementById('replace-pdf-file').value = '';
  document.getElementById('replace-audio-file').value = '';
  document.getElementById('replace-file-name').textContent = '';
  document.getElementById('replace-audio-file-name').textContent = documento.audioUrl
    ? 'Áudio atual será mantido se nenhum novo arquivo for selecionado.'
    : 'Este documento ainda não possui áudio.';
  document.getElementById('replace-status').textContent = '';
  document.getElementById('replace-modal').style.display = 'block';
}

function closeReplaceModal() {
  document.getElementById('replace-modal').style.display = 'none';
  currentReplaceDocumentId = null;
}

function updateReplaceFileName() {
  const file = document.getElementById('replace-pdf-file').files[0];
  document.getElementById('replace-file-name').textContent = file ? `✅ ${file.name}` : '';
}

function updateReplaceAudioFileName() {
  const file = document.getElementById('replace-audio-file').files[0];
  document.getElementById('replace-audio-file-name').textContent = file
    ? `✅ Novo áudio: ${file.name}`
    : 'Áudio atual será mantido se nenhum novo arquivo for selecionado.';
}

async function limparDerivadosDaPartitura(colId, docId) {
  const indiceSnap = await getDocs(collection(db, 'biblioteca_partituras_instrumentos'));
  const lote = writeBatch(db);
  lote.delete(doc(db, 'biblioteca_rotulos', `${colId}_${docId}`));
  indiceSnap.docs
    .filter(item => item.data().colecaoId === colId && item.data().documentoId === docId)
    .forEach(item => lote.delete(item.ref));
  await lote.commit();
}

async function replaceDocument() {
  const pdfFile = document.getElementById('replace-pdf-file').files[0];
  const audioFile = document.getElementById('replace-audio-file').files[0];
  const status = document.getElementById('replace-status');
  const button = document.getElementById('replace-submit');
  if (!pdfFile || pdfFile.type !== 'application/pdf') {
    status.textContent = 'Selecione um PDF válido.';
    return;
  }
  const documento = documents.find(d => d.id === currentReplaceDocumentId);
  if (!documento || !currentCollectionId) { status.textContent = 'Documento ou coleção não encontrado.'; return; }

  let novoPdfPath = null;
  let novoAudioPath = null;
  let documentoAtualizado = false;
  button.disabled = true;
  status.textContent = 'Enviando a nova partitura...';
  try {
    novoPdfPath = `biblioteca/${currentCollectionId}/${Date.now()}_substituicao_${pdfFile.name}`;
    const novoPdfRef = ref(storage, novoPdfPath);
    await uploadBytes(novoPdfRef, pdfFile);
    const novoPdfUrl = await getDownloadURL(novoPdfRef);

    const atualizacao = {
      nome: pdfFile.name,
      tamanho: pdfFile.size,
      url: novoPdfUrl,
      storagePath: novoPdfPath,
      atualizadoEm: serverTimestamp()
    };
    if (audioFile) {
      novoAudioPath = `biblioteca/${currentCollectionId}/${Date.now()}_substituicao_audio_${audioFile.name}`;
      const novoAudioRef = ref(storage, novoAudioPath);
      await uploadBytes(novoAudioRef, audioFile);
      atualizacao.audioUrl = await getDownloadURL(novoAudioRef);
      atualizacao.audioStoragePath = novoAudioPath;
    }

    status.textContent = 'Novo PDF enviado. Analisando páginas e atualizando rótulos...';
    await processarDocumentoBiblioteca(
      { id: documento.id, colId: currentCollectionId, nome: pdfFile.name, url: novoPdfUrl },
      { dadosDocumento: atualizacao }
    );
    documentoAtualizado = true;

    try { await deleteObject(ref(storage, documento.storagePath)); } catch (e) { console.warn('PDF antigo não encontrado:', e); }
    if (audioFile && documento.audioStoragePath) {
      try { await deleteObject(ref(storage, documento.audioStoragePath)); } catch (e) { console.warn('Áudio antigo não encontrado:', e); }
    }

    status.textContent = 'Partitura substituída, rótulos salvos e índice atualizado.';
    await loadDocuments();
    renderDocuments();
    setTimeout(closeReplaceModal, 1800);
  } catch (error) {
    console.error('Erro ao substituir partitura:', error);
    if (!documentoAtualizado) {
      if (novoPdfPath) { try { await deleteObject(ref(storage, novoPdfPath)); } catch (_) {} }
      if (novoAudioPath) { try { await deleteObject(ref(storage, novoAudioPath)); } catch (_) {} }
      status.textContent = 'Não foi possível substituir a partitura. A versão anterior foi mantida.';
    } else {
      status.textContent = 'A partitura foi atualizada, mas a limpeza de referências antigas precisa ser verificada.';
    }
  } finally {
    button.disabled = false;
  }
}

function openEditModal(docId) {
  currentDocumentId = docId;
  document.getElementById('edit-modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.getElementById('edit-audio-file').value = '';
  currentDocumentId = null;
}

async function saveAudio() {
  const audioFile = document.getElementById('edit-audio-file').files[0];
  if (!audioFile) { alert('❌ Selecione um arquivo de áudio'); return; }
  if (!currentDocumentId) { alert('❌ Nenhum documento selecionado'); return; }
  try {
    const docData = documents.find(d => d.id === currentDocumentId);
    if (!docData) { alert('❌ Documento não encontrado'); return; }
    if (docData.audioStoragePath) { try { await deleteObject(ref(storage, docData.audioStoragePath)); } catch(e) {} }
    const audioPath = `biblioteca/${currentCollectionId}/${Date.now()}_audio_${audioFile.name}`;
    const audioRef = ref(storage, audioPath);
    await uploadBytes(audioRef, audioFile);
    const audioUrl = await getDownloadURL(audioRef);
    await updateDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentDocumentId), { audioUrl, audioStoragePath: audioPath });
    alert('✅ Áudio atualizado com sucesso!');
    closeModal();
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('Erro ao salvar áudio:', error);
    alert('❌ Erro ao salvar o áudio');
  }
}

async function removeAudio() {
  if (!confirm('Deseja remover o áudio deste documento?')) return;
  if (!currentDocumentId) { alert('❌ Nenhum documento selecionado'); return; }
  try {
    const docData = documents.find(d => d.id === currentDocumentId);
    if (!docData) { alert('❌ Documento não encontrado'); return; }
    if (docData.audioStoragePath) { try { await deleteObject(ref(storage, docData.audioStoragePath)); } catch(e) {} }
    await updateDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentDocumentId), { audioUrl: null, audioStoragePath: null });
    alert('✅ Áudio removido com sucesso!');
    closeModal();
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('Erro ao remover áudio:', error);
    alert('❌ Erro ao remover o áudio');
  }
}

function openYoutubeModal(docId) {
  if (userRole !== 'teacher') return;
  const documentData = documents.find(d => d.id === docId);
  if (!documentData || !currentCollectionId) { alert('❌ Documento não encontrado.'); return; }
  currentYoutubeDocumentId = docId;
  youtubeModalReturnFocus = document.activeElement;
  document.getElementById('youtube-modal-document').textContent = nomeDocumentoExibicao(documentData.nome || 'Música');
  document.getElementById('youtube-link-input').value = documentData.youtubeUrl || '';
  document.getElementById('youtube-modal-status').textContent = '';
  document.getElementById('youtube-modal-status').classList.remove('error');
  document.getElementById('youtube-remove-button').hidden = !documentData.youtubeUrl;
  document.getElementById('youtube-modal').style.display = 'block';
  document.getElementById('youtube-link-input').focus();
}

function closeYoutubeModal() {
  const returnFocus = youtubeModalReturnFocus;
  const modal = document.getElementById('youtube-modal');
  if (modal) modal.style.display = 'none';
  const input = document.getElementById('youtube-link-input');
  if (input) input.value = '';
  currentYoutubeDocumentId = null;
  youtubeModalReturnFocus = null;
  if (returnFocus?.isConnected) returnFocus.focus();
}

async function saveYoutubeLink() {
  if (userRole !== 'teacher' || !currentYoutubeDocumentId || !currentCollectionId) return;
  const input = document.getElementById('youtube-link-input');
  const status = document.getElementById('youtube-modal-status');
  let youtubeUrl;
  try { youtubeUrl = validarUrlYoutube(input.value); }
  catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
    input.focus();
    return;
  }
  const button = document.getElementById('youtube-save-button');
  const savedDocId = currentYoutubeDocumentId;
  button.disabled = true;
  try {
    await updateDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentYoutubeDocumentId), {
      youtubeUrl: youtubeUrl || null
    });
    closeYoutubeModal();
    await loadDocuments();
    renderDocuments();
    [...document.querySelectorAll('[data-youtube-doc-id]')].find(elemento => elemento.dataset.youtubeDocId === savedDocId)?.focus();
  } catch (error) {
    console.error('Erro ao salvar o link do YouTube:', error);
    status.textContent = 'Não foi possível salvar o link. Tente novamente.';
    status.classList.add('error');
  } finally {
    button.disabled = false;
  }
}

async function removeYoutubeLink() {
  if (userRole !== 'teacher' || !currentYoutubeDocumentId || !currentCollectionId) return;
  if (!confirm('Remover o link de vídeo desta música?')) return;
  const button = document.getElementById('youtube-remove-button');
  const removedDocId = currentYoutubeDocumentId;
  button.disabled = true;
  try {
    await updateDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentYoutubeDocumentId), { youtubeUrl: null });
    closeYoutubeModal();
    await loadDocuments();
    renderDocuments();
    [...document.querySelectorAll('[data-youtube-doc-id]')].find(elemento => elemento.dataset.youtubeDocId === removedDocId)?.focus();
  } catch (error) {
    console.error('Erro ao remover o link do YouTube:', error);
    const status = document.getElementById('youtube-modal-status');
    status.textContent = 'Não foi possível remover o link. Tente novamente.';
    status.classList.add('error');
  } finally {
    button.disabled = false;
  }
}

async function createNewCollection() {
  const input = document.getElementById('new-collection-name');
  const nome = input.value.trim();
  if (!nome) { alert('❌ Digite um nome para a coleção'); return; }
  try {
    const snap = await getDocs(collection(db, 'biblioteca_colecoes'));
    const nomeNormalizado = normalizarNomeColecao(nome);
    const duplicada = snap.docs.some((docSnap) => normalizarNomeColecao(docSnap.data().nome) === nomeNormalizado);
    if (duplicada) {
      alert('⚠️ Já existe uma coleção com esse nome.');
      return;
    }
    await setDoc(doc(db, 'biblioteca_colecoes', idDeterministicoColecao(nome)), {
      nome,
      modoPartes: true, // novas coleções começam com modo partes ativo
      criadoEm: serverTimestamp()
    });
    alert('✅ Coleção criada com sucesso!');
    input.value = '';
    await loadCollections();
    renderCollections();
  } catch (error) {
    console.error('Erro ao criar coleção:', error);
    alert('❌ Erro ao criar a coleção');
  }
}

function setupSearchSortListeners() {
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');
  searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; filterAndSortDocuments(); });
  sortSelect.addEventListener('change', (e) => { sortCriterion = e.target.value; filterAndSortDocuments(); });
}

function setupGlobalSearch() {
  const globalInput = document.getElementById('global-search-input');
  const clearBtn = document.getElementById('clear-global-search');
  if (!globalInput) return;
  globalInput.addEventListener('input', async (e) => {
    const term = e.target.value.trim().toLowerCase();
    if (term.length > 0) { clearBtn.style.display = 'block'; await performGlobalSearch(term); }
    else { clearGlobalSearch(); }
  });
  clearBtn.addEventListener('click', clearGlobalSearch);
}

async function performGlobalSearch(term) {
  const resultsContainer = document.getElementById('global-results-container');
  const resultsView = document.getElementById('global-search-results');
  resultsView.style.display = 'block';
  resultsContainer.innerHTML = '<div style="text-align:center; padding:20px;">🔍 Pesquisando em todas as coleções...</div>';
  try {
    let allResults = [];
    for (const col of collections) {
      const docsRef = collection(db, 'biblioteca_colecoes', col.id, 'documentos');
      const snap = await getDocs(docsRef);
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.nome.toLowerCase().includes(term)) {
          allResults.push({
            id: docSnap.id,
            collectionId: col.id,
            collectionName: col.nome,
            modoPartes: col.modoPartes !== false,
            ...data
          });
        }
      });
    }
    renderGlobalResults(allResults);
  } catch (error) {
    console.error('Erro na busca global:', error);
    resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--vermelho);">Erro ao realizar a busca.</div>';
  }
}

function renderGlobalResults(results) {
  pararPlayerAtivo();
  const container = document.getElementById('global-results-container');
  container.innerHTML = '';
  if (results.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted); font-style:italic;">Nenhum documento encontrado com este nome.</div>';
    return;
  }
  results.forEach(d => {
    const item = document.createElement('div');
    item.className = 'document-item';
    item.innerHTML = renderCompactDocument(d, {
      collectionId: d.collectionId,
      modoPartes: d.modoPartes,
      showAdminActions: false
    });
    container.appendChild(item);
  });
  conectarPlayers(container);
}

function clearGlobalSearch() {
  const globalInput = document.getElementById('global-search-input');
  const clearBtn = document.getElementById('clear-global-search');
  const resultsView = document.getElementById('global-search-results');
  if (globalInput) globalInput.value = '';
  if (clearBtn) clearBtn.style.display = 'none';
  if (resultsView) resultsView.style.display = 'none';
}

// Expor globalmente
window.updateFileName = updateFileName;
window.updateAudioFileName = updateAudioFileName;
window.uploadDocument = uploadDocument;
window.deleteDocument = deleteDocument;
window.backToCollections = backToCollections;
window.createNewCollection = createNewCollection;
window.deleteCollection = deleteCollection;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.saveAudio = saveAudio;
window.removeAudio = removeAudio;
window.openReplaceModal = openReplaceModal;
window.closeReplaceModal = closeReplaceModal;
window.updateReplaceFileName = updateReplaceFileName;
window.updateReplaceAudioFileName = updateReplaceAudioFileName;
window.replaceDocument = replaceDocument;
window.reprocessarDocumento = reprocessarDocumento;
window.fecharProgressoProcessamento = fecharProgressoProcessamento;
window.openYoutubeModal = openYoutubeModal;
window.closeYoutubeModal = closeYoutubeModal;
window.saveYoutubeLink = saveYoutubeLink;
window.removeYoutubeLink = removeYoutubeLink;
window.filterAndSortDocuments = filterAndSortDocuments;
window.clearGlobalSearch = clearGlobalSearch;
window.setView = setView;
window.abrirPartes = abrirPartes;
window.toggleModoPartes = toggleModoPartes;
