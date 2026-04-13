// professor-licoes.js – versão atualizada para o novo layout

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  serverTimestamp
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
    .grid-licoes {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-top: 10px;
    }
    @media (max-width: 768px) {
      .grid-licoes {
        grid-template-columns: 1fr;
      }
    }
    .card-licao-prof {
      background: linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.9));
      border: 2px solid rgba(56, 189, 248, 0.4);
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      transition: all 0.3s ease;
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
    }
    .card-licao-prof:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      border-color: rgba(34, 211, 238, 0.6);
    }
    .licao-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(56, 189, 248, 0.3);
    }
    .licao-aluno-info {
      flex: 1;
    }
    .licao-aluno {
      font-size: 1.1em;
      font-weight: bold;
      color: #22d3ee;
      margin-bottom: 2px;
    }
    .licao-instrumento {
      font-size: 0.8em;
      color: #94a3b8;
      font-style: italic;
    }
    .licao-data {
      font-size: 0.75em;
      color: #94a3b8;
      text-align: right;
    }
    .licao-info-linha {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 0.85em;
    }
    .licao-info-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .licao-info-label {
      color: #94a3b8;
      font-size: 0.9em;
    }
    .licao-info-value {
      font-weight: bold;
      color: #38bdf8;
    }
    .licao-audio-section {
      margin-bottom: 10px;
    }
    .licao-audio-section audio {
      width: 100%;
      height: 32px;
    }
    .licao-comentario-aluno {
      background: rgba(56, 189, 248, 0.08);
      border-left: 3px solid #38bdf8;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 10px;
      font-size: 0.85em;
      color: #e2e8f0;
      line-height: 1.4;
    }
    .licao-comentario-aluno strong {
      color: #38bdf8;
      font-size: 0.8em;
      display: block;
      margin-bottom: 4px;
    }
    .licao-resposta-prof {
      background: rgba(250, 204, 21, 0.08);
      border: 1px solid rgba(250, 204, 21, 0.3);
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 10px;
    }
    .licao-resposta-prof textarea {
      width: 100%;
      min-height: 60px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(250, 204, 21, 0.3);
      border-radius: 6px;
      padding: 8px;
      color: #e2e8f0;
      font-size: 0.85em;
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
      gap: 8px;
    }
    .licao-acoes button {
      flex: 1;
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85em;
      cursor: pointer;
      transition: all 0.3s ease;
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
    /* ── Estilos do painel de edição ── */
    .licao-edicao-section {
      background: rgba(251, 146, 60, 0.08);
      border: 1px solid rgba(251, 146, 60, 0.35);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    .licao-edicao-section .edicao-titulo {
      font-size: 0.78em;
      font-weight: 700;
      color: #fb923c;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .edicao-campos {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }
    .edicao-grupo {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .edicao-grupo label {
      font-size: 0.75em;
      color: #94a3b8;
    }
    .edicao-grupo select,
    .edicao-grupo input[type="number"] {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(251, 146, 60, 0.4);
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 0.85em;
      padding: 5px 8px;
      outline: none;
      transition: border-color 0.2s;
    }
    .edicao-grupo select:focus,
    .edicao-grupo input[type="number"]:focus {
      border-color: #fb923c;
      box-shadow: 0 0 0 2px rgba(251, 146, 60, 0.2);
    }
    .edicao-grupo input[type="number"] {
      width: 72px;
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
    <p style="opacity:0.8;font-size:0.85rem;margin-top:-6px;">Aprove ou reprove as lições enviadas pelos alunos. Corrija o tipo ou número se necessário.</p>
    <button id="btnAtualizarSolicitacoes"
      style="margin:8px 0 14px 0;width:100%;padding:8px;border-radius:8px;border:none;background:#0ea5e9;color:#fff;font-weight:600;cursor:pointer;">
      Atualizar lista
    </button>
    <div id="listaSolicitacoesLicao" class="grid-licoes"></div>
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

  // Buscar dados completos dos alunos
  const itens = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const licaoData = { id: docSnap.id, ...docSnap.data() };
      
      // Buscar dados do aluno
      const alunoSnap = await getDocs(
        query(collection(db, "alunos"), where("nome", "==", licaoData.alunoNome))
      );
      
      if (!alunoSnap.empty) {
        const alunoData = alunoSnap.docs[0].data();
        licaoData.instrumento = alunoData.instrumento || "N/A";
        licaoData.solfejoNome = alunoData.leituraNome || alunoData.solfejoNome || "Bona";
        licaoData.metodoNome = alunoData.metodoNome || "N/A";
      }
      
      return licaoData;
    })
  );

  lista.innerHTML = itens.map(item => {
    // Determinar o nome do método baseado no tipo
    const nomeMetodo = item.tipo === "leitura" 
      ? (item.solfejoNome || "Bona")
      : (item.metodoNome || "N/A");
    
    return `
    <div class="card-licao-prof"
      data-id="${item.id}"
      data-tipolicao="${item.tipo}"
      data-numerolicao="${item.numero}"
      data-alunoid="${item.alunoId}"
      data-alunonome="${item.alunoNome || ''}"
      data-nomemetodo="${nomeMetodo}"
      data-solfejonomeorig="${item.solfejoNome || 'Bona'}"
      data-metodonomeorig="${item.metodoNome || 'N/A'}">
      
      <!-- Cabeçalho -->
      <div class="licao-header">
        <div class="licao-aluno-info">
          <div class="licao-aluno">🎵 ${item.alunoNome}</div>
          <div class="licao-instrumento">${item.instrumento || "N/A"}</div>
        </div>
        <div class="licao-data">${new Date(item.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
      </div>

      <!-- Informações da lição -->
      <div class="licao-info-linha">
        <div class="licao-info-item">
          <span class="licao-info-label">${nomeMetodo}</span>
          <span class="licao-info-value">#${item.numero}</span>
        </div>
        <div class="licao-info-item">
          <span class="licao-info-value" style="color: #facc15;">⏳ Pendente</span>
        </div>
      </div>

      <!-- ✏️ Correção pelo professor -->
      <div class="licao-edicao-section">
        <div class="edicao-titulo">✏️ Corrigir dados (se necessário)</div>
        <div class="edicao-campos">
          <div class="edicao-grupo" style="flex:1;">
            <label>Tipo</label>
            <select class="select-tipo-edicao">
              <option value="leitura" ${item.tipo === "leitura" ? "selected" : ""}>Leitura (Bona)</option>
              <option value="metodo" ${item.tipo === "metodo" ? "selected" : ""}>Método</option>
            </select>
          </div>
          <div class="edicao-grupo">
            <label>Nº da lição</label>
            <input
              type="number"
              class="input-numero-edicao"
              min="1"
              value="${item.numero}"
              placeholder="Nº" />
          </div>
        </div>
      </div>

      <!-- Áudio -->
      <div class="licao-audio-section">
        <audio controls src="${item.audioURL}"></audio>
      </div>

      <!-- Comentário do aluno -->
      ${item.texto ? `
        <div class="licao-comentario-aluno">
          <strong>💬 Comentário:</strong>
          ${item.texto}
        </div>
      ` : ""}

      <!-- Campo de resposta do professor -->
      <div class="licao-resposta-prof">
        <textarea 
          class="textarea-feedback-prof" 
          placeholder="Feedback (opcional)...">${item.observacaoProfessor || ""}</textarea>
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
  `;
  }).join("");

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
  const alunoId = card.dataset.alunoid;
  const alunoNome = card.dataset.alunonome || "Aluno";

  // ── Lê os valores dos campos de correção (podem ter sido editados) ──
  const selectTipo   = card.querySelector(".select-tipo-edicao");
  const inputNumero  = card.querySelector(".input-numero-edicao");
  const tipo         = selectTipo  ? selectTipo.value : card.dataset.tipolicao;
  const numero       = inputNumero ? parseInt(inputNumero.value, 10) : parseInt(card.dataset.numerolicao, 10);

  // Determina o nome do método correto de acordo com o tipo (possivelmente corrigido)
  let nomeMetodo;
  if (tipo === "leitura") {
    nomeMetodo = card.dataset.solfejonomeorig || "Bona";
  } else {
    nomeMetodo = card.dataset.metodonomeorig || "N/A";
  }

  // Capturar o feedback do professor
  const textarea = card.querySelector(".textarea-feedback-prof");
  const feedback = textarea ? textarea.value.trim() : "";

  const agora = new Date();

  // ── Monta os dados corrigidos para salvar na lição ──────────────
  const dadosCorrigidos = {
    tipo,
    numero,
    corrigidoPeloProf: (tipo !== card.dataset.tipolicao || numero !== parseInt(card.dataset.numerolicao, 10))
  };

  if (aprovar) {
    // Atualizar progresso do aluno com tipo e número possivelmente corrigidos
    await updateDoc(doc(db, "alunos", alunoId), {
      [tipo]: numero
    });

    // Atualizar status da lição com feedback e dados corrigidos
    await updateDoc(doc(db, "licoes", id), {
      ...dadosCorrigidos,
      status: "aprovado",
      observacaoProfessor: feedback,
      respondidoEm: agora.toISOString(),
      avaliadoEm: Timestamp.fromDate(agora)
    });

    // ── SNAPSHOT MENSAL ───────────────────────────────────────────
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth() + 1;
    const chave = `${alunoId}_${anoAtual}_${String(mesAtual).padStart(2, "0")}`;

    const alunoDocSnap = await getDoc(doc(db, "alunos", alunoId));
    const alunoData = alunoDocSnap.exists() ? alunoDocSnap.data() : {};

    const snapshotPayload = {
      alunoId,
      ano:    anoAtual,
      mes:    mesAtual,
      chave,
      origem: "aprovacao_professor",
      atualizadoEm: Timestamp.fromDate(agora)
    };

    if (tipo === "leitura") {
      snapshotPayload.leitura             = numero;
      snapshotPayload.licaoLeitura        = `${nomeMetodo} #${numero}`;
      snapshotPayload.nomeMetodoLeitura   = nomeMetodo;
      snapshotPayload.metodo              = alunoData.metodo ?? 0;
      snapshotPayload.licaoMetodo         = alunoData.licaoMetodo || "";
      snapshotPayload.nomeMetodoInstrumental = alunoData.metodoNome || "-";
    } else {
      snapshotPayload.metodo              = numero;
      snapshotPayload.licaoMetodo         = `${nomeMetodo} #${numero}`;
      snapshotPayload.nomeMetodoInstrumental = nomeMetodo;
      snapshotPayload.leitura             = alunoData.leitura ?? 0;
      snapshotPayload.licaoLeitura        = alunoData.licaoLeitura || "";
      snapshotPayload.nomeMetodoLeitura   = alunoData.leituraNome || "Bona";
    }

    await setDoc(doc(db, "snapshotsMensais", chave), snapshotPayload, { merge: true });
    // ─────────────────────────────────────────────────────────────

    // ── NOTIFICAÇÃO DE NÍVEL ──────────────────────────────────────
    const tipoLabel = tipo === "leitura" ? "leitura" : "método";
    await addDoc(collection(db, "notificacoes"), {
      tipo: "nivel",
      icone: "🚀",
      alunoNome,
      texto: `<strong>${alunoNome}</strong> avançou para o <em>Nível ${numero} de ${tipoLabel}</em> (${nomeMetodo})`,
      data: serverTimestamp()
    });
    // ─────────────────────────────────────────────────────────────

  } else {
    // Reprovar: salva também os dados corrigidos e o feedback
    await updateDoc(doc(db, "licoes", id), {
      ...dadosCorrigidos,
      status: "reprovado",
      observacaoProfessor: feedback,
      respondidoEm: agora.toISOString(),
      avaliadoEm: Timestamp.fromDate(agora)
    });
  }

  // Desabilitar card
  card.classList.add("licao-processada");
  
  // Atualizar badge de status
  const statusBox = card.querySelector(".licao-info-value[style*='facc15']");
  if (statusBox) {
    statusBox.textContent = aprovar ? "✅ Aprovada" : "❌ Reprovada";
    statusBox.style.color = aprovar ? "#22c55e" : "#dc2626";
  }
}

export function mostrarPainelLicoes() {
  const destino = document.getElementById("painelLicoesProf");
  if (!destino) {
    console.error("❌ ERRO: painelLicoesProf não encontrado no HTML.");
    return;
  }

  if (!document.getElementById("cardSolicitacoesLicao")) {
    inserirPainel();
    destino.style.display = "block";
    return;
  }

  if (destino.style.display === "none" || destino.style.display === "") {
    destino.style.display = "block";
  } else {
    destino.style.display = "none";
  }
}
