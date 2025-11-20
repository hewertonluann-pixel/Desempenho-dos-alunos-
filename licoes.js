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
  doc
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
let formatoFinal = "audio/wav"; // formato que vamos subir para o Storage

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
    .linha-campos {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .linha-campos label {
      font-size: 0.8rem;
      opacity: 0.9;
    }
    .linha-campos select,
    .linha-campos input {
      background: #020617;
      border-radius: 8px;
      border: 1px solid #1f2937;
      color: #e5e7eb;
      padding: 6px 8px;
      font-size: 0.85rem;
      flex: 1;
      min-width: 0;
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
      background: #020617;
      border-radius: 14px;
      padding: 16px 14px;
      width: 95%;
      max-width: 360px;
      color: #e5e7eb;
      border: 1px solid rgba(56,189,248,0.4);
    }
    .modal-view-conteudo h3 {
      margin-top: 0;
      margin-bottom: 8px;
      font-size: 1rem;
      color: #38bdf8;
    }
    .modal-view-conteudo p {
      font-size: 0.85rem;
      margin: 4px 0;
    }
    .btn-fechar-view {
      margin-top: 10px;
      width: 100%;
      border-radius: 8px;
      border: none;
      padding: 8px 0;
      background: #111827;
      color: #e5e7eb;
      cursor: pointer;
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

      <div class="linha-campos">
        <label for="tipoLicao">Tipo:</label>
        <select id="tipoLicao">
          <option value="leitura">BONA (Leitura)</option>
          <option value="metodo">Método</option>
        </select>

        <label for="numeroLicao">Lição nº:</label>
        <input type="number" id="numeroLicao" min="1" max="200" value="1">
      </div>

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
      <p id="viewLicaoObs"></p>
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

  document.getElementById("btnFecharViewLicao").onclick = () => {
    modalView.classList.remove("ativo");
  };
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
  if (mediaRecorder && gravando) {
    mediaRecorder.stop();
  }
  resetarEstado();
}

function resetarEstado() {
  gravando = false;
  chunks = [];
  blobAtual = null;
  formatoFinal = "audio/wav";

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
  const tempoEl = document.getElementById("tempoGravacao");
  if (tempoEl) tempoEl.textContent = `${m}:${s}`;

  const wave = document.getElementById("waveBar");
  if (wave) {
    wave.style.transform = `scaleX(${Math.min(1, segundos / 30)})`;
  }
}

/* ==========================
   CONVERSÃO PARA WAV (HÍBRIDO)
   ========================== */

async function converterParaWav(blobOriginal) {
  // Se já for WAV, não precisa converter
  if (blobOriginal.type && blobOriginal.type.includes("wav")) {
    return blobOriginal;
  }

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    // Navegador não suporta AudioContext, volta o original
    return null;
  }

  const audioCtx = new AudioCtx();
  try {
    const arrayBuffer = await blobOriginal.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const wavBlob = encodeWavFromAudioBuffer(audioBuffer);
    await audioCtx.close();
    return wavBlob;
  } catch (e) {
    console.error("Erro convertendo para WAV:", e);
    try {
      await audioCtx.close();
    } catch {}
    return null;
  }
}

