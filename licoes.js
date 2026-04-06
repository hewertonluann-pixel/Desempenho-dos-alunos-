// licoes.js
// Modal em 2 passos: seleção do tipo → gravação

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  orderBy,
  limit,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

const storage = getStorage();

let mediaRecorder = null;
let gravando = false;
let chunks = [];
let blobAtual = null;
let urlAudioTemp = null;
let timerId = null;
let segundos = 0;
let streamAtual = null;
let tipoSelecionado = null; // 'leitura' | 'metodo'

let alunoIdCache = null;

/* ============================================================
   ESTILOS
   ============================================================ */
function inserirModalLicao() {
  const estilo = document.createElement("style");
  estilo.textContent = `
    /* ── overlay ── */
    .modal-licao {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.78);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
    }
    .modal-licao.ativo { display: flex; }

    /* ── caixa principal ── */
    .modal-licao-conteudo {
      background: linear-gradient(160deg,#020617,#0f172a);
      border-radius: 18px;
      width: 95%;
      max-width: 420px;
      color: #e5e7eb;
      box-shadow: 0 0 40px rgba(14,165,233,0.35);
      border: 1px solid rgba(56,189,248,0.35);
      overflow: hidden;
      position: relative;
    }

    /* ── wrapper deslizante ── */
    .passos-wrapper {
      display: flex;
      width: 200%;
      transition: transform 0.38s cubic-bezier(.4,0,.2,1);
    }
    .passos-wrapper.passo-2 { transform: translateX(-50%); }

    .passo {
      width: 50%;
      flex-shrink: 0;
      padding: 26px 20px 20px;
      box-sizing: border-box;
    }

    /* ── fechar ── */
    .fechar-licao {
      position: absolute;
      top: 10px; right: 14px;
      cursor: pointer;
      font-size: 1.1rem;
      opacity: 0.6;
      z-index: 10;
      line-height: 1;
      transition: opacity .2s;
    }
    .fechar-licao:hover { opacity: 1; }

    /* ══════════════════════════════
       PASSO 1 — seleção
       ══════════════════════════════ */
    .passo-1-titulo {
      text-align: center;
      font-size: 1.15rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 0 0 6px;
    }
    .passo-1-sub {
      text-align: center;
      font-size: 0.8rem;
      color: #64748b;
      margin-bottom: 22px;
    }
    .cards-tipo {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }
    .card-tipo {
      flex: 1;
      padding: 18px 10px;
      border-radius: 14px;
      border: 2px solid rgba(56,189,248,0.2);
      background: rgba(15,23,42,0.7);
      cursor: pointer;
      text-align: center;
      transition: all .25s ease;
      user-select: none;
    }
    .card-tipo:hover {
      border-color: rgba(56,189,248,0.55);
      background: rgba(15,23,42,0.95);
      transform: translateY(-2px);
    }
    .card-tipo.selecionado {
      border-color: #22d3ee;
      background: rgba(14,165,233,0.12);
      box-shadow: 0 0 18px rgba(34,211,238,0.25);
    }
    .card-tipo-icone {
      font-size: 2rem;
      margin-bottom: 8px;
      display: block;
    }
    .card-tipo-titulo {
      font-size: 0.95rem;
      font-weight: 700;
      color: #e2e8f0;
      margin-bottom: 4px;
    }
    .card-tipo.selecionado .card-tipo-titulo { color: #22d3ee; }
    .card-tipo-sub {
      font-size: 0.72rem;
      color: #64748b;
    }
    .card-tipo-check {
      display: none;
      margin: 8px auto 0;
      width: 22px; height: 22px;
      background: #22d3ee;
      border-radius: 50%;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      color: #0f172a;
      font-weight: 800;
    }
    .card-tipo.selecionado .card-tipo-check { display: flex; }

    /* botão continuar */
    .btn-continuar {
      width: 100%;
      padding: 13px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg,#0ea5e9,#0284c7);
      color: #fff;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all .25s;
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
    }
    .btn-continuar.visivel {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    .btn-continuar:hover { filter: brightness(1.12); }

    .btn-cancelar-p1 {
      display: block;
      width: 100%;
      margin-top: 10px;
      padding: 9px;
      border-radius: 8px;
      border: 1px solid #1f2937;
      background: transparent;
      color: #64748b;
      font-size: 0.85rem;
      cursor: pointer;
      transition: color .2s;
    }
    .btn-cancelar-p1:hover { color: #e5e7eb; }

    /* ══════════════════════════════
       PASSO 2 — gravação
       ══════════════════════════════ */
    .tipo-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: .3px;
    }
    .tipo-badge.leitura  { background: rgba(14,165,233,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.35); }
    .tipo-badge.metodo   { background: rgba(168,85,247,0.15); color: #c084fc; border: 1px solid rgba(168,85,247,0.35); }

    /* número da lição */
    .numero-licao-section { margin-bottom: 14px; }
    .numero-licao-label {
      display: block;
      font-size: 0.82rem;
      color: #94a3b8;
      margin-bottom: 7px;
      font-weight: 600;
    }
    .numero-licao-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-numero-menos, .btn-numero-mais {
      width: 40px; height: 40px;
      background: rgba(15,23,42,0.8);
      border: 2px solid rgba(56,189,248,0.3);
      border-radius: 10px;
      color: #22d3ee;
      font-size: 1.3rem;
      font-weight: bold;
      cursor: pointer;
      transition: all .2s;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-numero-menos:hover, .btn-numero-mais:hover {
      background: rgba(14,165,233,0.2);
      border-color: #22d3ee;
      transform: scale(1.06);
    }
    #numeroLicao {
      flex: 1;
      text-align: center;
      font-size: 1.6rem;
      font-weight: bold;
      background: rgba(15,23,42,0.8);
      border: 2px solid rgba(56,189,248,0.3);
      border-radius: 10px;
      color: #22d3ee;
      padding: 8px;
      height: 44px;
    }
    #numeroLicao:focus {
      outline: none;
      border-color: #22d3ee;
      box-shadow: 0 0 10px rgba(34,211,238,0.3);
    }

    /* gravador */
    .gravador-area {
      padding: 12px;
      border-radius: 12px;
      background: radial-gradient(circle at top,#0c2340 0,#020617 60%);
      border: 1px solid rgba(34,211,238,0.3);
      margin-bottom: 14px;
    }
    .gravador-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      margin-bottom: 10px;
      color: #94a3b8;
    }
    #tempoGravacao { font-variant-numeric: tabular-nums; color: #22d3ee; font-weight: 600; }
    .gravador-botoes {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .gravador-botoes button {
      flex: 1;
      border-radius: 999px;
      border: none;
      padding: 9px 0;
      font-size: 0.82rem;
      cursor: pointer;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: filter .2s, transform .1s;
    }
    .gravador-botoes button:disabled { opacity: 0.4; cursor: not-allowed; }
    .gravador-botoes button:not(:disabled):hover { filter: brightness(1.12); }
    .gravador-botoes button:not(:disabled):active { transform: scale(.96); }
    .btn-gravar { background: #ef4444; color: #fff; }
    .btn-parar  { background: #f97316; color: #111827; }
    .btn-ouvir  { background: #22c55e; color: #022c22; }
    .gravador-wave {
      height: 4px;
      border-radius: 999px;
      background: rgba(15,23,42,0.8);
      overflow: hidden;
      position: relative;
      margin-bottom: 8px;
    }
    .gravador-wave span {
      position: absolute; inset: 0;
      background: linear-gradient(90deg,#22d3ee,#a855f7,#22c55e);
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.2s linear;
    }
    .gravador-status { font-size: 0.78rem; color: #64748b; }

    /* comentário colapsável */
    .comentario-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: #64748b;
      cursor: pointer;
      margin-bottom: 6px;
      user-select: none;
      transition: color .2s;
    }
    .comentario-toggle:hover { color: #94a3b8; }
    .comentario-toggle-seta { font-size: 0.65rem; transition: transform .2s; }
    .comentario-toggle.aberto .comentario-toggle-seta { transform: rotate(90deg); }
    .modal-licao-texto {
      width: 100%;
      background: #020617;
      border-radius: 8px;
      border: 1px solid #1f2937;
      color: #e5e7eb;
      padding: 8px;
      font-size: 0.85rem;
      min-height: 60px;
      resize: vertical;
      box-sizing: border-box;
      display: none;
      margin-bottom: 10px;
    }
    .modal-licao-texto.aberto { display: block; }

    /* rodapé passo 2 */
    .rodape-p2 {
      display: flex;
      gap: 10px;
    }
    .btn-voltar {
      flex: 0 0 auto;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #374151;
      background: transparent;
      color: #94a3b8;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all .2s;
      display: flex; align-items: center; gap: 4px;
    }
    .btn-voltar:hover { background: rgba(255,255,255,0.05); color: #e5e7eb; }
    .btn-enviar-licao {
      flex: 1;
      padding: 11px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg,#22d3ee,#0ea5e9);
      color: #0f172a;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      transition: filter .2s;
    }
    .btn-enviar-licao:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      filter: none;
    }
    .btn-enviar-licao:not(:disabled):hover { filter: brightness(1.1); }

    .msg-licao { font-size: 0.8rem; margin-top: 8px; min-height: 16px; }
    .msg-licao.ok  { color: #22c55e; }
    .msg-licao.err { color: #f97316; }

    /* ══════════════════════════════
       MODAL DE VISUALIZAÇÃO
       ══════════════════════════════ */
    .modal-view-licao {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.75);
      display: none;
      align-items: center; justify-content: center;
      z-index: 9998;
      backdrop-filter: blur(3px);
    }
    .modal-view-licao.ativo {
      display: flex;
      animation: aparecerLicao .25s ease;
    }
    @keyframes aparecerLicao {
      from { opacity:0; transform:scale(.98); }
      to   { opacity:1; transform:scale(1); }
    }
    .modal-view-conteudo {
      background: linear-gradient(145deg,#0b1220,#020617);
      border-radius: 16px;
      padding: 24px;
      width: 95%; max-width: 480px;
      color: #e5e7eb;
      border: 2px solid rgba(56,189,248,0.5);
      box-shadow: 0 0 30px rgba(56,189,248,0.3);
      position: relative;
    }
    .modal-view-conteudo h3 {
      margin: 0 0 16px;
      font-size: 1.3rem; color: #38bdf8;
      text-align: center;
      border-bottom: 2px solid rgba(56,189,248,0.3);
      padding-bottom: 12px;
    }
    .modal-view-conteudo p { font-size:.9rem; margin:8px 0; line-height:1.5; }
    .comentario-box {
      background: rgba(56,189,248,0.08);
      border-left: 4px solid #38bdf8;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 12px 0;
      font-size: .9rem;
    }
    .comentario-box strong {
      color: #38bdf8; display:block;
      margin-bottom:6px; font-size:.85rem;
      text-transform:uppercase; letter-spacing:.5px;
    }
    .comentario-professor { background:rgba(250,204,21,.08); border-left-color:#facc15; }
    .comentario-professor strong { color:#facc15; }
    .btn-fechar-view {
      margin-top:16px; width:100%;
      border-radius:10px;
      border:2px solid rgba(56,189,248,0.3);
      padding:12px 0;
      background:rgba(56,189,248,0.1);
      color:#38bdf8; cursor:pointer;
      font-weight:700; font-size:.95rem;
      transition:all .3s;
    }
    .btn-fechar-view:hover {
      background:rgba(56,189,248,0.2);
      border-color:#38bdf8;
      transform:translateY(-2px);
    }
  `;
  document.head.appendChild(estilo);

  /* ── HTML do modal principal ── */
  const modal = document.createElement("div");
  modal.id = "modalLicao";
  modal.className = "modal-licao";
  modal.innerHTML = `
    <div class="modal-licao-conteudo">
      <div class="fechar-licao" id="btnFecharModalLicao">✖</div>

      <div class="passos-wrapper" id="passosWrapper">

        <!-- ══ PASSO 1 ══ -->
        <div class="passo passo-1">
          <p class="passo-1-titulo">Qual lição deseja enviar?</p>
          <p class="passo-1-sub">Selecione o tipo antes de gravar</p>

          <div class="cards-tipo">
            <div class="card-tipo" id="cardLeitura" data-tipo="leitura">
              <span class="card-tipo-icone">📘</span>
              <div class="card-tipo-titulo">Leitura</div>
              <div class="card-tipo-sub">Bona / Solfejo</div>
              <div class="card-tipo-check">✓</div>
            </div>
            <div class="card-tipo" id="cardMetodo" data-tipo="metodo">
              <span class="card-tipo-icone">🎯</span>
              <div class="card-tipo-titulo">Método Instrumental</div>
              <div class="card-tipo-sub">Técnica / Repertório</div>
              <div class="card-tipo-check">✓</div>
            </div>
          </div>

          <button class="btn-continuar" id="btnContinuar">Continuar →</button>
          <button class="btn-cancelar-p1" id="btnCancelarP1">Cancelar</button>
        </div>

        <!-- ══ PASSO 2 ══ -->
        <div class="passo passo-2">
          <div id="tipoBadge" class="tipo-badge leitura">📘 Leitura</div>

          <div class="numero-licao-section">
            <label class="numero-licao-label">Número da lição:</label>
            <div class="numero-licao-input-wrapper">
              <button type="button" class="btn-numero-menos" id="btnNumeroMenos">−</button>
              <input type="number" id="numeroLicao" min="1" max="200" value="1">
              <button type="button" class="btn-numero-mais" id="btnNumeroMais">+</button>
            </div>
          </div>

          <div class="gravador-area">
            <div class="gravador-top">
              <span>🎧 Gravador</span>
              <span id="tempoGravacao">00:00</span>
            </div>
            <div class="gravador-botoes">
              <button id="btnGravarLicao" class="btn-gravar">● Gravar</button>
              <button id="btnPararLicao" class="btn-parar" disabled>■ Parar</button>
              <button id="btnOuvirLicao" class="btn-ouvir" disabled>▶ Ouvir</button>
            </div>
            <div class="gravador-wave"><span id="waveBar"></span></div>
            <div class="gravador-status" id="statusGravador">Pronto para gravar.</div>
          </div>

          <div class="comentario-toggle" id="comentarioToggle">
            <span class="comentario-toggle-seta">▶</span>
            Adicionar comentário opcional
          </div>
          <textarea id="textoLicao" class="modal-licao-texto" placeholder="Dúvidas, dificuldades, observações..."></textarea>

          <div class="rodape-p2">
            <button class="btn-voltar" id="btnVoltarP1">← Voltar</button>
            <button class="btn-enviar-licao" id="btnEnviarLicao" disabled>Enviar ✓</button>
          </div>

          <div class="msg-licao" id="msgLicao"></div>
        </div>

      </div>
    </div>
  `;
  document.body.appendChild(modal);

  /* ── modal de visualização ── */
  const modalView = document.createElement("div");
  modalView.id = "modalViewLicao";
  modalView.className = "modal-view-licao";
  modalView.innerHTML = `
    <div class="modal-view-conteudo">
      <h3>📜 Detalhes da lição</h3>
      <p id="viewLicaoInfo"></p>
      <p id="viewLicaoTexto"></p>
      <p id="viewLicaoObsProf"></p>
      <audio id="viewLicaoAudio" controls style="width:100%;margin-top:6px;"></audio>
      <button class="btn-fechar-view" id="btnFecharViewLicao">Fechar</button>
    </div>
  `;
  document.body.appendChild(modalView);

  /* ── eventos passo 1 ── */
  document.getElementById("btnFecharModalLicao").onclick = fecharModalLicao;
  document.getElementById("btnCancelarP1").onclick = fecharModalLicao;

  ["cardLeitura", "cardMetodo"].forEach(id => {
    document.getElementById(id).onclick = () => selecionarTipo(id === "cardLeitura" ? "leitura" : "metodo");
  });

  document.getElementById("btnContinuar").onclick = irParaPasso2;

  /* ── eventos passo 2 ── */
  document.getElementById("btnVoltarP1").onclick = voltarParaPasso1;
  document.getElementById("btnGravarLicao").onclick = iniciarGravacao;
  document.getElementById("btnPararLicao").onclick = pararGravacao;
  document.getElementById("btnOuvirLicao").onclick = ouvirGravacao;
  document.getElementById("btnEnviarLicao").onclick = enviarLicao;

  /* ── número da lição ── */
  document.getElementById("btnNumeroMenos").onclick = () => {
    const el = document.getElementById("numeroLicao");
    const v = parseInt(el.value) || 1;
    if (v > 1) el.value = v - 1;
  };
  document.getElementById("btnNumeroMais").onclick = () => {
    const el = document.getElementById("numeroLicao");
    const v = parseInt(el.value) || 1;
    if (v < 200) el.value = v + 1;
  };

  /* ── comentário colapsável ── */
  const toggleComentario = document.getElementById("comentarioToggle");
  const textareaComentario = document.getElementById("textoLicao");
  toggleComentario.onclick = () => {
    const aberto = toggleComentario.classList.toggle("aberto");
    textareaComentario.classList.toggle("aberto", aberto);
  };

  /* ── modal de visualização ── */
  const fecharModalView = () => modalView.classList.remove("ativo");
  document.getElementById("btnFecharViewLicao").addEventListener("click", fecharModalView);
  modalView.addEventListener("click", e => { if (e.target === modalView) fecharModalView(); });
}

