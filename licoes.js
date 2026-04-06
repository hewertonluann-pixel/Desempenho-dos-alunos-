// licoes.js
// Modal premium de envio de lição com gravação de áudio + texto
// Agora usando coleção única "licoes" (envio + listagem)

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
let streamAtual = null; // FIX: guardar referência do stream para liberar o microfone

// Cache do ID do aluno para evitar múltiplas queries
let alunoIdCache = null;

/* ==========================
   ESTILOS E MODAL DE ENVIO
   ========================== */
function inserirModalLicao() {
  const estilo = document.createElement("style");
  estilo.textContent = `
    .modal-licao {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }
    .modal-licao.ativo {
      display: flex;
      animation: aparecerLicao 0.25s ease;
    }
    @keyframes aparecerLicao {
      from { opacity: 0; transform: scale(0.98); }
      to   { opacity: 1; transform: scale(1); }
    }
    .modal-licao-conteudo {
      background: linear-gradient(145deg,#020617,#111827);
      border-radius: 14px;
      padding: 20px 18px;
      width: 95%;
      max-width: 420px;
      color: #e5e7eb;
      box-shadow: 0 0 25px rgba(15,118,255,0.5);
      border: 1px solid rgba(56,189,248,0.4);
      position: relative;
    }
    .modal-licao-conteudo h2 {
      margin: 0 0 8px;
      font-size: 1.1rem;
      color: #22d3ee;
    }
    .modal-licao-sub {
      font-size: 0.8rem;
      opacity: 0.8;
      margin-bottom: 12px;
    }
    /* Toggle de tipo de lição */
    .tipo-licao-section {
      margin-bottom: 14px;
    }
    .tipo-licao-label {
      display: block;
      font-size: 0.85rem;
      color: #94a3b8;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .toggle-tipo-licao {
      display: flex;
      gap: 8px;
    }
    .toggle-btn {
      flex: 1;
      padding: 10px 16px;
      background: rgba(15, 23, 42, 0.8);
      border: 2px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      color: #94a3b8;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .toggle-btn:hover {
      border-color: rgba(56, 189, 248, 0.6);
      background: rgba(15, 23, 42, 1);
    }
    .toggle-btn.active {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      border-color: #22d3ee;
      color: #fff;
      box-shadow: 0 0 15px rgba(14, 165, 233, 0.4);
    }
    
    /* Número da lição */
    .numero-licao-section {
      margin-bottom: 14px;
    }
    .numero-licao-label {
      display: block;
      font-size: 0.85rem;
      color: #94a3b8;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .numero-licao-input-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-numero-menos,
    .btn-numero-mais {
      width: 40px;
      height: 40px;
      background: rgba(15, 23, 42, 0.8);
      border: 2px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      color: #22d3ee;
      font-size: 1.2rem;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .btn-numero-menos:hover,
    .btn-numero-mais:hover {
      background: rgba(14, 165, 233, 0.2);
      border-color: #22d3ee;
      transform: scale(1.05);
    }
    .btn-numero-menos:active,
    .btn-numero-mais:active {
      transform: scale(0.95);
    }
    #numeroLicao {
      flex: 1;
      text-align: center;
      font-size: 1.5rem;
      font-weight: bold;
      background: rgba(15, 23, 42, 0.8);
      border: 2px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      color: #22d3ee;
      padding: 10px;
      height: 40px;
    }
    #numeroLicao:focus {
      outline: none;
      border-color: #22d3ee;
      box-shadow: 0 0 10px rgba(34, 211, 238, 0.3);
    }
    .modal-licao-texto {
      width: 100%;
      margin-top: 6px;
      background: #020617;
      border-radius: 8px;
      border: 1px solid #1f2937;
      color: #e5e7eb;
      padding: 8px;
      font-size: 0.85rem;
      min-height: 60px;
      resize: vertical;
    }
    .gravador-area {
      margin-top: 12px;
      padding: 10px;
      border-radius: 10px;
      background: radial-gradient(circle at top, #0ea5e9 0, #020617 55%);
      border: 1px solid rgba(34,211,238,0.4);
    }
    .gravador-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      margin-bottom: 8px;
    }
    .gravador-status {
      font-size: 0.8rem;
      opacity: 0.9;
    }
    .gravador-botoes {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-bottom: 6px;
    }
    .gravador-botoes button {
      flex: 1;
      border-radius: 999px;
      border: none;
      padding: 8px 0;
      font-size: 0.85rem;
      cursor: pointer;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .btn-gravar { background: #ef4444; color: #fff; }
    .btn-parar  { background: #f97316; color: #111827; }
    .btn-ouvir  { background: #22c55e; color: #022c22; }
    .gravador-wave {
      height: 4px;
      border-radius: 999px;
      background: rgba(15,23,42,0.7);
      overflow: hidden;
      position: relative;
    }
    .gravador-wave span {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,#22d3ee,#a855f7,#22c55e);
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.2s linear;
    }
    .rodape-modal-licao {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 12px;
    }
    .rodape-modal-licao button {
      flex: 1;
      border-radius: 8px;
      border: none;
      padding: 9px 0;
      font-size: 0.9rem;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-enviar-licao {
      background: #22d3ee;
      color: #0f172a;
    }
    .btn-cancelar-licao {
      background: #111827;
      color: #e5e7eb;
      border: 1px solid #374151;
    }
    .fechar-licao {
      position: absolute;
      top: 6px;
      right: 10px;
      cursor: pointer;
      font-size: 1.1rem;
      opacity: 0.7;
    }
    .fechar-licao:hover {
      opacity: 1;
    }
    .msg-licao {
      font-size: 0.8rem;
      margin-top: 6px;
      min-height: 16px;
    }
    .msg-licao.ok {
      color: #22c55e;
    }
    .msg-licao.err {
      color: #f97316;
    }

    /* Modal de visualização da lição */
    .modal-view-licao {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      backdrop-filter: blur(3px);
    }
    .modal-view-licao.ativo {
      display: flex;
      animation: aparecerLicao 0.25s ease;
    }
    .modal-view-conteudo {
      background: linear-gradient(145deg, #0b1220, #020617);
      border-radius: 16px;
      padding: 24px;
      width: 95%;
      max-width: 480px;
      color: #e5e7eb;
      border: 2px solid rgba(56,189,248,0.5);
      box-shadow: 0 0 30px rgba(56, 189, 248, 0.3);
      position: relative;
    }
    .modal-view-conteudo h3 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 1.3rem;
      color: #38bdf8;
      text-align: center;
      border-bottom: 2px solid rgba(56,189,248,0.3);
      padding-bottom: 12px;
    }
    .modal-view-conteudo p {
      font-size: 0.9rem;
      margin: 8px 0;
      line-height: 1.5;
    }
    .comentario-box {
      background: rgba(56, 189, 248, 0.08);
      border-left: 4px solid #38bdf8;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 12px 0;
      font-size: 0.9rem;
    }
    .comentario-box strong {
      color: #38bdf8;
      display: block;
      margin-bottom: 6px;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .comentario-professor {
      background: rgba(250, 204, 21, 0.08);
      border-left: 4px solid #facc15;
    }
    .comentario-professor strong {
      color: #facc15;
    }
    .btn-fechar-view {
      margin-top: 16px;
      width: 100%;
      border-radius: 10px;
      border: 2px solid rgba(56,189,248,0.3);
      padding: 12px 0;
      background: rgba(56, 189, 248, 0.1);
      color: #38bdf8;
      cursor: pointer;
      font-weight: 700;
      font-size: 0.95rem;
      transition: all 0.3s ease;
    }
    .btn-fechar-view:hover {
      background: rgba(56, 189, 248, 0.2);
      border-color: #38bdf8;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(estilo);

  const modal = document.createElement("div");
  modal.id = "modalLicao";
  modal.className = "modal-licao";
  modal.innerHTML = `
    <div class="modal-licao-conteudo">
      <div class="fechar-licao" id="btnFecharModalLicao">✖</div>
      <h2>🎤 Enviar lição</h2>
      <div class="modal-licao-sub">
        Grave ou envie um áudio com a lição que você estudou. Seu professor irá ouvir e aprovar.
      </div>

      <!-- Toggle de tipo de lição -->
      <div class="tipo-licao-section">
        <label class="tipo-licao-label">Tipo de lição:</label>
        <div class="toggle-tipo-licao">
          <button type="button" class="toggle-btn active" data-tipo="leitura" id="btnLeitura">
            📘 Leitura (Bona)
          </button>
          <button type="button" class="toggle-btn" data-tipo="metodo" id="btnMetodo">
            🎯 Método
          </button>
        </div>
      </div>

      <!-- Número da lição -->
      <div class="numero-licao-section">
        <label class="numero-licao-label">Número da lição:</label>
        <div class="numero-licao-input-wrapper">
          <button type="button" class="btn-numero-menos" id="btnNumeroMenos">−</button>
          <input type="number" id="numeroLicao" min="1" max="200" value="1">
          <button type="button" class="btn-numero-mais" id="btnNumeroMais">+</button>
        </div>
      </div>
      
      <input type="hidden" id="tipoLicao" value="leitura">

      <textarea id="textoLicao" class="modal-licao-texto" placeholder="Comentário opcional sobre a lição (dúvidas, dificuldades, etc.)"></textarea>

      <div class="gravador-area">
        <div class="gravador-top">
          <span>🎧 Gravador de áudio</span>
          <span id="tempoGravacao">00:00</span>
        </div>

        <div class="gravador-botoes">
          <button id="btnGravarLicao" class="btn-gravar">● Gravar</button>
          <button id="btnPararLicao" class="btn-parar" disabled>■ Parar</button>
          <button id="btnOuvirLicao" class="btn-ouvir" disabled>▶️ Ouvir</button>
        </div>

        <div class="gravador-wave">
          <span id="waveBar"></span>
        </div>

        <div class="gravador-status" id="statusGravador">Pronto para gravar.</div>
      </div>

      <div class="rodape-modal-licao">
        <button class="btn-cancelar-licao" id="btnCancelarLicao">Cancelar</button>
        <button class="btn-enviar-licao" id="btnEnviarLicao">Enviar</button>
      </div>

      <div class="msg-licao" id="msgLicao"></div>
    </div>
  `;
  document.body.appendChild(modal);

  // Modal de visualização de lição
  const modalView = document.createElement("div");
  modalView.id = "modalViewLicao";
  modalView.className = "modal-view-licao";
  modalView.innerHTML = `
    <div class="modal-view-conteudo">
      <h3>📜 Detalhes da lição</h3>
      <p id="viewLicaoInfo"></p>
      <p id="viewLicaoTexto"></p>
      <p id="viewLicaoObsProf"></p>
      <audio id="viewLicaoAudio" controls style="width:100%; margin-top:6px;"></audio>
      <button class="btn-fechar-view" id="btnFecharViewLicao">Fechar</button>
    </div>
  `;
  document.body.appendChild(modalView);

  // Eventos
  document.getElementById("btnFecharModalLicao").onclick = fecharModalLicao;
  document.getElementById("btnCancelarLicao").onclick = fecharModalLicao;
  document.getElementById("btnGravarLicao").onclick = iniciarGravacao;
  document.getElementById("btnPararLicao").onclick = pararGravacao;
  document.getElementById("btnOuvirLicao").onclick = ouvirGravacao;
  document.getElementById("btnEnviarLicao").onclick = enviarLicao;
  
  // Toggle de tipo de lição
  const btnLeitura = document.getElementById("btnLeitura");
  const btnMetodo = document.getElementById("btnMetodo");
  const tipoLicaoHidden = document.getElementById("tipoLicao");
  
  btnLeitura.onclick = () => {
    btnLeitura.classList.add("active");
    btnMetodo.classList.remove("active");
    tipoLicaoHidden.value = "leitura";
  };
  
  btnMetodo.onclick = () => {
    btnMetodo.classList.add("active");
    btnLeitura.classList.remove("active");
    tipoLicaoHidden.value = "metodo";
  };
  
  // Botões de incremento/decremento de número
  const numeroInput = document.getElementById("numeroLicao");
  const btnNumeroMenos = document.getElementById("btnNumeroMenos");
  const btnNumeroMais = document.getElementById("btnNumeroMais");
  
  btnNumeroMenos.onclick = () => {
    const valorAtual = parseInt(numeroInput.value) || 1;
    if (valorAtual > 1) {
      numeroInput.value = valorAtual - 1;
    }
  };
  
  btnNumeroMais.onclick = () => {
    const valorAtual = parseInt(numeroInput.value) || 1;
    if (valorAtual < 200) {
      numeroInput.value = valorAtual + 1;
    }
  };
  
  // Fechar modal de visualização
  const fecharModalView = () => {
    modalView.classList.remove("ativo");
  };
  
  document.getElementById("btnFecharViewLicao").addEventListener("click", fecharModalView);
  
  // Fechar ao clicar fora do conteúdo
  modalView.addEventListener("click", (e) => {
    if (e.target === modalView) {
      fecharModalView();
    }
  });
}

function abrirModalEnviarLicao() {
  const modal = document.getElementById("modalLicao");
  if (!modal) return;
  resetarEstado();
  modal.classList.add("ativo");
}

function fecharModalLicao() {
  const modal = document.getElementById("modalLicao");
  if (modal) modal.classList.remove("ativo");
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  resetarEstado();
}

function resetarEstado() {
  gravando = false;
  chunks = [];
  blobAtual = null;
  // FIX: liberar microfone ao resetar
  if (streamAtual) {
    streamAtual.getTracks().forEach(track => track.stop());
    streamAtual = null;
  }
  if (urlAudioTemp) {
    URL.revokeObjectURL(urlAudioTemp);
    urlAudioTemp = null;
  }
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  segundos = 0;

  const status = document.getElementById("statusGravador");
  const tempo = document.getElementById("tempoGravacao");
  const wave = document.getElementById("waveBar");
  const btnGravar = document.getElementById("btnGravarLicao");
  const btnParar = document.getElementById("btnPararLicao");
  const btnOuvir = document.getElementById("btnOuvirLicao");
  const msg = document.getElementById("msgLicao");

  const tipo = document.getElementById("tipoLicao");
  const numero = document.getElementById("numeroLicao");
  const texto = document.getElementById("textoLicao");

  if (tipo) tipo.value = "leitura";
  if (numero) numero.value = 1;
  if (texto) texto.value = "";

  if (status) status.textContent = "Pronto para gravar.";
  if (tempo) tempo.textContent = "00:00";
  if (wave) wave.style.transform = "scaleX(0)";
  if (btnGravar) btnGravar.disabled = false;
  if (btnParar) btnParar.disabled = true;
  if (btnOuvir) btnOuvir.disabled = true;
  if (msg) {
    msg.textContent = "";
    msg.className = "msg-licao";
  }
}

function atualizarTempo() {
  segundos++;
  const m = String(Math.floor(segundos / 60)).padStart(2, "0");
  const s = String(segundos % 60).padStart(2, "0");
  
  // Estimar tamanho do arquivo (24kbps = 3KB/s aproximadamente)
  const tamanhoEstimadoKB = Math.round(segundos * 3);
  const tamanhoEstimadoMB = (tamanhoEstimadoKB / 1024).toFixed(2);
  
  const tempoEl = document.getElementById("tempoGravacao");
  if (tempoEl) {
    if (tamanhoEstimadoKB < 1024) {
      tempoEl.textContent = `${m}:${s} (~${tamanhoEstimadoKB}KB)`;
    } else {
      tempoEl.textContent = `${m}:${s} (~${tamanhoEstimadoMB}MB)`;
    }
  }

  const wave = document.getElementById("waveBar");
  if (wave) {
    wave.style.transform = `scaleX(${Math.min(1, segundos / 30)})`;
  }
  
  // Alertar se estiver perto do limite (5MB)
  const status = document.getElementById("statusGravador");
  if (tamanhoEstimadoKB > 4 * 1024 && status) {
    status.textContent = "⚠ Perto do limite de 5MB. Finalize em breve.";
  }
}

async function iniciarGravacao() {
  const status = document.getElementById("statusGravador");
  const btnGravar = document.getElementById("btnGravarLicao");
  const btnParar = document.getElementById("btnPararLicao");
  const btnOuvir = document.getElementById("btnOuvirLicao");
  const msg = document.getElementById("msgLicao");

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (msg) {
      msg.textContent = "Seu navegador não suporta gravação. Use outro navegador.";
      msg.className = "msg-licao err";
    }
    return;
  }

  try {
    // Configurar áudio com qualidade otimizada (menor tamanho)
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000  // Reduz de 48kHz para 16kHz (suficiente para voz)
      }
    });

    // FIX: guardar referência do stream para liberar o microfone depois
    streamAtual = stream;
    
    // Tentar usar codec mais eficiente
    let options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 24000 }; // 24kbps (baixo)
    
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'audio/webm', audioBitsPerSecond: 24000 };
    }
    
    mediaRecorder = new MediaRecorder(stream, options);
    chunks = [];
    blobAtual = null;
    segundos = 0;
    gravando = true;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // FIX: controlar gravando=false apenas aqui, no evento assíncrono correto
      gravando = false;

      // FIX: liberar o microfone assim que a gravação terminar
      if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop());
        streamAtual = null;
      }

      const mime = mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mime });

      if (blob.size < 500) {
        if (status) status.textContent = "⚠ Áudio muito curto ou corrompido. Tente novamente.";
        blobAtual = null;
        return;
      }
      
      // Verificar tamanho máximo (5MB)
      const tamanhoMB = (blob.size / 1024 / 1024).toFixed(2);
      if (blob.size > 5 * 1024 * 1024) {
        if (status) status.textContent = `⚠ Áudio muito grande (${tamanhoMB}MB). Máximo: 5MB. Grave um áudio mais curto.`;
        blobAtual = null;
        return;
      }

      blobAtual = blob;
      urlAudioTemp = URL.createObjectURL(blob);

      if (btnOuvir) btnOuvir.disabled = false;
      if (status) status.textContent = `Gravação concluída! (${tamanhoMB}MB) Você pode ouvir antes de enviar.`;
    };

    // FIX: start(250) coleta chunks a cada 250ms, garantindo que o final do áudio
    // não seja perdido no buffer quando .stop() é chamado
    mediaRecorder.start(250);
    if (status) status.textContent = "Gravando... fale normalmente.";
    if (btnGravar) btnGravar.disabled = true;
    if (btnParar) btnParar.disabled = false;
    if (btnOuvir) btnOuvir.disabled = true;

    if (timerId) clearInterval(timerId);
    timerId = setInterval(atualizarTempo, 1000);

  } catch (erro) {
    if (msg) {
      msg.textContent = "Não foi possível acessar o microfone.";
      msg.className = "msg-licao err";
    }
  }
}

function pararGravacao() {
  const status = document.getElementById("statusGravador");
  const btnGravar = document.getElementById("btnGravarLicao");
  const btnParar = document.getElementById("btnPararLicao");

  // FIX: usar mediaRecorder.state para verificação mais segura (não depende da flag gravando)
  // FIX: gravando=false foi movido para dentro do onstop (evita condição de corrida)
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    if (btnParar) btnParar.disabled = true;
    if (btnGravar) btnGravar.disabled = false;
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (status) status.textContent = "Processando áudio...";
  }
}

function ouvirGravacao() {
  if (!blobAtual || !urlAudioTemp) return;
  const audio = new Audio(urlAudioTemp);
  audio.play();
}

async function enviarLicao() {
  const tipo = document.getElementById("tipoLicao")?.value;
  const numero = parseInt(document.getElementById("numeroLicao")?.value, 10);
  const texto = document.getElementById("textoLicao")?.value.trim();
  const msg = document.getElementById("msgLicao");

  if (msg) {
    msg.textContent = "";
    msg.className = "msg-licao";
  }

  if (!blobAtual) {
    if (msg) {
      msg.textContent = "Grave um áudio antes de enviar.";
      msg.className = "msg-licao err";
    }
    return;
  }

  if (!numero || numero <= 0) {
    if (msg) {
      msg.textContent = "Informe o número da lição.";
      msg.className = "msg-licao err";
    }
    return;
  }

  let usuario;
  try {
    usuario = JSON.parse(localStorage.getItem("usuarioAtual"));
  } catch {
    usuario = null;
  }

  if (!usuario || !usuario.nome) {
    if (msg) {
      msg.textContent = "Sessão inválida. Faça login novamente.";
      msg.className = "msg-licao err";
    }
    return;
  }

  if (msg) {
    msg.textContent = "Enviando lição...";
    msg.className = "msg-licao";
  }

  const alunoNome = usuario.nome;
  
  // Buscar ID do aluno (com cache para evitar múltiplas queries)
  let alunoId = alunoIdCache;
  
  if (!alunoId) {
    try {
      const q = query(collection(db, "alunos"), where("nome", "==", alunoNome));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        if (msg) {
          msg.textContent = "Aluno não encontrado no banco de dados.";
          msg.className = "msg-licao err";
        }
        return;
      }
      
      alunoId = snap.docs[0].id;
      alunoIdCache = alunoId; // Salvar no cache
    } catch (erro) {
      console.error("Erro ao buscar aluno:", erro);
      if (msg) {
        msg.textContent = "Erro ao buscar dados do aluno.";
        msg.className = "msg-licao err";
      }
      return;
    }
  }

  // Upload do áudio no Storage
  const caminho = `licoes/${alunoId}/${tipo}_${numero}_${Date.now()}.webm`;
  const arquivoRef = ref(storage, caminho);

  const metadata = {
    contentType: blobAtual.type || "audio/webm"
  };

  try {
    console.log("Iniciando upload...", { alunoId, caminho, tamanho: blobAtual.size });
    
    // Upload do áudio
    if (msg) msg.textContent = "Enviando áudio...";
    await uploadBytes(arquivoRef, blobAtual, metadata);
    console.log("✅ Upload concluído");
    
    // Obter URL pública
    if (msg) msg.textContent = "Obtendo URL do áudio...";
    const audioURL = await getDownloadURL(arquivoRef);
    console.log("✅ URL obtida:", audioURL);

    // Criar registro no Firestore
    if (msg) msg.textContent = "Salvando lição no banco...";
    const agora = new Date();
    const tipoTexto = tipo === "leitura" ? "Leitura" : "Método";
    const titulo = `${tipoTexto} nº ${numero}`;
    
    await addDoc(collection(db, "licoes"), {
      alunoId,
      alunoNome,
      aluno: alunoNome,
      tipo,
      numero,
      texto,
      audioURL,
      titulo,
      status: "pendente",
      observacaoProfessor: "",
      criadoEm: agora.toISOString(),
      dataEnvio: Timestamp.fromDate(agora)
    });
    console.log("✅ Lição salva no Firestore");

    if (msg) {
      msg.textContent = "✅ Lição enviada para avaliação!";
      msg.className = "msg-licao ok";
    }

    // Atualizar a lista de lições para mostrar a nova lição
    setTimeout(() => {
      fecharModalLicao();
      // Recarregar a lista de lições do aluno
      carregarLicoesAluno(alunoNome);
    }, 1200);
    
  } catch (erro) {
    console.error("❌ Erro ao enviar lição:", erro);
    console.error("Detalhes:", { code: erro.code, message: erro.message, stack: erro.stack });
    
    if (msg) {
      let mensagemErro = "Erro ao enviar lição.";
      
      // Mensagens específicas por tipo de erro
      if (erro.code === "storage/unauthorized") {
        mensagemErro = "Erro de permissão. Verifique as regras do Storage.";
      } else if (erro.code === "storage/canceled") {
        mensagemErro = "Upload cancelado.";
      } else if (erro.code === "storage/unknown") {
        mensagemErro = "Erro desconhecido. Verifique sua conexão.";
      } else if (erro.message && erro.message.includes("CORS")) {
        mensagemErro = "Erro de CORS. Aguarde alguns minutos e tente novamente.";
      } else if (erro.message && erro.message.includes("network")) {
        mensagemErro = "Erro de rede. Verifique sua conexão.";
      }
      
      msg.textContent = mensagemErro;
      msg.className = "msg-licao err";
    }
  }
}

/* ==========================
   LISTAGEM DE LIÇÕES NA ABA
   ========================== */

export async function carregarLicoesAluno(nomeAluno) {
  const lista = document.getElementById("listaLicoes");
  if (!lista) return;

  lista.innerHTML = "Carregando lições...";

  // Lê da coleção "licoes" unificada
  const q = query(collection(db, "licoes"), where("alunoNome", "==", nomeAluno));
  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = "<p style='font-size:0.9rem; opacity:0.8;'>Nenhuma lição enviada ainda.</p>";
    return;
  }

  lista.innerHTML = "";

  snap.forEach(docSnap => {
    const l = docSnap.data();
    const id = docSnap.id;

    // Garante compatibilidade se algum dia usou campo "aluno"
    if (l.alunoNome !== nomeAluno && l.aluno !== nomeAluno) return;

    const data = l.criadoEm
      ? new Date(l.criadoEm).toLocaleDateString("pt-BR")
      : new Date().toLocaleDateString("pt-BR");

    const card = document.createElement("div");
    card.className = "card-licao";
    
    // Badge de status
   const s = (l.status || "").toLowerCase();
const statusClass = s === "pendente" ? "pendente"
                  : (s === "aprovado" || s === "aprovada") ? "aprovada"
                  : "reprovada";
const statusTexto = s === "pendente" ? "PENDENTE"
                  : (s === "aprovado" || s === "aprovada") ? "APROVADA"
                  : "REPROVADA";
    
    // Botão de deletar (X)
    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-delete-licao";
    btnDelete.textContent = "×";
    btnDelete.onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`Deseja realmente excluir a lição ${l.tipo === "metodo" ? "Método" : "Leitura"} nº ${l.numero}?`)) {
        try {
          // Deletar do Firestore
          await deleteDoc(doc(db, "licoes", id));
          console.log("✅ Lição deletada:", id);
          
          // Remover o card da interface
          card.style.opacity = "0";
          card.style.transform = "scale(0.8)";
          setTimeout(() => {
            card.remove();
            // Verificar se ainda há lições
            if (lista.children.length === 0) {
              lista.innerHTML = "<p style='font-size:0.9rem; opacity:0.8;'>Nenhuma lição enviada ainda.</p>";
            }
          }, 300);
        } catch (erro) {
          console.error("❌ Erro ao deletar lição:", erro);
          alert("Erro ao deletar lição. Tente novamente.");
        }
      }
    };
    
    card.innerHTML = `
      <div class="status-badge ${statusClass}">${statusTexto}</div>
      <div class="card-licao-content">
        <div class="licao-tipo">${l.tipo === "metodo" ? "MÉTODO" : "LEITURA"}</div>
        <div class="licao-numero">Nº ${l.numero}</div>
      </div>
      <button class="btn-ver-detalhes" onclick="abrirLicao('${id}')">Detalhes</button>
    `;
    
    card.insertBefore(btnDelete, card.firstChild);
    lista.appendChild(card);
  });
}

/* ==========================
   VISUALIZAÇÃO DE UMA LIÇÃO
   ========================== */

async function abrirLicao(id) {
  const refL = doc(db, "licoes", id);
  const snap = await getDoc(refL);
  if (!snap.exists()) {
    alert("Lição não encontrada.");
    return;
  }

  const l = snap.data();
  const modal = document.getElementById("modalViewLicao");
  const infoEl = document.getElementById("viewLicaoInfo");
  const textoEl = document.getElementById("viewLicaoTexto");
  const obsProfEl = document.getElementById("viewLicaoObsProf");
  const audioEl = document.getElementById("viewLicaoAudio");

  if (!modal || !infoEl || !audioEl) return;

  const data = l.criadoEm
    ? new Date(l.criadoEm).toLocaleString("pt-BR")
    : "";

  infoEl.innerHTML = `<strong>${l.tipo === "metodo" ? "Método" : "Leitura"} — lição nº ${l.numero}</strong><br><small style="opacity: 0.7;">${data}</small>`;
  
  if (textoEl) {
    textoEl.innerHTML = l.texto 
      ? `<div class="comentario-box"><strong>💬 Comentário do aluno</strong>${l.texto}</div>` 
      : "";
  }
  
  if (obsProfEl) {
    obsProfEl.innerHTML = l.observacaoProfessor 
      ? `<div class="comentario-box comentario-professor"><strong>⭐ Observações do professor</strong>${l.observacaoProfessor}</div>` 
      : "";
  }
  
  audioEl.src = l.audioURL || "";
  audioEl.load();

  modal.classList.add("ativo");
}

/* ==========================
   INICIALIZAÇÃO
   ========================== */

document.addEventListener("DOMContentLoaded", () => {
  inserirModalLicao();
});

// tornar funções globais para o HTML (onclick)
window.abrirModalEnviarLicao = abrirModalEnviarLicao;
window.abrirLicao = abrirLicao;