function encodeWavFromAudioBuffer(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const samples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples * bytesPerSample * numChannels);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  let offset = 0;

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples * bytesPerSample * numChannels, true);
  writeString(8, "WAVE");

  // fmt chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // subchunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  writeString(36, "data");
  view.setUint32(40, samples * bytesPerSample * numChannels, true);

  offset = 44;
  const channelData = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channelData[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

/* ==========================
   GRAVAÇÃO (HÍBRIDO AUTOMÁTICO)
   ========================== */

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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Escolha de tipo híbrida
   // 🔒 Formato seguro e 100% compatível
let options = { mimeType: "audio/webm" };

// fallback automático se o navegador não aceitar
try {
  mediaRecorder = new MediaRecorder(stream, options);
} catch (e) {
  console.warn("Falha com audio/webm, usando padrão:", e);
  mediaRecorder = new MediaRecorder(stream);
}

    chunks = [];
    blobAtual = null;
    segundos = 0;
    gravando = true;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      gravando = false;
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }

      const mime = mediaRecorder.mimeType || "audio/webm";
      const blobOriginal = new Blob(chunks, { type: mime });

      const status2 = document.getElementById("statusGravador");
      const btnOuvir2 = document.getElementById("btnOuvirLicao");

      if (!blobOriginal || blobOriginal.size === 0) {
        if (status2) status2.textContent = "⚠ Não foi possível capturar o áudio. Tente gravar novamente.";
        blobAtual = null;
        return;
      }

      try {
        // tenta converter para WAV se não for WAV
        const wavBlob = await converterParaWav(blobOriginal);
        if (wavBlob) {
          blobAtual = wavBlob;
          formatoFinal = "audio/wav";
        } else {
          blobAtual = blobOriginal;
          formatoFinal = blobOriginal.type || "audio/webm";
        }
      } catch (e) {
        console.error("Erro no processamento de áudio:", e);
        blobAtual = blobOriginal;
        formatoFinal = blobOriginal.type || "audio/webm";
      }

      if (blobAtual.size < 1000) {
        if (status2) status2.textContent = "⚠ Áudio muito curto ou inválido. Tente novamente.";
        blobAtual = null;
        return;
      }

      urlAudioTemp = URL.createObjectURL(blobAtual);

      if (btnOuvir2) btnOuvir2.disabled = false;
      if (status2) status2.textContent = "Gravação concluída! Você pode ouvir antes de enviar.";
    };

    mediaRecorder.start();

    if (status) status.textContent = "Gravando... fale normalmente.";
    if (btnGravar) btnGravar.disabled = true;
    if (btnParar) btnParar.disabled = false;
    if (btnOuvir) btnOuvir.disabled = true;

    if (timerId) clearInterval(timerId);
    timerId = setInterval(atualizarTempo, 1000);

  } catch (erro) {
    console.error("Erro ao iniciar gravação:", erro);
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

  if (mediaRecorder && gravando) {
    mediaRecorder.stop();
    gravando = false;
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

/* ==========================
   ENVIO DA LIÇÃO
   ========================== */

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

  // Buscar aluno no Firestore
  const q = query(collection(db, "alunos"), where("nome", "==", usuario.nome));
  const snap = await getDocs(q);

  if (snap.empty) {
    if (msg) {
      msg.textContent = "Aluno não encontrado no banco de dados.";
      msg.className = "msg-licao err";
    }
    return;
  }

  const alunoDoc = snap.docs[0];
  const alunoId = alunoDoc.id;
  const alunoNome = alunoDoc.data().nome;

  // Verificação reforçada do blob
  if (!blobAtual || blobAtual.size < 1000) {
    if (msg) {
      msg.textContent = "⚠ O áudio gravado está muito curto ou inválido. Tente gravar novamente.";
      msg.className = "msg-licao err";
    }
    return;
  }

  // Upload do áudio no Storage
  const caminho = `licoes/${alunoId}/${tipo}_${numero}_${Date.now()}.wav`;
  const arquivoRef = ref(storage, caminho);

  const metadata = {
    contentType: formatoFinal || blobAtual.type || "audio/wav"
  };

  let audioURL;

  try {
    await uploadBytes(arquivoRef, blobAtual, metadata);
  } catch (e) {
    console.error("ERRO UPLOAD:", e);
    if (msg) {
      msg.textContent = "⚠ Erro ao enviar o áudio. Tente novamente.";
      msg.className = "msg-licao err";
    }
    return;
  }

  try {
    audioURL = await getDownloadURL(arquivoRef);
  } catch (e) {
    console.error("ERRO DOWNLOAD URL:", e);
    if (msg) {
      msg.textContent = "⚠ Erro ao gerar o link do áudio.";
      msg.className = "msg-licao err";
    }
    return;
  }

  // Criar registro na coleção UNIFICADA "licoes"
  await addDoc(collection(db, "licoes"), {
    alunoId,
    alunoNome,
    aluno: alunoNome,
    tipo,
    numero,
    texto,
    audioURL,
    status: "pendente",
    observacaoProfessor: "",
    criadoEm: new Date().toISOString()
  });

  if (msg) {
    msg.textContent = "✅ Lição enviada para avaliação!";
    msg.className = "msg-licao ok";
  }

  setTimeout(() => {
    fecharModalLicao();
  }, 1200);
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
    card.innerHTML = `
      <div><strong>Data:</strong> ${data}</div>
      <div><strong>Tipo:</strong> ${l.tipo === "metodo" ? "Método" : "Leitura"}</div>
      <div><strong>Lição nº:</strong> ${l.numero}</div>
      <div><strong>Status:</strong> <span class="status ${l.status}">${l.status}</span></div>
      ${
        l.observacaoProfessor
          ? `<div><strong>Obs. do professor:</strong> ${l.observacaoProfessor}</div>`
          : ""
      }
      <button class="btn-ver" onclick="abrirLicao('${id}')">Ver lição</button>
    `;
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
  const obsEl = document.getElementById("viewLicaoObs");
  const audioEl = document.getElementById("viewLicaoAudio");

  if (!modal || !infoEl || !audioEl) return;

  const data = l.criadoEm
    ? new Date(l.criadoEm).toLocaleString("pt-BR")
    : "";

  infoEl.textContent = `${l.tipo === "metodo" ? "Método" : "Leitura"} — lição nº ${l.numero} — ${data}`;
  if (obsEl) {
    obsEl.textContent = l.texto ? `Comentário: ${l.texto}` : "";
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