/* ============================================================
   NAVEGAÇÃO ENTRE PASSOS
   ============================================================ */

function selecionarTipo(tipo) {
  tipoSelecionado = tipo;
  document.getElementById("cardLeitura").classList.toggle("selecionado", tipo === "leitura");
  document.getElementById("cardMetodo").classList.toggle("selecionado", tipo === "metodo");
  document.getElementById("btnContinuar").classList.add("visivel");
}

async function irParaPasso2() {
  if (!tipoSelecionado) return;

  // Atualizar badge
  const badge = document.getElementById("tipoBadge");
  if (tipoSelecionado === "leitura") {
    badge.className = "tipo-badge leitura";
    badge.textContent = "📘 Leitura";
  } else {
    badge.className = "tipo-badge metodo";
    badge.textContent = "🎯 Método Instrumental";
  }

  // Buscar próximo número da lição automaticamente
  await preencherProximoNumero();

  // Deslizar para passo 2
  document.getElementById("passosWrapper").classList.add("passo-2");
}

function voltarParaPasso1() {
  // Parar gravação se em andamento
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  resetarGravador();
  document.getElementById("passosWrapper").classList.remove("passo-2");
}

async function preencherProximoNumero() {
  const numeroInput = document.getElementById("numeroLicao");
  if (!numeroInput) return;

  let usuario;
  try { usuario = JSON.parse(localStorage.getItem("usuarioAtual")); } catch { usuario = null; }
  if (!usuario || !usuario.nome) { numeroInput.value = 1; return; }

  try {
    const q = query(
      collection(db, "licoes"),
      where("alunoNome", "==", usuario.nome),
      where("tipo", "==", tipoSelecionado)
    );
    const snap = await getDocs(q);
    if (snap.empty) { numeroInput.value = 1; return; }

    let maximo = 0;
    snap.forEach(d => { if (d.data().numero > maximo) maximo = d.data().numero; });
    numeroInput.value = maximo + 1;
  } catch {
    numeroInput.value = 1;
  }
}

