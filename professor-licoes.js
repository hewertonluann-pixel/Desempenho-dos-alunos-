// professor-licoes.js – versão atualizada para o novo layout

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

function inserirPainel() {
  const destino = document.getElementById("painelLicoesProf");
  if (!destino) {
    console.error("❌ ERRO: painelLicoesProf não encontrado no HTML.");
    return;
  }

  // Adicionar estilos CSS para os cards
  const estilo = document.createElement("style");
  estilo.textContent = `
    .card-licao-prof {
      background: linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.9));
      border: 2px solid rgba(56, 189, 248, 0.4);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transition: all 0.3s ease;
      margin-bottom: 20px;
    }
    .card-licao-prof:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      border-color: rgba(34, 211, 238, 0.6);
    }
    .licao-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid rgba(56, 189, 248, 0.3);
    }
    .licao-aluno {
      font-size: 1.3em;
      font-weight: bold;
      color: #22d3ee;
    }
    .licao-data {
      font-size: 0.85em;
      color: #94a3b8;
      font-style: italic;
    }
    .licao-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .licao-info-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .licao-info-label {
      font-size: 0.75em;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .licao-info-value {
      font-size: 1.1em;
      font-weight: bold;
      color: #38bdf8;
    }
    .licao-audio-section {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 16px;
    }
    .licao-audio-section h4 {
      margin: 0 0 10px 0;
      color: #22d3ee;
      font-size: 0.95em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .licao-audio-section audio {
      width: 100%;
      margin-top: 8px;
    }
    .licao-comentario-aluno {
      background: rgba(56, 189, 248, 0.08);
      border-left: 4px solid #38bdf8;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .licao-comentario-aluno h4 {
      margin: 0 0 8px 0;
      color: #38bdf8;
      font-size: 0.85em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .licao-comentario-aluno p {
      margin: 0;
      color: #e2e8f0;
      font-size: 0.9em;
      line-height: 1.5;
    }
    .licao-resposta-prof {
      background: rgba(250, 204, 21, 0.08);
      border: 2px solid rgba(250, 204, 21, 0.3);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 16px;
    }
    .licao-resposta-prof h4 {
      margin: 0 0 10px 0;
      color: #facc15;
      font-size: 0.95em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .licao-resposta-prof textarea {
      width: 100%;
      min-height: 80px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(250, 204, 21, 0.3);
      border-radius: 8px;
      padding: 10px;
      color: #e2e8f0;
      font-size: 0.9em;
      font-family: inherit;
      resize: vertical;
    }
    .licao-resposta-prof textarea:focus {
      outline: none;
      border-color: #facc15;
      box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.2);
    }
    .licao-acoes {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .licao-acoes button {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 0.95em;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-reprovar-licao {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: #fff;
    }
    .btn-reprovar-licao:hover {
      background: linear-gradient(135deg, #b91c1c, #991b1b);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    }
    .btn-aprovar-licao {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #fff;
    }
    .btn-aprovar-licao:hover {
      background: linear-gradient(135deg, #16a34a, #15803d);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    }
    .licao-processada {
      opacity: 0.5;
      pointer-events: none;
    }
  `;
  document.head.appendChild(estilo);

  const card = document.createElement("div");
  card.id = "cardSolicitacoesLicao";
  card.style.background = "rgba(15,23,42,0.9)";
  card.style.border = "1px solid rgba(56,189,248,0.3)";
  card.style.borderRadius = "12px";
  card.style.padding = "14px";
  card.style.boxShadow = "0 0 18px rgba(15,118,255,0.35)";
  card.style.marginBottom = "18px";

  card.innerHTML = `
    <h2 style="color:#22d3ee;margin:0 0 10px 0;font-size:1.1rem;">🔔 Solicitações de lição</h2>
    <p style="opacity:0.8;font-size:0.85rem;margin-top:-6px;">Aprove ou reprove as lições enviadas pelos alunos.</p>
    <button id="btnAtualizarSolicitacoes"
      style="margin:8px 0 14px 0;width:100%;padding:8px;border-radius:8px;border:none;background:#0ea5e9;color:#fff;font-weight:600;cursor:pointer;">
      Atualizar lista
    </button>
    <div id="listaSolicitacoesLicao" style="display:flex;flex-direction:column;gap:10px;"></div>
  `;

  destino.appendChild(card);

  document.getElementById("btnAtualizarSolicitacoes").onclick = carregarSolicitacoes;
  carregarSolicitacoes();
}

