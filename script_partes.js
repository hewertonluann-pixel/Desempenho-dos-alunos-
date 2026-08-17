// script_partes.js
import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, addDoc, collection, Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const PDFJS_CDN    = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const PDFLIB_CDN   = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

// Catálogo canônico usado pela detecção automática. Os aliases são normalizados
// antes da comparação, portanto acentos, caixa e pontuação não são relevantes.
const CATALOGO_INSTRUMENTOS = [
  { nome: 'Violino I', aliases: ['violino i', 'violino 1', 'violin i', 'violin 1'] },
  { nome: 'Violino II', aliases: ['violino ii', 'violino 2', 'violin ii', 'violin 2'] },
  { nome: 'Violino', aliases: ['violino', 'violin'] },
  { nome: 'Viola', aliases: ['viola'] },
  { nome: 'Violoncelo', aliases: ['violoncelo', 'violoncello', 'cello'] },
  { nome: 'Contrabaixo', aliases: ['contrabaixo', 'contrabasso', 'contrabass', 'double bass'] },
  { nome: 'Flauta', aliases: ['flauta transversal', 'flauta', 'flute'] },
  { nome: 'Oboé', aliases: ['oboé', 'oboe'] },
  { nome: 'Clarinete', aliases: ['clarinete', 'clarinet'] },
  { nome: 'Fagote', aliases: ['fagote', 'bassoon'] },
  { nome: 'Saxofone Soprano', aliases: ['saxofone soprano', 'sax soprano', 'soprano sax'] },
  { nome: 'Saxofone Alto', aliases: ['saxofone alto', 'sax alto', 'alto sax'] },
  { nome: 'Saxofone Tenor', aliases: ['saxofone tenor', 'sax tenor', 'tenor sax'] },
  { nome: 'Saxofone Barítono', aliases: ['saxofone barítono', 'saxofone baritono', 'sax barítono', 'sax baritono', 'baritone sax'] },
  { nome: 'Saxofone', aliases: ['saxofone', 'saxophone'] },
  { nome: 'Trompete', aliases: ['trompete', 'trumpet', 'cornet'] },
  { nome: 'Trompa', aliases: ['trompa', 'french horn'] },
  { nome: 'Trombone', aliases: ['trombone'] },
  { nome: 'Tuba', aliases: ['tuba'] },
  { nome: 'Bombardino', aliases: ['bombardino', 'euphonium'] },
  { nome: 'Percussão', aliases: ['percussão', 'percussao', 'bateria', 'tímpano', 'timpani'] },
  { nome: 'Piano', aliases: ['piano', 'teclado', 'keyboard'] },
  { nome: 'Órgão', aliases: ['órgão', 'orgao', 'organ'] },
  { nome: 'Soprano', aliases: ['soprano'], generico: true },
  { nome: 'Contralto', aliases: ['contralto'], generico: true },
  { nome: 'Tenor', aliases: ['tenor'], generico: true },
  { nome: 'Baixo', aliases: ['baixo'], generico: true }
];

const TERMOS_GRADE = [
  'grade',
  'partitura geral',
  'full score',
  'orchestral score',
  'conductor score'
];

// ── Estado global ────────────────────────────────────────────────────────────
let pdfJsLib  = null;
let pdfLibLib = null;
let pdfDoc    = null;
let pdfUrl    = null;
let docId     = null;
let colId     = null;
let userRole  = 'student';
let nomePdf   = '';

let grupos = [];
let totalPaginas = 0;
let gruposModificados = false;
let documentoCarregado = false;

// Cache separado por chave "pagina_dpr_altura" para não misturar resoluções
const pageCache = {};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  lerParams();
  checkAuth();
  configurarSeletor();
  renderRoleBadge();
  configurarBarraProfessor();
  configurarModal();
  configurarVisualizador();
  await carregarDocumento();
});

function lerParams() {
  const params = new URLSearchParams(window.location.search);
  colId = params.get('col');
  docId = params.get('doc');
  if (!colId || !docId) mostrarErro('Parâmetros inválidos. Volte à biblioteca.');
}

// ── Auth + Seletor ───────────────────────────────────────────────────────────
function checkAuth() {
  const seletor = document.getElementById('user-role');
  try {
    const user = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    const isTeacher =
      user.classificado === true  ||
      user.classificado === 'true'||
      user.role === 'teacher'     ||
      user.tipo === 'professor'   ||
      user.isTeacher === true;
    userRole = isTeacher ? 'teacher' : 'student';
  } catch { userRole = 'student'; }
  if (seletor) { seletor.value = userRole; seletor.style.display = 'block'; }
}

function configurarSeletor() {
  const seletor = document.getElementById('user-role');
  if (!seletor) return;
  seletor.addEventListener('change', () => {
    userRole = seletor.value;
    renderRoleBadge();
    atualizarBarraProfessor();
    if (documentoCarregado) renderizarGrupos();
  });
}