/* ============================================================
   ABRIR / FECHAR
   ============================================================ */

function abrirModalEnviarLicao() {
  const modal = document.getElementById("modalLicao");
  if (!modal) return;
  resetarEstadoCompleto();
  modal.classList.add("ativo");
}

function fecharModalLicao() {
  const modal = document.getElementById("modalLicao");
  if (modal) modal.classList.remove("ativo");
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  resetarEstadoCompleto();
}

function resetarEstadoCompleto() {
  tipoSelecionado = null;
  document.getElementById("passosWrapper")?.classList.remove("passo-2");
  document.getElementById("cardLeitura")?.classList.remove("selecionado");
  document.getElementById("cardMetodo")?.classList.remove("selecionado");
  document.getElementById("btnContinuar")?.classList.remove("visivel");
  resetarGravador();
}

function resetarGravador() {
  gravando = false;
  chunks = [];
  blobAtual = null;

  if (streamAtual) {
    streamAtual.getTracks().forEach(t => t.stop());
    streamAtual = null;
  }
  if (urlAudioTemp) {
    URL.revokeObjectURL(urlAudioTemp);
    urlAudioTemp = null;
  }
  if (timerId) { clearInterval(timerId); timerId = null; }
  segundos = 0;

  const el = id => document.getElementById(id);
  if (el("statusGravador"))  el("statusGravador").textContent  = "Pronto para gravar.";
  if (el("tempoGravacao"))   el("tempoGravacao").textContent   = "00:00";
  if (el("waveBar"))         el("waveBar").style.transform     = "scaleX(0)";
  if (el("btnGravarLicao"))  el("btnGravarLicao").disabled     = false;
  if (el("btnPararLicao"))   el("btnPararLicao").disabled      = true;
  if (el("btnOuvirLicao"))   el("btnOuvirLicao").disabled      = true;
  if (el("btnEnviarLicao"))  el("btnEnviarLicao").disabled     = true;
  if (el("msgLicao"))        { el("msgLicao").textContent = ""; el("msgLicao").className = "msg-licao"; }
  if (el("textoLicao"))      el("textoLicao").value            = "";

  // fechar comentário se estava aberto
  el("comentarioToggle")?.classList.remove("aberto");
  el("textoLicao")?.classList.remove("aberto");
}

