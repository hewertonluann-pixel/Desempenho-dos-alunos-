// ================================
//  gráfico-evolucao.js
//  Cria o painel automaticamente
// ================================

window.gerarGraficoEvolucao = function (aluno, alvo) {
  if (!alvo) return;

  // Monta o painel dentro do card
  alvo.innerHTML = `
    <div class="painel-evolucao" style="
      text-align:center;
      width:100%;
    ">
      <canvas id="canvasEvolucao" height="240"></canvas>

      <div id="legendaEvolucao" style="
        margin-top:12px;
        font-size:1rem;
        font-weight:bold;
        color:#00ffcc;
      "></div>
    </div>
  `;

  const ctx = document.getElementById("canvasEvolucao").getContext("2d");

  const leitura = aluno.leitura || 0;
  const metodo = aluno.metodo || 0;
  const maximo = Math.max(leitura, metodo);
  const maxEscala = maximo <= 50 ? 60 : maximo <= 100 ? 120 : 150;

  new Chart(ctx, {
  type: "line",
  data: { ... },
  options: {
    responsive: true,
    maintainAspectRatio: false,  // 🔥 ESSENCIAL

    plugins: { legend: { display: false } },

    scales: {
      y: {
        beginAtZero: true,
        max: maxEscala,
        ticks: { color: "#ffffff" },
        grid: { color: "rgba(255,255,255,0.15)" }
      },
      x: {
        ticks: { color: "#ffffff" },
        grid: { color: "rgba(255,255,255,0.15)" }
      }
    }
  }
});


  const legenda = document.getElementById("legendaEvolucao");

  legenda.innerHTML = `
    Último avanço: <strong>${
      leitura >= metodo ? `Leitura ${leitura}` : `Método ${metodo}`
    }</strong>
  `;
};
