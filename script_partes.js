// script_partes.js
import { db } from './firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// ── CDNs ──────────────────────────────────────────────────────────────────────
const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const PDFLIB_CDN   = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

// ── Lista de instrumentos reconhecidos ────────────────────────────────────────
const INSTRUMENTOS = [
  // Cordas
  'violino i', 'violino 1', 'violino ii', 'violino 2',
  'violino', 'viola', 'violoncelo', 'cello', 'contrabaixo', 'contrabass',
  // Madeiras
  'flauta', 'flute', 'oboé', 'oboe', 'clarinete', 'clarinet',
  'fagote', 'bassoon', 'saxofone soprano', 'saxofone alto',
  'saxofone tenor', 'saxofone barítono', 'saxofone', 'saxophone',
  // Metais
  'trompete', 'trumpet', 'trompa', 'french horn', 'horn',
  'trombone', 'tuba', 'bombardino', 'euphonium',
  // Percussão / Teclas
  'percussão', 'percussao', 'bateria', 'timpani', 'tímpano',
  'piano', 'teclado', 'keyboard', 'órgão', 'orgao',
  // Genérico
  'soprano', 'contralto', 'tenor', 'baixo'
];

// ── Estado ────────────────────────────────────────────────────────────────────
let pdfJsLib  = null;
let pdfLibLib = null;
let pdfDoc    = null;   // PDF.js document
let pdfUrl    = null;
let docId     = null;
let colId     = null;
let userRole  = 'student';
let rotulosFirestore = {}; // { "1": "Violino I", "2": "Trompete", ... }

// ── Inicialização ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  lerParams();
  checkAuth();
  await carregarDocumento();
});

function lerParams() {
  const params = new URLSearchParams(window.location.search);
  colId = params.get('col');
  docId = params.get('doc');

  if (!colId || !docId) {
    mostrarErro('Parâmetros inválidos. Volte à biblioteca.');
  }
}

function checkAuth() {
  try {
    const user = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    userRole = user.classificado === true ? 'teacher' : 'student';
  } catch { userRole = 'student'; }
}

// ── Carregar documento do Firestore ───────────────────────────────────────────
async function carregarDocumento() {
  try {
    const docRef = doc(db, 'biblioteca_colecoes', colId, 'documentos', docId);
    const snap   = await getDoc(docRef);

    if (!snap.exists()) { mostrarErro('Documento não encontrado.'); return; }

    const data = snap.data();
    pdfUrl = data.url;

    // Título
    document.getElementById('doc-titulo').textContent = '🎵 ' + data.nome;
    document.title = data.nome + ' — Biblioteca';

    // Botão voltar com histórico correto
    document.getElementById('btn-voltar').href = 'biblioteca.html';

    // Áudio
    if (data.audioUrl) {
      document.getElementById('audio-source').src = data.audioUrl;
      document.getElementById('audio-player').load();
      document.getElementById('audio-section').style.display = 'flex';
    }

    // Download completo
    const dlBtn = document.getElementById('btn-dl-completo');
    dlBtn.href = data.url;
    dlBtn.setAttribute('data-nome-arquivo', data.nome);
    document.getElementById('download-completo').style.display = 'flex';

    // Carregar rótulos salvos no Firestore (se existirem)
    await carregarRotulos();

    // Renderizar partes
    await renderizarPartes();

  } catch (err) {
    console.error('Erro ao carregar documento:', err);
    mostrarErro('Erro ao carregar o documento.');
  }
}

// ── Rótulos salvos no Firestore ───────────────────────────────────────────────
async function carregarRotulos() {
  try {
    const rotuloRef = doc(db, 'biblioteca_rotulos', `${colId}_${docId}`);
    const snap = await getDoc(rotuloRef);
    if (snap.exists()) rotulosFirestore = snap.data().paginas || {};
  } catch (e) {
    console.warn('Rótulos não encontrados, usando detecção automática.');
  }
}

async function salvarRotulo(numeroPagina, novoNome) {
  rotulosFirestore[String(numeroPagina)] = novoNome;
  const rotuloRef = doc(db, 'biblioteca_rotulos', `${colId}_${docId}`);
  await setDoc(rotuloRef, { paginas: rotulosFirestore }, { merge: true });
}