function renderRoleBadge() {
  const old = document.getElementById('role-badge-partes');
  if (old) old.remove();
}

// ── Barra professor ──────────────────────────────────────────────────────────
function configurarBarraProfessor() {
  document.getElementById('btn-novo-grupo').addEventListener('click', criarNovoGrupo);
  document.getElementById('btn-salvar-grupos').addEventListener('click', salvarGrupos);
  atualizarBarraProfessor();
}

function atualizarBarraProfessor() {
  const barra = document.getElementById('barra-professor');
  barra.style.display = userRole === 'teacher' ? 'flex' : 'none';
}

function marcarModificado() {
  gruposModificados = true;
  const btn = document.getElementById('btn-salvar-grupos');
  const ind = document.getElementById('salvar-indicator');
  if (btn) btn.disabled = false;
  if (ind) ind.style.display = 'inline';
}

// ── Modal seletor de páginas ────────────────────────────────────────────────
let modalTargetIdx = null;

function configurarModal() {
  document.getElementById('modal-seletor-fechar')
    .addEventListener('click', fecharModal);
  document.getElementById('modal-seletor-overlay')
    .addEventListener('click', fecharModal);
}

function abrirSeletorPaginas(idxGrupo) {
  if (userRole !== 'teacher') return;
  modalTargetIdx = idxGrupo;
  const disponiveis = getPaginasDisponiveis();
  const grid = document.getElementById('modal-seletor-grid');
  grid.innerHTML = '';

  if (disponiveis.length === 0) {
    grid.innerHTML = '<div id="modal-seletor-vazio">Todas as páginas já estão atribuídas.</div>';
  } else {
    disponiveis.forEach(numPag => {
      const item = document.createElement('div');
      item.className = 'seletor-item';
      item.innerHTML = `
        <div class="seletor-thumb" id="seletor-thumb-${numPag}">
          <div class="thumb-loading"><i class="fas fa-spinner"></i></div>
        </div>
        <div class="seletor-label">Página ${numPag}</div>
      `;
      item.addEventListener('click', () => { adicionarPaginaAoGrupo(idxGrupo, numPag); fecharModal(); });
      grid.appendChild(item);
      renderMiniatura(numPag, item.querySelector(`#seletor-thumb-${numPag}`), 80);
    });
  }
  document.getElementById('modal-seletor').classList.add('aberto');
}

function fecharModal() {
  document.getElementById('modal-seletor').classList.remove('aberto');
  modalTargetIdx = null;
}

// ══════════════════════════════════════════════════════════════════════════════
// VISUALIZADOR FULLSCREEN
// ══════════════════════════════════════════════════════════════════════════════
let vizGrupoIdx  = null;
let vizPagIdx    = 0;
let vizRendering = false;
let swipeStartX  = 0;

function configurarVisualizador() {
  // FIX: guard — aborta silenciosamente se o modal ainda não estiver no DOM
  const modal  = document.getElementById('viz-modal');
  const fechar = document.getElementById('viz-fechar');
  const prev   = document.getElementById('viz-prev');
  const next   = document.getElementById('viz-next');
  const dlBtn  = document.getElementById('viz-baixar');
  const canvas = document.getElementById('viz-canvas');
  const body   = document.getElementById('viz-body');

  if (!modal || !fechar || !prev || !next || !dlBtn || !canvas) {
    console.warn('configurarVisualizador: elementos do modal não encontrados no DOM.');
    return;
  }

  fechar.addEventListener('click', fecharVisualizador);
  prev.addEventListener('click',   () => navegarViz(-1));
  next.addEventListener('click',   () => navegarViz(1));
  dlBtn.addEventListener('click',  () => baixarGrupo(vizGrupoIdx));

  // FIX: fecha ao clicar no fundo (#viz-body), não em um overlay inexistente
  if (body) {
    body.addEventListener('click', e => {
      if (e.target === body) fecharVisualizador();
    });
  }

  // Teclado
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('aberto')) return;
    if (e.key === 'Escape')     fecharVisualizador();
    if (e.key === 'ArrowLeft')  navegarViz(-1);
    if (e.key === 'ArrowRight') navegarViz(1);
  });

  // Swipe mobile
  canvas.addEventListener('touchstart', e => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  canvas.addEventListener('touchend',   e => {
    const diff = swipeStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navegarViz(diff > 0 ? 1 : -1);
  }, { passive: true });
}

function abrirVisualizador(idxGrupo, idxPagina = 0) {
  vizGrupoIdx = idxGrupo;
  vizPagIdx   = idxPagina;
  document.getElementById('viz-modal').classList.add('aberto');
  document.body.style.overflow = 'hidden';
  renderVizPagina();
}

function fecharVisualizador() {
  document.getElementById('viz-modal').classList.remove('aberto');
  document.body.style.overflow = '';
  vizGrupoIdx = null;
  vizPagIdx   = 0;
  const canvas = document.getElementById('viz-canvas');
  if (canvas) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  }
}

