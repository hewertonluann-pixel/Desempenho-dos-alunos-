// ======================
//  gráfico-evolucao.js
// ======================
// Gera o gráfico de evolução técnica (Leitura + Método)
// com painel automático, título e legenda fixa.
// ======================

window.gerarGraficoEvolucao = function (aluno, alvo) {
  if (!alvo) return;

  // Criar painel onde o gráfico será exibido
  alvo.innerHTML = `
    <div class="painel-evolucao-box" style="
      background: rgba(40,40,60,0.45);
      border: 2px solid #00ffcc33;
      border-radius: 16px;
      padding: 14px 16px 18px;
      box-shadow: 0 0 10px rgba(0,255,204,0.08);
      width: 320px;
      margin: 0 auto;
      color: white;
      text-align: center;
    ">
      <h2 style="
        margin-bottom: 6px;
        color: #00ffcc;
        font-size: 1.05rem;
        text-shadow: 0 0 6px rgba(0,255,204,0.3);
      ">📈 Evolução Técnica</h2>

      <canvas id="canvasEvolucao" width="300" height="220"></canvas>

      <div id="legendaEvolucao" style="
        margin-top: 10px;
        text-align: center;
        font-size: .9rem;
        color: #00ffcc;
        font-weight: bold;
      "></div>
    </div>
  `;

  const ctx = document.getElementById("canvasEvolucao").getContext("2d");

  // --- DADOS REAIS DO ALUNO ---
  const leitura = aluno.leitura || 0;
  const metodo = aluno.metodo || 0;

  // --- DEFINIR ESCALA DINÂMICA ---
  const maximo = Math.max(leitura, metodo, 10);
  const maxEscala = maximo <= 50 ? 60 : maximo <= 100 ? 120 : 150;

  // --- CRIAR O GRÁFICO ---
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Leitura (Bona)", "Método"],
      datasets: [
        {
          label: "Pontuação",
          data: [leitura, metodo],
          borderColor: "#00ffcc",
          backgroundColor: "rgba(0,255,204,0.25)",
          borderWidth: 3,
          pointRadius: 7,
          pointBackgroundColor: "#00ffcc",
          pointBorderColor: "#003333",
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: maxEscala,
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
        x: {
          ticks: { color: "#fff" },
          grid: { color: "rgba(255,255,255,0.1)" },
        },
      },
    },
  });

  // --- LEGENDA FIXA (MOSTRA ONDE PAROU) ---
  const legenda = document.getElementById("legendaEvolucao");

  legenda.innerHTML = `
    <div style="
      background: #00ffcc22;
      border: 1px solid #00ffcc55;
      padding: 6px 12px;
      display: inline-block;
      border-radius: 8px;
      color: #00ffcc;
      font-size: 1rem;
      text-align: center;
    ">
      Último progresso: 
      <strong>${leitura >= metodo ? `Leitura ${leitura}` : `Método ${metodo}`}</strong>
    </div>
  `;
};