// ── Carregar PDF.js ───────────────────────────────────────────────────────────
async function loadPdfJs() {
  if (pdfJsLib) return pdfJsLib;
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { pdfJsLib = window.pdfjsLib; resolve(pdfJsLib); return; }
    const s = document.createElement('script');
    s.src = PDFJS_CDN;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      pdfJsLib = window.pdfjsLib;
      resolve(pdfJsLib);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Carregar pdf-lib ──────────────────────────────────────────────────────────
async function loadPdfLib() {
  if (pdfLibLib) return pdfLibLib;
  return new Promise((resolve, reject) => {
    if (window.PDFLib) { pdfLibLib = window.PDFLib; resolve(pdfLibLib); return; }
    const s = document.createElement('script');
    s.src = PDFLIB_CDN;
    s.onload = () => { pdfLibLib = window.PDFLib; resolve(pdfLibLib); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Detectar instrumento pelo texto da página ─────────────────────────────────
async function detectarInstrumento(page, numeroPagina) {
  // 1. Verificar se há rótulo salvo pelo professor
  if (rotulosFirestore[String(numeroPagina)]) {
    return rotulosFirestore[String(numeroPagina)];
  }

  // 2. Tentar extrair texto da página
  try {
    const textContent = await page.getTextContent();
    // Pega os primeiros 300 chars para focar no cabeçalho
    const texto = textContent.items
      .slice(0, 30)
      .map(i => i.str)
      .join(' ')
      .toLowerCase()
      .substring(0, 300);

    // Busca o instrumento mais específico primeiro (ordem importa)
    for (const inst of INSTRUMENTOS) {
      if (texto.includes(inst.toLowerCase())) {
        // Capitalizar para exibição
        return inst.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  } catch (e) {
    console.warn('Erro ao extrair texto da página', numeroPagina, e);
  }

  // 3. Fallback
  return `Página ${numeroPagina}`;
}

// ── Renderizar todas as partes ────────────────────────────────────────────────
async function renderizarPartes() {
  const content = document.getElementById('partes-content');

  try {
    const pdfjs = await loadPdfJs();

    // Carrega PDF com CORS
    const loadingTask = pdfjs.getDocument({
      url: pdfUrl,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true
    });

    pdfDoc = await loadingTask.promise;
    const totalPaginas = pdfDoc.numPages;

    // Montar estrutura
    content.innerHTML = `
      <p class="section-title">
        <i class="fas fa-layer-group"></i>
        <span>${totalPaginas}</span> ${totalPaginas === 1 ? 'parte encontrada' : 'partes encontradas'}
        ${userRole === 'teacher' ? '<span style="margin-left:10px;font-size:0.8rem;color:var(--muted);">✏️ Clique no lápis para renomear</span>' : ''}
      </p>
      <div class="partes-grid" id="partes-grid"></div>
    `;

    const grid = document.getElementById('partes-grid');

    // Renderizar cards em paralelo
    const promises = [];
    for (let i = 1; i <= totalPaginas; i++) {
      promises.push(renderizarCard(grid, i, totalPaginas));
    }
    await Promise.all(promises);

  } catch (err) {
    console.error('Erro ao renderizar partes:', err);
    content.innerHTML = `
      <div class="erro-doc">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Não foi possível carregar o PDF.<br>Verifique sua conexão e tente novamente.</p>
      </div>`;
  }
}

// ── Renderizar card individual ────────────────────────────────────────────────
async function renderizarCard(grid, numeroPagina, total) {
  const page = await pdfDoc.getPage(numeroPagina);
  const nomeInstrumento = await detectarInstrumento(page, numeroPagina);

  // Criar card
  const card = document.createElement('div');
  card.className = 'parte-card';
  card.id = `card-${numeroPagina}`;

  card.innerHTML = `
    <div class="parte-thumb" id="thumb-${numeroPagina}">
      <div class="thumb-loading">
        <i class="fas fa-spinner"></i>
        <span>Carregando...</span>
      </div>
    </div>
    <div class="parte-info">
      <span class="parte-num">Parte ${numeroPagina} de ${total}</span>

      <div class="parte-nome-wrap" id="nome-wrap-${numeroPagina}">
        <span class="parte-nome" id="nome-${numeroPagina}">${nomeInstrumento}</span>
        <button class="btn-editar-rotulo" id="btn-edit-${numeroPagina}"
          onclick="iniciarEdicaoRotulo(${numeroPagina})" title="Renomear">
          <i class="fas fa-pen"></i>
        </button>
      </div>

      <div style="display:none; flex-direction:column; gap:6px;" id="edit-wrap-${numeroPagina}">
        <input class="rotulo-input" id="input-${numeroPagina}" type="text" value="${nomeInstrumento}" placeholder="Nome do instrumento">
        <div style="display:flex; gap:6px;">
          <button class="btn-salvar-rotulo" onclick="salvarEdicaoRotulo(${numeroPagina})">✅ Salvar</button>
          <button class="btn-cancelar-rotulo" onclick="cancelarEdicaoRotulo(${numeroPagina})">Cancelar</button>
        </div>
      </div>

      <button class="btn-baixar-parte" id="btn-baixar-${numeroPagina}"
        onclick="baixarParte(${numeroPagina})">
        <i class="fas fa-download"></i> Baixar esta parte
      </button>
    </div>
  `;

  grid.appendChild(card);

  // Mostrar botão de edição para professor
  if (userRole === 'teacher') {
    const btnEdit = card.querySelector(`#btn-edit-${numeroPagina}`);
    if (btnEdit) btnEdit.style.display = 'inline-block';
  }

  // Gerar miniatura
  await gerarMiniatura(page, card.querySelector(`#thumb-${numeroPagina}`), numeroPagina);
}

// ── Gerar miniatura de uma página ─────────────────────────────────────────────
async function gerarMiniatura(page, wrapEl, numeroPagina) {
  try {
    const scale    = 1.0;
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    wrapEl.innerHTML = '';
    wrapEl.appendChild(canvas);
    // Ao clicar na miniatura, inicia download
    wrapEl.onclick = () => baixarParte(numeroPagina);
  } catch (err) {
    console.warn('Erro na miniatura da página', numeroPagina, err);
    wrapEl.innerHTML = `
      <div class="thumb-error">
        <i class="fas fa-file-pdf"></i>
        <span>Pré-visualização<br>indisponível</span>
      </div>`;
  }
}

// ── Download de página específica (pdf-lib) ───────────────────────────────────
async function baixarParte(numeroPagina) {
  const btn = document.getElementById(`btn-baixar-${numeroPagina}`);
  const nomeEl = document.getElementById(`nome-${numeroPagina}`);
  const nomeInstrumento = nomeEl ? nomeEl.textContent.trim() : `Parte ${numeroPagina}`;
  const nomePdf = document.getElementById('doc-titulo').textContent.replace('🎵 ', '').trim();

  try {
    btn.disabled = true;
    btn.classList.add('baixando');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

    const PDFLib = await loadPdfLib();
    const { PDFDocument } = PDFLib;

    // Buscar bytes do PDF original
    const response  = await fetch(pdfUrl);
    const pdfBytes  = await response.arrayBuffer();
    const pdfOrig   = await PDFDocument.load(pdfBytes);

    // Criar novo PDF com apenas a página selecionada
    const novoPdf   = await PDFDocument.create();
    const [pagCopy] = await novoPdf.copyPages(pdfOrig, [numeroPagina - 1]);
    novoPdf.addPage(pagCopy);

    const novoBytes = await novoPdf.save();
    const blob      = new Blob([novoBytes], { type: 'application/pdf' });
    const url       = URL.createObjectURL(blob);

    const link      = document.createElement('a');
    link.href       = url;
    link.download   = `${nomePdf} - ${nomeInstrumento}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    // Registrar download no Firestore
    await registrarDownload(`${nomePdf} - ${nomeInstrumento}`);

  } catch (err) {
    console.error('Erro ao baixar parte:', err);
    alert('❌ Erro ao gerar o PDF da parte. Tente novamente.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('baixando');
      btn.innerHTML = '<i class="fas fa-download"></i> Baixar esta parte';
    }
  }
}

// ── Edição de rótulo pelo professor ──────────────────────────────────────────
function iniciarEdicaoRotulo(numeroPagina) {
  document.getElementById(`nome-wrap-${numeroPagina}`).style.display = 'none';
  const wrap = document.getElementById(`edit-wrap-${numeroPagina}`);
  wrap.style.display = 'flex';
  const input = document.getElementById(`input-${numeroPagina}`);
  input.focus();
  input.select();
  // Salvar com Enter
  input.onkeydown = (e) => { if (e.key === 'Enter') salvarEdicaoRotulo(numeroPagina); if (e.key === 'Escape') cancelarEdicaoRotulo(numeroPagina); };
}

async function salvarEdicaoRotulo(numeroPagina) {
  const input = document.getElementById(`input-${numeroPagina}`);
  const novoNome = input.value.trim();
  if (!novoNome) { alert('❌ Digite um nome válido'); return; }

  try {
    await salvarRotulo(numeroPagina, novoNome);
    document.getElementById(`nome-${numeroPagina}`).textContent = novoNome;
    cancelarEdicaoRotulo(numeroPagina);
  } catch (err) {
    console.error('Erro ao salvar rótulo:', err);
    alert('❌ Erro ao salvar o nome.');
  }
}

function cancelarEdicaoRotulo(numeroPagina) {
  document.getElementById(`edit-wrap-${numeroPagina}`).style.display = 'none';
  document.getElementById(`nome-wrap-${numeroPagina}`).style.display = 'flex';
}

// ── Registro de download ──────────────────────────────────────────────────────
async function registrarDownload(nomeArquivo) {
  try {
    const usuario    = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    const nomeAluno  = usuario.nome || 'Visitante';
    await addDoc(collection(db, 'downloads'), {
      nomeAluno,
      nomeArquivo,
      data: Timestamp.fromDate(new Date())
    });
  } catch (e) {
    console.warn('Erro ao registrar download:', e);
  }
}

// ── Erro fatal ────────────────────────────────────────────────────────────────
function mostrarErro(msg) {
  document.getElementById('loading-inicial').style.display = 'none';
  document.getElementById('partes-content').innerHTML = `
    <div class="erro-doc">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${msg}</p>
      <a href="biblioteca.html" style="color:var(--azul);text-decoration:none;">← Voltar à Biblioteca</a>
    </div>`;
}

// Expor para onclick inline
window.baixarParte            = baixarParte;
window.iniciarEdicaoRotulo    = iniciarEdicaoRotulo;
window.salvarEdicaoRotulo     = salvarEdicaoRotulo;
window.cancelarEdicaoRotulo   = cancelarEdicaoRotulo;
