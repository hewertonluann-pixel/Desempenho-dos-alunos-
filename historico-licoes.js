// historico-licoes.js
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const lista = document.getElementById("listaLicoes");

function statusLabel(cod) {
  if (cod === "aprovado") return "✅ Aprovada";
  if (cod === "reprovado") return "❌ Reprovada";
  return "⏳ Pendente";
}

function statusClass(cod) {
  if (cod === "aprovado") return "status-aprovado";
  if (cod === "reprovado") return "status-reprovado";
  return "status-pendente";
}

async function carregarHistorico() {
  let usuario;
  try {
    usuario = JSON.parse(localStorage.getItem("usuarioAtual"));
  } catch {
    usuario = null;
  }

  if (!usuario || !usuario.nome) {
    lista.innerHTML = "<p>Faça login novamente.</p>";
    return;
  }

  const q = query(
    collection(db, "solicitacoesLicao"),
    where("alunoNome", "==", usuario.nome)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = "<p>Você ainda não enviou nenhuma lição.</p>";
    return;
  }

  const dados = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  dados.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));

  lista.innerHTML = dados.map(item => `
    <div class="card-licao">
      <div class="linha-topo-licao">
        <span>${item.tipo === "leitura" ? "📘 BONA" : "🎯 Método"} — lição ${item.numero}</span>
        <span class="tag-licao ${statusClass(item.status)}">
          ${statusLabel(item.status)}
        </span>
      </div>
      <div class="linha-corpo-licao">
        <audio controls src="${item.audioURL}"></audio>
      </div>
      ${item.texto ? `<div class="linha-texto-licao">💬 ${item.texto}</div>` : ""}
      <div class="linha-data-licao">
        Enviado em: ${new Date(item.criadoEm).toLocaleString("pt-BR")}
      </div>
    </div>
  `).join("");
}

document.addEventListener("DOMContentLoaded", carregarHistorico);