function navegarViz(delta) {
  if (vizGrupoIdx === null) return;
  const grupo   = grupos[vizGrupoIdx];
  const novoIdx = vizPagIdx + delta;
  if (novoIdx < 0 || novoIdx >= grupo.paginas.length) return;
  vizPagIdx = novoIdx;
  renderVizPagina();
}

async function renderVizPagina() {
  if (vizRendering) return;
  vizRendering = true;

  const grupo  = grupos[vizGrupoIdx];
  const numPag = grupo.paginas[vizPagIdx];
  const total  = grupo.paginas.length;

  document.getElementById('viz-nome').textContent     = grupo.nome;
  document.getElementById('viz-contador').textContent =
    total > 1 ? `Página ${vizPagIdx + 1} de ${total}` : '';
  document.getElementById('viz-prev').style.visibility = vizPagIdx > 0       ? 'visible' : 'hidden';
  document.getElementById('viz-next').style.visibility = vizPagIdx < total-1 ? 'visible' : 'hidden';

  const loading = document.getElementById('viz-loading');
  const canvas  = document.getElementById('viz-canvas');
  loading.style.display = 'flex';
  canvas.style.display  = 'none';

  try {
    const page   = await pdfDoc.getPage(numPag);
    const dpr    = window.devicePixelRatio || 1;
    const maxW   = Math.min(window.innerWidth - 32, 900);
    const baseVP = page.getViewport({ scale: 1 });
    const scale  = (maxW / baseVP.width) * dpr;
    const vp     = page.getViewport({ scale });

    canvas.width  = vp.width;
    canvas.height = vp.height;
    canvas.style.width  = (vp.width  / dpr) + 'px';
    canvas.style.height = (vp.height / dpr) + 'px';

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    loading.style.display = 'none';
    canvas.style.display  = 'block';
  } catch (err) {
    console.error('Erro no visualizador:', err);
    loading.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:var(--vermelho);font-size:2rem;"></i><span>Erro ao carregar</span>';
  } finally {
    vizRendering = false;
  }
}

// ── Carregar documento ────────────────────────────────────────────────────────
async function carregarDocumento() {
  try {
    const docRef = doc(db, 'biblioteca_colecoes', colId, 'documentos', docId);
    const snap   = await getDoc(docRef);
    if (!snap.exists()) { mostrarErro('Documento não encontrado.'); return; }
    const data = snap.data();
    pdfUrl  = data.url;
    nomePdf = data.nome;
    document.getElementById('doc-titulo').textContent = '🎵 ' + nomePdf;
    document.title = nomePdf + ' — Biblioteca';
    document.getElementById('btn-voltar').href = 'biblioteca.html';
    if (data.audioUrl) {
      document.getElementById('audio-source').src = data.audioUrl;
      document.getElementById('audio-player').load();
      document.getElementById('audio-section').style.display = 'flex';
    }
    const dlBtn = document.getElementById('btn-dl-completo');
    dlBtn.href = data.url;
    dlBtn.setAttribute('data-nome-arquivo', nomePdf);
    document.getElementById('download-completo').style.display = 'flex';
    await inicializarPdf();
    await carregarGrupos();
    documentoCarregado = true;
    renderizarGrupos();
  } catch (err) {
    console.error('Erro ao carregar documento:', err);
    mostrarErro('Erro ao carregar o documento.');
  }
}

async function inicializarPdf() {
  const pdfjs = await loadPdfJs();
  pdfDoc = await pdfjs.getDocument({
    url: pdfUrl,
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true
  }).promise;
  totalPaginas = pdfDoc.numPages;
}

// ── Grupos ───────────────────────────────────────────────────────────────────
async function carregarGrupos() {
  try {
    const rotuloRef = doc(db, 'biblioteca_rotulos', `${colId}_${docId}`);
    const snap = await getDoc(rotuloRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.grupos && Array.isArray(data.grupos) && data.grupos.length > 0) {
        grupos = data.grupos; return;
      }
      if (data.paginas && typeof data.paginas === 'object') {
        grupos = migrarFormatoAntigo(data.paginas); marcarModificado(); return;
      }
    }
    grupos = await algoritmoVarredura();
  } catch (e) {
    console.warn('Erro ao carregar grupos, usando varredura:', e);
    grupos = await algoritmoVarredura();
  }
}

function migrarFormatoAntigo(paginas) {
  const mapa = {};
  Object.entries(paginas).forEach(([numStr, nome]) => {
    if (!mapa[nome]) mapa[nome] = [];
    mapa[nome].push(parseInt(numStr));
  });
  return Object.entries(mapa)
    .map(([nome, pags]) => ({ nome, paginas: pags.sort((a,b) => a-b) }))
    .sort((a, b) => Math.min(...a.paginas) - Math.min(...b.paginas));
}