/* ============================================================
   GRAVAÇÃO
   ============================================================ */

function atualizarTempo() {
  segundos++;
  const m = String(Math.floor(segundos / 60)).padStart(2, "0");
  const s = String(segundos % 60).padStart(2, "0");
  const kbEstimado = Math.round(segundos * 3);
  const mbEstimado = (kbEstimado / 1024).toFixed(2);

  const tempoEl = document.getElementById("tempoGravacao");
  if (tempoEl) tempoEl.textContent = kbEstimado < 1024
    ? `${m}:${s} (~${kbEstimado}KB)`
    : `${m}:${s} (~${mbEstimado}MB)`;

  const wave = document.getElementById("waveBar");
  if (wave) wave.style.transform = `scaleX(${Math.min(1, segundos / 30)})`;

  const status = document.getElementById("statusGravador");
  if (kbEstimado > 4 * 1024 && status) status.textContent = "⚠ Perto do limite de 5MB. Finalize em breve.";
}

async function iniciarGravacao() {
  const status  = document.getElementById("statusGravador");
  const btnGrav = document.getElementById("btnGravarLicao");
  const btnPar  = document.getElementById("btnPararLicao");
  const btnOuv  = document.getElementById("btnOuvirLicao");
  const msg     = document.getElementById("msgLicao");

  if (!navigator.mediaDevices?.getUserMedia) {
    if (msg) { msg.textContent = "Seu navegador não suporta gravação."; msg.className = "msg-licao err"; }
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
    });
    streamAtual = stream;

    let options = { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 24000 };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) options = { mimeType: "audio/webm", audioBitsPerSecond: 24000 };

    mediaRecorder = new MediaRecorder(stream, options);
    chunks = []; blobAtual = null; segundos = 0; gravando = true;

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    mediaRecorder.onstop = () => {
      gravando = false;
      if (streamAtual) { streamAtual.getTracks().forEach(t => t.stop()); streamAtual = null; }

      const mime = mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mime });

      if (blob.size < 500) {
        if (status) status.textContent = "⚠ Áudio muito curto. Tente novamente.";
        blobAtual = null; return;
      }
      const tamanhoMB = (blob.size / 1024 / 1024).toFixed(2);
      if (blob.size > 5 * 1024 * 1024) {
        if (status) status.textContent = `⚠ Áudio muito grande (${tamanhoMB}MB). Máx: 5MB.`;
        blobAtual = null; return;
      }

      blobAtual = blob;
      urlAudioTemp = URL.createObjectURL(blob);
      if (btnOuv) btnOuv.disabled = false;
      if (status) status.textContent = `Gravação concluída! (${tamanhoMB}MB) Ouça antes de enviar.`;

      // Habilitar envio
      const btnEnv = document.getElementById("btnEnviarLicao");
      if (btnEnv) btnEnv.disabled = false;
    };

    mediaRecorder.start(250);
    if (status)  status.textContent  = "Gravando... fale normalmente.";
    if (btnGrav) btnGrav.disabled = true;
    if (btnPar)  btnPar.disabled  = false;
    if (btnOuv)  btnOuv.disabled  = true;
    if (timerId) clearInterval(timerId);
    timerId = setInterval(atualizarTempo, 1000);

  } catch {
    if (msg) { msg.textContent = "Não foi possível acessar o microfone."; msg.className = "msg-licao err"; }
  }
}

