// professor-licoes.js
// Sistema de solicitações de lição mostrado no painel do professor

import { db } from "../firebase-config.js";
import {
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/* ============================================================
   CARREGAR SOLICITAÇÕES
   ============================================================ */

export async function carregarSolicitacoes(painelEl, listaEl) {

  listaEl.innerHTML = `
    <p style="text-align:center; opacity:0.6; font-size:0.95rem;">
      Carregando solicitações...
    </p>
  `;

  const snap = await getDocs(collection(db, "solicitacoes"));

  // Se estiver vazia → esconde o painel
  if (snap.empty) {
    painelEl.style.display = "none";
    return false;
  }

  painelEl.style.display = "block";
  listaEl.innerHTML = "";

  snap.forEach((docItem) => {
    const dados = docItem.data();

    listaEl.innerHTML += `
      <div class="item-licao" 
           style="
             padding: 12px;
             background: rgba(30,41,59,0.8);
             border-radius: 10px;
             border: 1px solid rgba(56,189,248,0.25);
             box-shadow: 0 0 8px rgba(0,0,0,0.25);
           ">
        
        <div style="font-size:1rem; color:#38bdf8; font-weight:600;">
          ${dados.aluno ?? "Aluno desconhecido"}
        </div>

        <div style="margin-top:4px; font-size:0.9rem; opacity:0.8;">
          Solicitou correção da lição: <strong>${dados.licao ?? "?"}</strong>
        </div>

        <div style="display:flex; gap:10px; margin-top:10px;">

          <button 
            class="btn-aprovar" 
            data-acao="aprovarLicao"
            data-id="${docItem.id}"
            style="
              flex:1;
              padding: 8px;
              border:none;
              border-radius:8px;
              background:#22c55e;
              color:#022c22;
              font-weight:600;
              cursor:pointer;
            ">
            ✔ Aprovar
          </button>

          <button 
            class="btn-rejeitar" 
            data-acao="rejeitarLicao"
            data-id="${docItem.id}"
            style="
              flex:1;
              padding: 8px;
              border:none;
              border-radius:8px;
              background:#dc2626;
              color:white;
              font-weight:600;
              cursor:pointer;
            ">
            ✖ Rejeitar
          </button>

        </div>

      </div>
    `;
  });

  return true;
}

/* ============================================================
   EVENTOS GLOBAIS (delegação)
   ============================================================ */

document.addEventListener("click", async (e) => {
  const el = e.target;

  if (!el.dataset?.acao) return;

  // ----------- APROVAR -----------
  if (el.dataset.acao === "aprovarLicao") {
    const id = el.dataset.id;

    // opcional: atualizar alguma coisa no aluno
    await deleteDoc(doc(db, "solicitacoes", id));

    alert("Lição aprovada!");
    recarregarPainel();
  }

  // ----------- REJEITAR -----------
  if (el.dataset.acao === "rejeitarLicao") {
    const id = el.dataset.id;

    await deleteDoc(doc(db, "solicitacoes", id));

    alert("Lição rejeitada.");
    recarregarPainel();
  }
});

/* ============================================================
   FUNÇÃO PARA RECARREGAR PAINEL DE SOLICITAÇÕES
   ============================================================ */
async function recarregarPainel() {
  const painel = document.getElementById("painelLicoesProf");
  const lista = document.getElementById("listaSolicitacoes");

  await carregarSolicitacoes(painel, lista);
}
