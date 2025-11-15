// professor-licoes.js
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const CARD_ID = "cardSolicitacoesLicao";
const LISTA_ID = "listaSolicitacoesLicao";

function inserirCardNotificacoes() {
  const botoes = document.querySelector(".botoes");
  if (!botoes) return;

  const card = document.createElement("div");
  card.id = CARD_ID;
  card.className = "card-solicitacoes-licao";
  card.style.margin = "0 auto 20px auto";
  card.style.maxWidth = "600px";
  card.style.background = "rgba(15,23,42,0.9)";
  card.style.borderRadius = "12px";
  card.style.border = "1px solid rgba(56,189,248,0.4)";
  card.style.padding = "12px 14px";
  card.style.boxShadow = "0 0 18px rgba(15,118,255,0.35)";

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div>
        <strong>🔔 Solicitações de lição</strong>
        <div style="font-size:0.8rem;opacity:0.8;">Ouça os áudios enviados pelos alunos e aprove ou reprove.</div>
      </div>
      <button id="btnAtualizarSolicitacoes" style="
        border:none;border-radius:999px;padding:6px 10px;
        font-size:0.75rem;cursor:pointer;
        background:#22d3ee;color:#0f172a;
      ">Atualizar</button>
    </div>
    <div id="${LISTA_ID}" style="display:flex;flex-direction:column;gap:8px;font-size:0.85rem;">
      Carregando...
    </div>
  `;

  botoes.insertAdjacentElement("afterend", card);

  document.getElementById("btnAtualizarSolicitacoes").onclick = carregarSolicitacoes;
}

async function carregarSolicitacoes() {
  const lista = document.getElementById(LISTA_ID);
  if (!lista) return;

  lista.textContent = "Carregando...";

  const q = query(
    collection(db, "solicitacoesLicao"),
    where("status", "==", "pendente")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = "<div>Nenhuma solicitação pendente no momento.</div>";
    return;
  }

  const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  dados.sort((a, b) => (a.criadoEm > b.criadoEm ? 1 : -1));

  lista.innerHTML = dados.map(item => `
    <div class="linha-solicitacao-licao" data-id="${item.id}" data-alunoid="${item.alunoId}" data-tipo="${item.tipo}" data-numero="${item.numero}">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${item.alunoNome}</strong><br>
          <span>${item.tipo === "leitura" ? "📘 BONA" : "🎯 Método"} — lição ${item.numero}</span>
        </div>
        <span style="font-size:0.75rem;opacity:0.7;">
          ${new Date(item.criadoEm).toLocaleString("pt-BR")}
        </span>
      </div>
      <div style="margin:6px 0;">
        <audio controls src="${item.audioURL}" style="width:100%;"></audio>
      </div>
      ${item.texto ? `<div style="font-size:0.8rem;opacity:0.9;">💬 ${item.texto}</div>` : ""}
      <div style="display:flex;gap:8px;margin-top:6px;justify-content:flex-end;">
        <button class="btnReprovarLicao" style="border:none;border-radius:999px;padding:5px 10px;font-size:0.8rem;background:#fecaca;color:#7f1d1d;cursor:pointer;">Reprovar</button>
        <button class="btnAprovarLicao" style="border:none;border-radius:999px;padding:5px 10px;font-size:0.8rem;background:#bbf7d0;color:#14532d;cursor:pointer;">Aprovar</button>
      </div>
      <hr style="border:none;border-top:1px solid rgba(148,163,184,0.3);margin-top:8px;">
    </div>
  `).join("");

  lista.querySelectorAll(".btnAprovarLicao").forEach(btn => {
    btn.onclick = () => tratarSolicitacao(btn.closest(".linha-solicitacao-licao"), true);
  });

  lista.querySelectorAll(".btnReprovarLicao").forEach(btn => {
    btn.onclick = () => tratarSolicitacao(btn.closest(".linha-solicitacao-licao"), false);
  });
}

async function tratarSolicitacao(linha, aprovar) {
  if (!linha) return;
  const id = linha.dataset.id;
  const alunoId = linha.dataset.alunoid;
  const tipo = linha.dataset.tipo;
  const numero = parseInt(linha.dataset.numero, 10);

  if (!id || !alunoId || !tipo || !numero) return;

  if (aprovar) {
    // Atualiza pontuação do aluno
    const campo = tipo === "leitura" ? "leitura" : "metodo";
    await updateDoc(doc(db, "alunos", alunoId), {
      [campo]: numero
    });

    await updateDoc(doc(db, "solicitacoesLicao", id), {
      status: "aprovado",
      respondidoEm: new Date().toISOString()
    });
  } else {
    await updateDoc(doc(db, "solicitacoesLicao", id), {
      status: "reprovado",
      respondidoEm: new Date().toISOString()
    });
  }

  linha.style.opacity = "0.4";
  linha.style.pointerEvents = "none";
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  inserirCardNotificacoes();
  carregarSolicitacoes();
});