function pararGravacao() {
  const status  = document.getElementById("statusGravador");
  const btnGrav = document.getElementById("btnGravarLicao");
  const btnPar  = document.getElementById("btnPararLicao");

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    if (btnPar)  btnPar.disabled  = true;
    if (btnGrav) btnGrav.disabled = false;
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (status)  status.textContent = "Processando áudio...";
  }
}

function ouvirGravacao() {
  if (!blobAtual || !urlAudioTemp) return;
  new Audio(urlAudioTemp).play();
}

/* ============================================================
   ENVIO
   ============================================================ */

async function enviarLicao() {
  const tipo   = tipoSelecionado;
  const numero = parseInt(document.getElementById("numeroLicao")?.value, 10);
  const texto  = document.getElementById("textoLicao")?.value.trim();
  const msg    = document.getElementById("msgLicao");

  if (msg) { msg.textContent = ""; msg.className = "msg-licao"; }

  if (!blobAtual) {
    if (msg) { msg.textContent = "Grave um áudio antes de enviar."; msg.className = "msg-licao err"; }
    return;
  }
  if (!numero || numero <= 0) {
    if (msg) { msg.textContent = "Informe o número da lição."; msg.className = "msg-licao err"; }
    return;
  }

  let usuario;
  try { usuario = JSON.parse(localStorage.getItem("usuarioAtual")); } catch { usuario = null; }
  if (!usuario?.nome) {
    if (msg) { msg.textContent = "Sessão inválida. Faça login novamente."; msg.className = "msg-licao err"; }
    return;
  }

  if (msg) msg.textContent = "Enviando lição...";

  const alunoNome = usuario.nome;
  let alunoId = alunoIdCache;

  if (!alunoId) {
    try {
      const q = query(collection(db, "alunos"), where("nome", "==", alunoNome));
      const snap = await getDocs(q);
      if (snap.empty) {
        if (msg) { msg.textContent = "Aluno não encontrado."; msg.className = "msg-licao err"; }
        return;
      }
      alunoId = snap.docs[0].id;
      alunoIdCache = alunoId;
    } catch {
      if (msg) { msg.textContent = "Erro ao buscar dados do aluno."; msg.className = "msg-licao err"; }
      return;
    }
  }

  const caminho   = `licoes/${alunoId}/${tipo}_${numero}_${Date.now()}.webm`;
  const arquivoRef = ref(storage, caminho);

  try {
    if (msg) msg.textContent = "Enviando áudio...";
    await uploadBytes(arquivoRef, blobAtual, { contentType: blobAtual.type || "audio/webm" });

    if (msg) msg.textContent = "Obtendo URL...";
    const audioURL = await getDownloadURL(arquivoRef);

    if (msg) msg.textContent = "Salvando lição...";
    const agora     = new Date();
    const tipoTexto = tipo === "leitura" ? "Leitura" : "Método Instrumental";
    const titulo    = `${tipoTexto} nº ${numero}`;

    await addDoc(collection(db, "licoes"), {
      alunoId, alunoNome, aluno: alunoNome,
      tipo, numero, texto, audioURL, titulo,
      status: "pendente",
      observacaoProfessor: "",
      criadoEm: agora.toISOString(),
      dataEnvio: Timestamp.fromDate(agora)
    });

    if (msg) { msg.textContent = "✅ Lição enviada para avaliação!"; msg.className = "msg-licao ok"; }

    setTimeout(() => {
      fecharModalLicao();
      carregarLicoesAluno(alunoNome);
    }, 1200);

  } catch (erro) {
    console.error("❌ Erro ao enviar lição:", erro);
    let mensagemErro = "Erro ao enviar lição.";
    if (erro.code === "storage/unauthorized")  mensagemErro = "Erro de permissão no Storage.";
    else if (erro.code === "storage/canceled") mensagemErro = "Upload cancelado.";
    else if (erro.message?.includes("CORS"))   mensagemErro = "Erro de CORS. Tente novamente.";
    else if (erro.message?.includes("network")) mensagemErro = "Erro de rede. Verifique sua conexão.";
    if (msg) { msg.textContent = mensagemErro; msg.className = "msg-licao err"; }
  }
}

