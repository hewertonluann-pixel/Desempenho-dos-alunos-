// professor-licoes.js – Versão para avaliação de lições com feedback
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

let painelLicoesProf = null;

function inserirPainel() {
  painelLicoesProf = document.getElementById("painelLicoesProf");
  if (!painelLicoesProf) {
    console.error("❌ ERRO: painelLicoesProf não encontrado no HTML.");
    return;
  }

  painelLicoesProf.innerHTML = `
    <div id="cardSolicitacoesLicao" style="background: rgba(15,23,42,0.9); border: 1px solid rgba(56,189,248,0.3); border-radius: 12px; padding: 20px; box-shadow: 0 0 18px rgba(15,118,255,0.35); margin-bottom: 30px;">
      <h2 style="color:#22d3ee; margin:0 0 10px 0; font-size:1.4rem;">🎤 Avaliação de Lições</h2>
      <p style="opacity:0.8; font-size:0.9rem; margin-bottom: 15px;">Ouça as lições enviadas e forneça feedback aos alunos.</p>
      <button id="btnAtualizarSolicitacoes" style="margin-bottom: 20px; width:100%; padding:10px; border-radius:8px; border:none; background:#0ea5e9; color:#fff; font-weight:600; cursor:pointer; transition: background 0.3s;">
        🔄 Atualizar Lista
      </button>
      <div id="listaSolicitacoesLicao" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px;"></div>
    </div>
  `;

  painelLicoesProf.style.display = "block";
  
  // Ocultar o painel de alunos ao mostrar o de lições
  const painelAlunos = document.getElementById("painel");
  if (painelAlunos) painelAlunos.style.display = "none";

  document.getElementById("btnAtualizarSolicitacoes").onclick = carregarSolicitacoes;
  carregarSolicitacoes();
}

export function mostrarPainelLicoes() {
  const painel = document.getElementById("painelLicoesProf");
  if (!painel) return;

  if (painel.style.display === "none" || painel.innerHTML === "") {
    inserirPainel();
  } else {
    painel.style.display = "none";
    // Mostrar painel de alunos de volta
    const painelAlunos = document.getElementById("painel");
    if (painelAlunos) painelAlunos.style.display = "grid";
  }
}
window.mostrarPainelLicoes = mostrarPainelLicoes;

async function carregarSolicitacoes() {
  const lista = document.getElementById("listaSolicitacoesLicao");
  if (!lista) return;

  lista.innerHTML = "<p style='grid-column: 1/-1; text-align: center;'>⏳ Carregando lições pendentes...</p>";

  try {
    const q = query(
      collection(db, "licoes"),
      where("status", "==", "pendente")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      lista.innerHTML = "<p style='grid-column: 1/-1; text-align: center; opacity: 0.7;'>Nenhuma lição pendente para avaliação.</p>";
      return;
    }

    const itens = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    lista.innerHTML = itens.map(item => `
      <div class="card-avaliacao" style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 10px; padding: 15px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display:flex; justify-content:space-between; align-items: center;">
          <strong style="color: #22d3ee; font-size: 1.1rem;">${item.alunoNome}</strong>
          <span style="opacity:0.6; font-size:0.7rem;">${new Date(item.criadoEm).toLocaleDateString("pt-BR")}</span>
        </div>

        <div style="font-size: 0.9rem; font-weight: 600; color: #f8fafc;">
          ${item.tipo === "leitura" ? "📘 Leitura (Bona)" : "🎯 Método Instrumental"} — Lição nº ${item.numero}
        </div>

        <audio controls src="${item.audioURL}" style="width:100%; height: 35px; margin: 5px 0;"></audio>

        <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; font-size: 0.85rem; font-style: italic; color: #cbd5e1;">
          "${item.texto || "Sem comentário do aluno."}"
        </div>

        <textarea id="feedback-${item.id}" placeholder="Escreva o feedback para o aluno..." style="width: 100%; min-height: 60px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; color: #fff; padding: 8px; font-size: 0.85rem; resize: vertical;"></textarea>

        <div style="display:flex; gap:10px;">
          <button onclick="avaliarLicao('${item.id}', 'reprovada', '${item.alunoId}', '${item.tipo}', ${item.numero})" style="flex:1; padding:8px; border:none; border-radius:6px; background:#ef4444; color:#fff; font-weight:600; cursor:pointer; transition: opacity 0.2s;">
            ❌ Reprovar
          </button>
          <button onclick="avaliarLicao('${item.id}', 'aprovada', '${item.alunoId}', '${item.tipo}', ${item.numero})" style="flex:1; padding:8px; border:none; border-radius:6px; background:#22c55e; color:#fff; font-weight:600; cursor:pointer; transition: opacity 0.2s;">
            ✅ Aprovar
          </button>
        </div>
      </div>
    `).join("");

  } catch (error) {
    console.error("Erro ao carregar lições:", error);
    lista.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #ef4444;'>Erro ao carregar lições. Verifique o console.</p>";
  }
}

window.avaliarLicao = async function(id, novoStatus, alunoId, tipo, numero) {
  const feedback = document.getElementById(`feedback-${id}`).value.trim();
  
  if (!confirm(`Deseja marcar esta lição como ${novoStatus.toUpperCase()}?`)) return;

  try {
    // 1. Atualizar o status da lição e adicionar feedback
    await updateDoc(doc(db, "licoes", id), {
      status: novoStatus,
      observacaoProfessor: feedback,
      avaliadoEm: new Date().toISOString()
    });

    // 2. Se aprovada, atualizar o progresso do aluno na ficha dele
    if (novoStatus === 'aprovada') {
      await updateDoc(doc(db, "alunos", alunoId), {
        [tipo]: numero
      });
    }

    alert(`Lição ${novoStatus} com sucesso!`);
    carregarSolicitacoes(); // Recarregar lista
    
    // Se o painel de alunos estiver carregado em algum lugar, pode ser necessário atualizar
    if (window.renderizarPainel) window.renderizarPainel();

  } catch (error) {
    console.error("Erro ao avaliar lição:", error);
    alert("Erro ao processar avaliação.");
  }
};
