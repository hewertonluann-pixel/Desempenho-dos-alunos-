// dashboard-professor.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Onde será inserido o dashboard
export async function montarDashboardProfessor(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="dash-grid">
      <div class="dash-card" id="dashPresenca"></div>
      <div class="dash-card" id="dashEnergia"></div>
      <div class="dash-card" id="dashEnsaios"></div>
      <div class="dash-card" id="dashAlunos"></div>
    </div>
  `;

  container.style.marginTop = "20px";

  await carregarDadosDashboard();
}

async function carregarDadosDashboard() {
  const alunosSnap = await getDocs(collection(db, "alunos"));
  const eventosSnap = await getDocs(collection(db, "eventos"));

  let totalAlunos = alunosSnap.size;
  let somaFrequencia = 0;
  let somaEnergia = 0;

  alunosSnap.forEach(doc => {
    const dados = doc.data();
    somaEnergia += dados.energia ?? 0;
    somaFrequencia += dados.frequenciaMensal?.porcentagem ?? 0;
  });

  const presencaMedia = totalAlunos > 0 ? Math.round(somaFrequencia / totalAlunos) : 0;
  const energiaMedia = totalAlunos > 0 ? Math.round(somaEnergia / totalAlunos) : 0;

  // Ensaios do mês atual
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0,7); // YYYY-MM
  let totalEnsaiosMes = 0;

  eventosSnap.forEach(doc => {
    const dados = doc.data();
    if (dados.data?.startsWith(mesAtual)) {
      totalEnsaiosMes++;
    }
  });

  // Preencher cards
  atualizarCard("dashPresenca", "Presença Média", presencaMedia + "%");
  atualizarCard("dashEnergia", "Energia Média", energiaMedia);
  atualizarCard("dashEnsaios", "Ensaios no Mês", totalEnsaiosMes);
  atualizarCard("dashAlunos", "Alunos Ativos", totalAlunos);
}

function atualizarCard(id, titulo, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `
    <h3>${titulo}</h3>
    <p>${valor}</p>
  `;
}
