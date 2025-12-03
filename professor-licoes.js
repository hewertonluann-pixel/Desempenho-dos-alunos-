// professor-licoes.js – versão completa e integrada ao novo layout

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

let painelLicoesProf = null; // Referência global ao container do HTML

function inserirPainel() {
  painelLicoesProf = document.getElementById("painelLicoesProf"); // Usar ID fixo do HTML
  if (!painelLicoesProf) {
    console.error("❌ ERRO: painelLicoesProf não encontrado no HTML.");
    return;
  }

  // Limpar conteúdo antes de inserir
  painelLicoesProf.innerHTML = '';

  // Criar conteúdo dentro do painel fixo
  const card = document.createElement("div");
  card.id = "cardSolicitacoesLicao";
  card.className = "card-licoes"; // Classe opcional para CSS custom
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

  painelLicoesProf.appendChild(card);
  painelLicoesProf.classList.add("show"); // Ativar grid no CSS

  document.getElementById("btnAtualizarSolicitacoes").onclick = carregarSolicitacoes;
  carregarSolicitacoes();
}

// Função para mostrar/ocultar painel (chamada pelo botão no HTML)
window.mostrarPainelLicoes = function() {
  if (!painelLicoesProf) {
    inserirPainel(); // Primeira vez, carrega
  } else if (painelLicoesProf.innerHTML === '' || !painelLicoesProf.classList.contains("show")) {
    inserirPainel(); // Recarregar se necessário
  } else {
    // Ocultar: remover classe e limpar
    painelLicoesProf.classList.remove("show");
    painelLicoesProf.innerHTML = '';
  }
};

async function carregarSolicitacoes() {
  const lista = document.getElementById("listaSolicitacoesLicao");
  if (!lista) return;

  lista.innerHTML = "<p>Carregando...</p>";

  try {
    const q = query(
      collection(db, "solicitacoesLicao"),
      where("status", "==", "pendente")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      lista.innerHTML = "<p>Nenhuma solicitação pendente.</p>";
      return;
    }

    const itens = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    lista.innerHTML = itens.map(item => `
      <div class="card-item-licao"
        data-id="${item.id}"
        data-tipolicao="${item.tipo}"
        data-numerolicao="${item.numero}"
        data-alunoid="${item.alunoId}">
        
        <div style="display:flex;justify-content:space-between;">
          <strong>${item.alunoNome}</strong>
          <span style="opacity:0.7;font-size:0.75rem;">
            ${new Date(item.criadoEm).toLocaleString("pt-BR")}
          </span>
        </div>

        <p style="margin:6px 0 4px 0;">
          ${item.tipo === "leitura" ? "📘 BONA" : "🎯 Método"} — lição ${item.numero}
        </p>

        <audio controls src="${item.audioURL}" style="width:100%; margin-bottom:6px;"></audio>

        ${item.texto ? `<p style="font-size:0.85rem;opacity:0.9;">💬 ${item.texto}</p>` : ""}

        <div style="display:flex;gap:10px;margin-top:6px;">
          <button class="btnReprovarLicao"
            style="flex:1;padding:8px;border:none;border-radius:6px;background:#fca5a5;color:#7f1d1d;font-weight:600;cursor:pointer;">
            Reprovar
          </button>

          <button class="btnAprovarLicao"
            style="flex:1;padding:8px;border:none;border-radius:6px;background:#bbf7d0;color:#14532d;font-weight:600;cursor:pointer;">
            Aprovar
          </button>
        </div>
      </div>
    `).join("");

    // Eventos dos botões
    lista.querySelectorAll(".btnAprovarLicao").forEach(btn => {
      btn.onclick = () => tratar(btn.closest(".card-item-licao"), true);
    });

    lista.querySelectorAll(".btnReprovarLicao").forEach(btn => {
      btn.onclick = () => tratar(btn.closest(".card-item-licao"), false);
    });

  } catch (error) {
    console.error("Erro ao carregar solicitações:", error);
    lista.innerHTML = "<p>Erro ao carregar. Tente novamente.</p>";
  }
}

async function tratar(card, aprovar) {
  const id = card.dataset.id;
  const tipo = card.dataset.tipolicao;
  const numero = parseInt(card.dataset.numerolicao, 10);
  const alunoId = card.dataset.alunoid;

  try {
    if (aprovar) {
      await updateDoc(doc(db, "alunos", alunoId), {
        [tipo]: numero
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

    card.style.opacity = "0.4";
    card.style.pointerEvents = "none";

    console.log(`Liçao ${aprovar ? 'aprovada' : 'reprovada'} para ${alunoId}`);

  } catch (error) {
    console.error("Erro ao tratar lição:", error);
    alert("Erro ao processar lição.");
  }
}

// Inicialização opcional (se necessário sem DOMContentLoaded)
document.addEventListener("DOMContentLoaded", () => {
  // Não chama inserirPainel() aqui, pois o controle é via botão no HTML
});