/* ============================================================
   LISTAGEM DE LIÇÕES
   ============================================================ */

export async function carregarLicoesAluno(nomeAluno) {
  const lista = document.getElementById("listaLicoes");
  if (!lista) return;

  lista.innerHTML = "Carregando lições...";

  const q = query(collection(db, "licoes"), where("alunoNome", "==", nomeAluno));
  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = "<p style='font-size:0.9rem;opacity:0.8;'>Nenhuma lição enviada ainda.</p>";
    return;
  }

  lista.innerHTML = "";

  snap.forEach(docSnap => {
    const l  = docSnap.data();
    const id = docSnap.id;

    if (l.alunoNome !== nomeAluno && l.aluno !== nomeAluno) return;

    const card = document.createElement("div");
    card.className = "card-licao";

    const s = (l.status || "").toLowerCase();
    const statusClass = s === "pendente" ? "pendente"
      : (s === "aprovado" || s === "aprovada") ? "aprovada" : "reprovada";
    const statusTexto = s === "pendente" ? "PENDENTE"
      : (s === "aprovado" || s === "aprovada") ? "APROVADA" : "REPROVADA";

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-delete-licao";
    btnDelete.textContent = "×";
    btnDelete.onclick = async e => {
      e.stopPropagation();
      const tipoLabel = l.tipo === "metodo" ? "Método Instrumental" : "Leitura";
      if (confirm(`Deseja realmente excluir a lição ${tipoLabel} nº ${l.numero}?`)) {
        try {
          await deleteDoc(doc(db, "licoes", id));
          card.style.opacity = "0";
          card.style.transform = "scale(0.8)";
          setTimeout(() => {
            card.remove();
            if (lista.children.length === 0)
              lista.innerHTML = "<p style='font-size:0.9rem;opacity:0.8;'>Nenhuma lição enviada ainda.</p>";
          }, 300);
        } catch {
          alert("Erro ao deletar lição. Tente novamente.");
        }
      }
    };

    const tipoLabel = l.tipo === "metodo" ? "MÉTODO INSTRUMENTAL" : "LEITURA";
    card.innerHTML = `
      <div class="status-badge ${statusClass}">${statusTexto}</div>
      <div class="card-licao-content">
        <div class="licao-tipo">${tipoLabel}</div>
        <div class="licao-numero">Nº ${l.numero}</div>
      </div>
      <button class="btn-ver-detalhes" onclick="abrirLicao('${id}')">Detalhes</button>
    `;
    card.insertBefore(btnDelete, card.firstChild);
    lista.appendChild(card);
  });
}