async function carregarSolicitacoes() {
  const lista = document.getElementById("listaSolicitacoesLicao");
  if (!lista) return;

  lista.innerHTML = "Carregando...";

  const q = query(
    collection(db, "licoes"),
    where("status", "==", "pendente")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = "<p>Nenhuma solicitação pendente.</p>";
    return;
  }

  const itens = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  lista.innerHTML = itens.map(item => `
    <div class="card-licao-prof"
      data-id="${item.id}"
      data-tipolicao="${item.tipo}"
      data-numerolicao="${item.numero}"
      data-alunoid="${item.alunoId}">
      
      <!-- Cabeçalho -->
      <div class="licao-header">
        <div class="licao-aluno">🎵 ${item.alunoNome}</div>
        <div class="licao-data">${new Date(item.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
      </div>

      <!-- Informações da lição -->
      <div class="licao-info-grid">
        <div class="licao-info-box">
          <div class="licao-info-label">Tipo</div>
          <div class="licao-info-value">${item.tipo === "leitura" ? "📘 Leitura" : "🎯 Método"}</div>
        </div>
        <div class="licao-info-box">
          <div class="licao-info-label">Lição Nº</div>
          <div class="licao-info-value">${item.numero}</div>
        </div>
        <div class="licao-info-box">
          <div class="licao-info-label">Status</div>
          <div class="licao-info-value" style="color: #facc15;">⏳ Pendente</div>
        </div>
      </div>

      <!-- Áudio -->
      <div class="licao-audio-section">
        <h4>🎧 Áudio da lição</h4>
        <audio controls src="${item.audioURL}"></audio>
      </div>

      <!-- Comentário do aluno -->
      ${item.texto ? `
        <div class="licao-comentario-aluno">
          <h4>💬 Comentário do aluno</h4>
          <p>${item.texto}</p>
        </div>
      ` : ""}

      <!-- Campo de resposta do professor -->
      <div class="licao-resposta-prof">
        <h4>✍️ Feedback do professor</h4>
        <textarea 
          class="textarea-feedback-prof" 
          placeholder="Escreva aqui seu feedback para o aluno (opcional)...">${item.observacaoProfessor || ""}</textarea>
      </div>

      <!-- Botões de ação -->
      <div class="licao-acoes">
        <button class="btnReprovarLicao btn-reprovar-licao">
          ❌ Reprovar
        </button>
        <button class="btnAprovarLicao btn-aprovar-licao">
          ✅ Aprovar
        </button>
      </div>
    </div>
  `).join("");

  // Eventos dos botões
  lista.querySelectorAll(".btnAprovarLicao").forEach(btn => {
    btn.onclick = () => tratar(btn.closest(".card-licao-prof"), true);
  });

  lista.querySelectorAll(".btnReprovarLicao").forEach(btn => {
    btn.onclick = () => tratar(btn.closest(".card-licao-prof"), false);
  });
}

async function tratar(card, aprovar) {
  const id = card.dataset.id;
  const tipo = card.dataset.tipolicao;
  const numero = parseInt(card.dataset.numerolicao, 10);
  const alunoId = card.dataset.alunoid;
  
  // Capturar o feedback do professor
  const textarea = card.querySelector(".textarea-feedback-prof");
  const feedback = textarea ? textarea.value.trim() : "";

  if (aprovar) {
    // Atualizar progresso do aluno
    await updateDoc(doc(db, "alunos", alunoId), {
      [tipo]: numero
    });

    // Atualizar status da lição com feedback
    await updateDoc(doc(db, "licoes", id), {
      status: "aprovado",
      observacaoProfessor: feedback,
      respondidoEm: new Date().toISOString()
    });

  } else {
    // Atualizar status da lição como reprovada com feedback
    await updateDoc(doc(db, "licoes", id), {
      status: "reprovado",
      observacaoProfessor: feedback,
      respondidoEm: new Date().toISOString()
    });
  }

  // Adicionar classe de processada e desabilitar interação
  card.classList.add("licao-processada");
  
  // Mostrar mensagem de sucesso
  const statusBox = card.querySelector(".licao-info-value[style*='facc15']");
  if (statusBox) {
    statusBox.textContent = aprovar ? "✅ Aprovada" : "❌ Reprovada";
    statusBox.style.color = aprovar ? "#22c55e" : "#dc2626";
  }
}

document.addEventListener("DOMContentLoaded", inserirPainel);
