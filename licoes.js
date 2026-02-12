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
  if (mediaRecorder && gravando) {
    mediaRecorder.stop();
  }
  resetarEstado();
}

function resetarEstado() {
  gravando = false;
  chunks = [];
  blobAtual = null;
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
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    blobAtual = null;
    segundos = 0;
    gravando = true;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      gravando = false;
      const mime = mediaRecorder.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mime });

      if (blob.size < 500) {
        if (status) status.textContent = "⚠ Áudio muito curto ou corrompido. Tente novamente.";
        blobAtual = null;
        return;
      }

      blobAtual = blob;
      urlAudioTemp = URL.createObjectURL(blob);

      if (btnOuvir) btnOuvir.disabled = false;
      if (status) status.textContent = "Gravação concluída! Você pode ouvir antes de enviar.";
    };

    mediaRecorder.start();
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

  // Upload do áudio no Storage
  const caminho = `licoes/${alunoId}/${tipo}_${numero}_${Date.now()}.webm`;
  const arquivoRef = ref(storage, caminho);

  const metadata = {
    contentType: blobAtual.type || "audio/webm"
  };

  await uploadBytes(arquivoRef, blobAtual, metadata);
  await new Promise(res => setTimeout(res, 200)); // pequeno delay
  const audioURL = await getDownloadURL(arquivoRef);

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
    
    // Badge de status
    const statusClass = l.status === "pendente" ? "pendente" : l.status === "aprovada" ? "aprovada" : "reprovada";
    const statusTexto = l.status === "pendente" ? "PENDENTE" : l.status === "aprovada" ? "APROVADA" : "REPROVADA";
    
    // Botão de deletar (X)
    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-delete-licao";
    btnDelete.textContent = "×";
    btnDelete.onclick = (e) => {
      e.stopPropagation();
      if (confirm(`Deseja realmente excluir a lição ${l.tipo === "metodo" ? "Método" : "Leitura"} nº ${l.numero}?`)) {
        // Implementar função de deletar futuramente
        alert("Função de exclusão em desenvolvimento.");
      }
    };
    
    card.innerHTML = `
      <div class="status-badge ${statusClass}">${statusTexto}</div>
      <div class="card-licao-content">
        <div class="licao-tipo">${l.tipo === "metodo" ? "MÉTODO" : "LEITURA"}</div>
        <div class="licao-numero">Nº ${l.numero}</div>
      </div>
      <button class="btn-ver-detalhes" onclick="abrirLicao('${id}')">Ver detalhes</button>
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