function normalizarTexto(valor = '') {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function localizarInstrumentos(texto) {
  const normalizado = ` ${normalizarTexto(texto)} `;
  const candidatos = [];

  for (const item of CATALOGO_INSTRUMENTOS) {
    const aliases = [...item.aliases]
      .sort((a, b) => normalizarTexto(b).length - normalizarTexto(a).length);
    const aliasEncontrado = aliases.find(alias => {
      const aliasNormalizado = normalizarTexto(alias);
      return normalizado.includes(` ${aliasNormalizado} `);
    });

    if (!aliasEncontrado) continue;
    const aliasNormalizado = normalizarTexto(aliasEncontrado);

    // Soprano, contralto, tenor e baixo também podem ser registros vocais.
    // Só os aceitamos quando aparecem acompanhados de contexto musical.
    if (item.generico) {
      const contexto = normalizado.includes(` ${aliasNormalizado} `) && (
        normalizado.includes('voz') ||
        normalizado.includes('vocal') ||
        normalizado.includes('coro') ||
        normalizado.includes('coral') ||
        normalizado.includes('naipe') ||
        normalizado.includes('parte') ||
        normalizado.includes('instrumento')
      );
      if (!contexto) continue;
    }

    candidatos.push({ nome: item.nome, alias: aliasEncontrado, aliasNormalizado });
  }

  // Evita contar simultaneamente um alias-base/genérico e seu alias específico:
  // “violino ii” deve ser apenas Violino II, e “saxofone tenor” não deve
  // virar Saxofone Tenor + Tenor quando o cabeçalho mencionar “parte”.
  return candidatos.filter((item, _, lista) => !lista.some(outro => {
    if (outro === item || outro.aliasNormalizado.length <= item.aliasNormalizado.length) return false;
    const aliasMaior = ` ${outro.aliasNormalizado} `;
    return aliasMaior.includes(` ${item.aliasNormalizado} `);
  }));
}

function contemTermoGrade(texto) {
  const normalizado = ` ${normalizarTexto(texto)} `;
  return TERMOS_GRADE.some(termo => normalizado.includes(` ${normalizarTexto(termo)} `));
}

function extrairTextoDaPagina(textContent) {
  const itens = (textContent.items || [])
    .map(item => ({
      texto: item.str || '',
      x: Number(item.transform?.[4] || 0),
      y: Number(item.transform?.[5] || 0)
    }))
    .filter(item => item.texto.trim());

  // PDF.js nem sempre entrega os itens na ordem visual. Ordenar pela posição
  // torna a leitura do cabeçalho mais previsível entre PDFs diferentes.
  itens.sort((a, b) => b.y - a.y || a.x - b.x);

  const textoPagina = itens.map(item => item.texto).join(' ');
  const yMax = itens.length ? Math.max(...itens.map(item => item.y)) : 0;
  const textoCabecalho = itens
    .filter(item => item.y >= yMax - 180)
    .map(item => item.texto)
    .join(' ');

  return { itens, textoPagina, textoCabecalho };
}

async function detectarInstrumentoNaPagina(page) {
  try {
    const textContent = await page.getTextContent();
    const { textoPagina, textoCabecalho } = extrairTextoDaPagina(textContent);
    const encontradosCabecalho = localizarInstrumentos(textoCabecalho);
    const instrumentosCabecalho = [...new Set(encontradosCabecalho.map(item => item.nome))];
    const gradeExplicita = contemTermoGrade(textoCabecalho);

    // Uma grade pode ser identificada pelo título explícito ou pela presença
    // de dois ou mais instrumentos distintos no cabeçalho.
    if (gradeExplicita || instrumentosCabecalho.length >= 2) {
      return {
        nome: 'GRADE',
        tipo: 'grade',
        paginas: [],
        instrumentosDetectados: instrumentosCabecalho,
        confianca: gradeExplicita ? 0.99 : 0.90,
        origem: 'automatico'
      };
    }

    if (instrumentosCabecalho.length === 1) {
      return {
        nome: instrumentosCabecalho[0],
        tipo: 'instrumento',
        paginas: [],
        instrumentosDetectados: instrumentosCabecalho,
        confianca: 0.90,
        origem: 'automatico'
      };
    }

    // Segunda tentativa: toda a camada textual da página. A confiança é menor
    // porque outras referências musicais podem aparecer fora do cabeçalho.
    const encontradosPagina = localizarInstrumentos(textoPagina);
    const instrumentosPagina = [...new Set(encontradosPagina.map(item => item.nome))];

    if (instrumentosPagina.length >= 2) {
      return {
        nome: 'GRADE',
        tipo: 'grade',
        paginas: [],
        instrumentosDetectados: instrumentosPagina,
        confianca: 0.70,
        origem: 'automatico-ampliado'
      };
    }

    if (instrumentosPagina.length === 1) {
      return {
        nome: instrumentosPagina[0],
        tipo: 'instrumento',
        paginas: [],
        instrumentosDetectados: instrumentosPagina,
        confianca: 0.65,
        origem: 'automatico-ampliado'
      };
    }
  } catch (e) {
    console.warn('Erro ao extrair texto:', e);
  }

  return {
    nome: null,
    tipo: 'desconhecido',
    paginas: [],
    instrumentosDetectados: [],
    confianca: 0,
    origem: 'sem-texto-ou-sem-match'
  };
}

async function algoritmoVarredura() {
  const resultado = [];
  let grupoAtual = null;

  for (let i = 1; i <= totalPaginas; i++) {
    const page = await pdfDoc.getPage(i);
    const deteccao = await detectarInstrumentoNaPagina(page);

    if (deteccao.nome) {
      grupoAtual = {
        nome: deteccao.nome,
        tipo: deteccao.tipo,
        paginas: [i],
        instrumentosDetectados: deteccao.instrumentosDetectados,
        confianca: deteccao.confianca,
        origem: deteccao.origem
      };
      resultado.push(grupoAtual);
    } else if (grupoAtual) {
      // Páginas intermediárias sem cabeçalho continuam pertencendo ao grupo
      // anterior, como no comportamento original.
      grupoAtual.paginas.push(i);
    } else {
      // Sem grupo anterior, não inventar um instrumento: deixar a página
      // explícita para revisão manual do professor.
      grupoAtual = {
        nome: `Página ${i} — revisar`,
        tipo: 'desconhecido',
        paginas: [i],
        instrumentosDetectados: [],
        confianca: 0,
        origem: 'sem-texto-ou-sem-match'
      };
      resultado.push(grupoAtual);
    }
  }

  return resultado;
}

async function salvarGrupos() {
  if (userRole !== 'teacher') return;
  const grupoVazio = grupos.find(g => g.paginas.length === 0);
  if (grupoVazio) {
    alert(`❌ O instrumento "${grupoVazio.nome}" não tem páginas.`);
    return;
  }
  const btn = document.getElementById('btn-salvar-grupos');
  const ind = document.getElementById('salvar-indicator');
  try {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    const rotuloRef = doc(db, 'biblioteca_rotulos', `${colId}_${docId}`);
    await setDoc(rotuloRef, { grupos }, { merge: false });
    gruposModificados = false;
    if (ind) ind.style.display = 'none';
    btn.innerHTML = '<i class="fas fa-check"></i> Salvo!';
    setTimeout(() => { btn.innerHTML = '<i class="fas fa-save"></i> Salvar Tudo'; btn.disabled = true; }, 2000);
  } catch (err) {
    console.error('Erro ao salvar grupos:', err);
    alert('❌ Erro ao salvar. Tente novamente.');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Salvar Tudo';
  }
}

function getPaginasAtribuidas() {
  return new Set(grupos.flatMap(g => g.paginas));
}
function getPaginasDisponiveis() {
  const atribuidas = getPaginasAtribuidas();
  const disponiveis = [];
  for (let i = 1; i <= totalPaginas; i++) {
    if (!atribuidas.has(i)) disponiveis.push(i);
  }
  return disponiveis;
}

// ── Edição de grupos (professor) ─────────────────────────────────────────────
function criarNovoGrupo() {
  if (userRole !== 'teacher') return;
  grupos.push({ nome: 'Novo Instrumento', paginas: [] });
  marcarModificado();
  renderizarGrupos();
  setTimeout(() => iniciarRenomear(grupos.length - 1), 100);
}

function adicionarPaginaAoGrupo(idxGrupo, numPagina) {
  if (userRole !== 'teacher') return;
  grupos.forEach(g => { g.paginas = g.paginas.filter(p => p !== numPagina); });
  grupos[idxGrupo].paginas.push(numPagina);
  grupos[idxGrupo].paginas.sort((a, b) => a - b);
  marcarModificado();
  renderizarGrupos();
}

function removerPaginaDoGrupo(idxGrupo, numPagina) {
  if (userRole !== 'teacher') return;
  grupos[idxGrupo].paginas = grupos[idxGrupo].paginas.filter(p => p !== numPagina);
  marcarModificado();
  renderizarGrupos();
}

function excluirGrupo(idxGrupo) {
  if (userRole !== 'teacher') return;
  const nome = grupos[idxGrupo].nome;
  if (!confirm(`Excluir o instrumento "${nome}"?`)) return;
  grupos.splice(idxGrupo, 1);
  marcarModificado();
  renderizarGrupos();
}

function iniciarRenomear(idxGrupo) {
  if (userRole !== 'teacher') return;
  const nomeWrap   = document.getElementById(`grupo-nome-wrap-${idxGrupo}`);
  const renameWrap = document.getElementById(`grupo-rename-wrap-${idxGrupo}`);
  const input      = document.getElementById(`grupo-rename-input-${idxGrupo}`);
  if (!nomeWrap || !renameWrap || !input) return;
  nomeWrap.style.display   = 'none';
  renameWrap.style.display = 'flex';
  input.value = grupos[idxGrupo].nome;
  setTimeout(() => { input.focus(); input.select(); }, 50);
}

function confirmarRenomear(idxGrupo) {
  if (userRole !== 'teacher') return;
  const input = document.getElementById(`grupo-rename-input-${idxGrupo}`);
  const novo  = input ? input.value.trim() : '';
  if (!novo) { alert('❌ Digite um nome válido.'); return; }
  grupos[idxGrupo].nome = novo;
  marcarModificado();
  cancelarRenomear(idxGrupo);
  const nomeEl = document.getElementById(`grupo-prof-nome-${idxGrupo}`);
  if (nomeEl) nomeEl.textContent = novo;
}

function cancelarRenomear(idxGrupo) {
  const nomeWrap   = document.getElementById(`grupo-nome-wrap-${idxGrupo}`);
  const renameWrap = document.getElementById(`grupo-rename-wrap-${idxGrupo}`);
  if (nomeWrap)   nomeWrap.style.display   = 'flex';
  if (renameWrap) renameWrap.style.display = 'none';
}

// ── Renderizar grid ─────────────────────────────────────────────────────────
function renderizarGrupos() {
  const content = document.getElementById('partes-content');
  const totalInstrumentos = grupos.filter(g => g.paginas.length > 0).length;

  content.innerHTML = `
    <p class="section-title">
      <i class="fas fa-layer-group"></i>
      <span>${totalInstrumentos}</span> instrumento${totalInstrumentos !== 1 ? 's' : ''} encontrado${totalInstrumentos !== 1 ? 's' : ''}
      &nbsp;·&nbsp; ${totalPaginas} página${totalPaginas !== 1 ? 's' : ''} no total
      ${userRole === 'teacher'
        ? '<span style="margin-left:10px;font-size:0.78rem;color:var(--dourado);">✏️ Modo edição ativo</span>'
        : '<span style="margin-left:10px;font-size:0.78rem;color:var(--muted);">🎓 Modo aluno</span>'
      }
    </p>
    <div class="partes-grid" id="partes-grid"></div>
  `;

  const currentMode = localStorage.getItem('partes_view_mode') || 'list';
  const grid = document.getElementById('partes-grid');
  if (currentMode === 'list') grid.classList.add('view-list');

  grupos.forEach((grupo, idx) => {
    grid.appendChild(
      userRole === 'teacher'
        ? criarCardProfessor(grupo, idx)
        : criarCardAluno(grupo, idx)
    );
  });

  grupos.forEach((grupo, idx) => {
    if (userRole === 'teacher') {
      grupo.paginas.forEach(numPag => {
        const wrapEl = document.getElementById(`mini-thumb-${idx}-${numPag}`);
        if (wrapEl) renderMiniatura(numPag, wrapEl, 80);
      });
    } else {
      if (grupo.paginas.length > 0 && currentMode !== 'list') {
        const wrapEl = document.getElementById(`grupo-thumb-${idx}`);
        if (wrapEl) renderMiniatura(grupo.paginas[0], wrapEl, 400);
      }
    }
  });

  observarModoGrade();
}

let gradeObserverAtivo = false;
function observarModoGrade() {
  if (gradeObserverAtivo) return;
  gradeObserverAtivo = true;
  const obs = new MutationObserver(() => {
    const grid = document.getElementById('partes-grid');
    if (!grid) return;
    if (!grid.classList.contains('view-list') && userRole !== 'teacher') {
      grupos.forEach((grupo, idx) => {
        if (grupo.paginas.length > 0) {
          const wrapEl = document.getElementById(`grupo-thumb-${idx}`);
          if (wrapEl && !wrapEl.querySelector('canvas')) {
            renderMiniatura(grupo.paginas[0], wrapEl, 400);
          }
        }
      });
    }
  });
  const grid = document.getElementById('partes-grid');
  if (grid) obs.observe(grid, { attributes: true, attributeFilter: ['class'] });
}

// ── Card Aluno ────────────────────────────────────────────────────────────
function criarCardAluno(grupo, idx) {
  const card = document.createElement('div');
  card.className = 'grupo-card';
  card.id = `grupo-card-${idx}`;

  const ehGrade = grupo.tipo === 'grade' || normalizarTexto(grupo.nome).startsWith('grade');
  const badgeTipo = ehGrade
    ? '<small style="display:inline-flex;margin-left:6px;padding:3px 7px;border-radius:999px;background:#e0f2fe;color:#0369a1;font-weight:700;">Partitura geral</small>'
    : '';
  const numPags   = grupo.paginas.length;
  const labelPags = numPags === 1
    ? 'Página ' + grupo.paginas[0]
    : `Páginas ${grupo.paginas[0]}–${grupo.paginas[grupo.paginas.length - 1]} · ${numPags} folhas`;

  // FIX: sem onclick inline (scripts ES module não expõem ao escopo global via onclick)
  card.innerHTML = `
    <div class="grupo-thumb" id="grupo-thumb-${idx}">
      <div class="thumb-loading">
        <i class="fas fa-spinner"></i>
        <span>Carregando...</span>
      </div>
    </div>
    <div class="grupo-info">
      <span class="grupo-paginas-label">${labelPags}</span>
          <div class="grupo-nome-wrap">
            <span class="grupo-nome">${grupo.nome}</span>${badgeTipo}
          </div>
      <div class="grupo-btns">
        <button class="btn-visualizar-grupo" id="btn-ver-${idx}" title="Visualizar em tela cheia">
          <i class="fas fa-expand"></i> <span class="viz-label">Visualizar</span>
        </button>
        <button class="btn-baixar-grupo" id="btn-baixar-${idx}">
          <i class="fas fa-download"></i> Baixar
        </button>
      </div>
    </div>
  `;

  // FIX: eventos via addEventListener (funciona corretamente em módulos ES)
  card.querySelector(`#btn-ver-${idx}`).addEventListener('click', () => abrirVisualizador(idx, 0));
  card.querySelector(`#btn-baixar-${idx}`).addEventListener('click', () => baixarGrupo(idx));
  card.querySelector('.grupo-thumb').addEventListener('click', () => abrirVisualizador(idx, 0));

  return card;
}

// ── Card Professor ─────────────────────────────────────────────────────────
function criarCardProfessor(grupo, idx) {
  const card = document.createElement('div');
  card.className = 'grupo-card professor-mode';
  card.id = `grupo-card-${idx}`;

  const ehGrade = grupo.tipo === 'grade' || normalizarTexto(grupo.nome).startsWith('grade');
  const badgeTipo = ehGrade
    ? '<small style="display:inline-flex;margin-left:6px;padding:3px 7px;border-radius:999px;background:#e0f2fe;color:#0369a1;font-weight:700;">Partitura geral</small>'
    : '';
  const thumbsHTML = grupo.paginas.map(numPag => `
    <div class="grupo-mini-wrap">
      <div class="grupo-mini-thumb" id="mini-thumb-${idx}-${numPag}">
        <div class="thumb-loading" style="min-height:110px;"><i class="fas fa-spinner"></i></div>
      </div>
      <div class="grupo-mini-label">Pág. ${numPag}</div>
      <button class="btn-remover-pag" title="Remover página ${numPag}"
        onclick="removerPaginaDoGrupo(${idx}, ${numPag})">×</button>
    </div>
  `).join('');

  const numPags = grupo.paginas.length;
  const aviso   = numPags === 0
    ? '<span style="color:var(--vermelho);font-size:0.75rem;">⚠️ Nenhuma página atribuída</span>'
    : `<span class="grupo-prof-count">${numPags} página${numPags !== 1 ? 's' : ''}</span>`;

  card.innerHTML = `
    <div class="grupo-prof-header">
      <div id="grupo-nome-wrap-${idx}" style="display:flex;align-items:center;gap:6px;flex:1;">
        <span class="grupo-prof-nome" id="grupo-prof-nome-${idx}">${grupo.nome}</span>${badgeTipo}
        <button class="btn-renomear-grupo" title="Renomear" onclick="iniciarRenomear(${idx})">
          <i class="fas fa-pen"></i>
        </button>
      </div>
      <div id="grupo-rename-wrap-${idx}" class="grupo-rename-wrap">
        <input id="grupo-rename-input-${idx}" class="grupo-rename-input" type="text"
          placeholder="Nome do instrumento"
          onkeydown="if(event.key==='Enter') confirmarRenomear(${idx}); if(event.key==='Escape') cancelarRenomear(${idx});">
        <button class="btn-confirm-rename" onclick="confirmarRenomear(${idx})">OK</button>
        <button class="btn-cancel-rename" onclick="cancelarRenomear(${idx})">Cancelar</button>
      </div>
      <button class="btn-excluir-grupo" title="Excluir" onclick="excluirGrupo(${idx})">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="grupo-thumbs-row">
      ${thumbsHTML}
      <button class="btn-adicionar-pag" onclick="abrirSeletorPaginas(${idx})">
        <i class="fas fa-plus"></i>
        <span>Adicionar<br>página</span>
      </button>
    </div>
    <div class="grupo-prof-footer">
      ${aviso}
      <button class="btn-baixar-grupo" style="width:auto;padding:6px 16px;"
        id="btn-baixar-${idx}" ${numPags === 0 ? 'disabled' : ''}>
        <i class="fas fa-download"></i> Baixar
      </button>
    </div>
  `;

  // Botão baixar do card professor também via addEventListener
  card.querySelector(`#btn-baixar-${idx}`).addEventListener('click', () => baixarGrupo(idx));
  return card;
}

// ── Renderizar miniatura (alta resolução com DPR) ────────────────────────────
async function renderMiniatura(numPagina, wrapEl, alturaAlvo = 400) {
  if (!wrapEl) return;
  const dpr      = window.devicePixelRatio || 1;
  const cacheKey = `${numPagina}_${dpr}_${alturaAlvo}`;

  try {
    if (pageCache[cacheKey]) {
      const clone = document.createElement('canvas');
      clone.width  = pageCache[cacheKey].width;
      clone.height = pageCache[cacheKey].height;
      clone.getContext('2d').drawImage(pageCache[cacheKey], 0, 0);
      clone.style.width  = (clone.width  / dpr) + 'px';
      clone.style.height = (clone.height / dpr) + 'px';
      wrapEl.innerHTML = '';
      wrapEl.appendChild(clone);
      return;
    }

    const page     = await pdfDoc.getPage(numPagina);
    const baseVP   = page.getViewport({ scale: 1 });
    const scale    = (alturaAlvo / baseVP.height) * dpr;
    const viewport = page.getViewport({ scale });

    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    canvas.style.width  = (viewport.width  / dpr) + 'px';
    canvas.style.height = (viewport.height / dpr) + 'px';

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    pageCache[cacheKey] = canvas;
    wrapEl.innerHTML = '';
    wrapEl.appendChild(canvas);
  } catch (err) {
    console.warn('Erro na miniatura página', numPagina, err);
    wrapEl.innerHTML = `
      <div class="thumb-error">
        <i class="fas fa-file-pdf"></i>
        <span>Indisponível</span>
      </div>`;
  }
}

// ── Download ────────────────────────────────────────────────────────────────
async function baixarGrupo(idxGrupo) {
  const grupo = grupos[idxGrupo];
  if (!grupo || grupo.paginas.length === 0) {
    alert('❌ Este instrumento não tem páginas atribuídas.'); return;
  }
  const btn    = document.getElementById(`btn-baixar-${idxGrupo}`);
  const vizBtn = document.getElementById('viz-baixar');
  try {
    if (btn)    { btn.disabled = true;    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...'; }
    if (vizBtn) { vizBtn.disabled = true; vizBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    const PDFLib = await loadPdfLib();
    const { PDFDocument } = PDFLib;
    const response  = await fetch(pdfUrl);
    const pdfBytes  = await response.arrayBuffer();
    const pdfOrig   = await PDFDocument.load(pdfBytes);
    const novoPdf   = await PDFDocument.create();
    const indices   = grupo.paginas.map(p => p - 1);
    const pagsCopy  = await novoPdf.copyPages(pdfOrig, indices);
    pagsCopy.forEach(p => novoPdf.addPage(p));
    const novoBytes = await novoPdf.save();
    const blob      = new Blob([novoBytes], { type: 'application/pdf' });
    const url       = URL.createObjectURL(blob);
    const link      = document.createElement('a');
    link.href = url; link.download = `${nomePdf} - ${grupo.nome}.pdf`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    await registrarDownload(`${nomePdf} - ${grupo.nome}`);
  } catch (err) {
    console.error('Erro ao baixar grupo:', err);
    alert('❌ Erro ao gerar o PDF. Tente novamente.');
  } finally {
    if (btn)    { btn.disabled = false;    btn.innerHTML = '<i class="fas fa-download"></i> Baixar'; }
    if (vizBtn) { vizBtn.disabled = false; vizBtn.innerHTML = '<i class="fas fa-download"></i>'; }
  }
}

async function registrarDownload(nomeArquivo) {
  try {
    const usuario   = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    const nomeAluno = usuario.nome || 'Visitante';
    await addDoc(collection(db, 'downloads'), {
      nomeAluno, nomeArquivo, data: Timestamp.fromDate(new Date())
    });
  } catch (e) { console.warn('Erro ao registrar download:', e); }
}

// ── Loaders externos ────────────────────────────────────────────────────────
async function loadPdfJs() {
  if (pdfJsLib) return pdfJsLib;
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      pdfJsLib = window.pdfjsLib; resolve(pdfJsLib); return;
    }
    const s = document.createElement('script');
    s.src = PDFJS_CDN;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; pdfJsLib = window.pdfjsLib; resolve(pdfJsLib); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

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

function mostrarErro(msg) {
  const loadInicial = document.getElementById('loading-inicial');
  if (loadInicial) loadInicial.style.display = 'none';
  document.getElementById('partes-content').innerHTML = `
    <div class="erro-doc">
      <i class="fas fa-exclamation-triangle"></i>
      <p>${msg}</p>
      <a href="biblioteca.html" style="color:var(--azul);text-decoration:none;">← Voltar à Biblioteca</a>
    </div>`;
}

// ── Expor para onclick inline (modo professor) ──────────────────────────────
window.baixarGrupo          = baixarGrupo;
window.abrirVisualizador    = abrirVisualizador;
window.abrirSeletorPaginas  = abrirSeletorPaginas;
window.removerPaginaDoGrupo = removerPaginaDoGrupo;
window.excluirGrupo         = excluirGrupo;
window.iniciarRenomear      = iniciarRenomear;
window.confirmarRenomear    = confirmarRenomear;
window.cancelarRenomear     = cancelarRenomear;