/* ============================================================
   VISUALIZAÇÃO DE UMA LIÇÃO
   ============================================================ */

async function abrirLicao(id) {
  const snap = await getDoc(doc(db, "licoes", id));
  if (!snap.exists()) { alert("Lição não encontrada."); return; }

  const l        = snap.data();
  const modal    = document.getElementById("modalViewLicao");
  const infoEl   = document.getElementById("viewLicaoInfo");
  const textoEl  = document.getElementById("viewLicaoTexto");
  const obsProfEl = document.getElementById("viewLicaoObsProf");
  const audioEl  = document.getElementById("viewLicaoAudio");

  if (!modal || !infoEl || !audioEl) return;

  const data = l.criadoEm ? new Date(l.criadoEm).toLocaleString("pt-BR") : "";
  const tipoLabel = l.tipo === "metodo" ? "Método Instrumental" : "Leitura";

  infoEl.innerHTML   = `<strong>${tipoLabel} — lição nº ${l.numero}</strong><br><small style="opacity:.7">${data}</small>`;
  textoEl.innerHTML  = l.texto
    ? `<div class="comentario-box"><strong>💬 Comentário do aluno</strong>${l.texto}</div>` : "";
  obsProfEl.innerHTML = l.observacaoProfessor
    ? `<div class="comentario-box comentario-professor"><strong>⭐ Observações do professor</strong>${l.observacaoProfessor}</div>` : "";

  audioEl.src = l.audioURL || "";
  audioEl.load();
  modal.classList.add("ativo");
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => inserirModalLicao());

window.abrirModalEnviarLicao = abrirModalEnviarLicao;
window.abrirLicao = abrirLicao;
