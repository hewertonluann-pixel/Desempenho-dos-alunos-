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
      position: relative;
      min-height: 260px;
    ">
      <canvas id="canvasEvolucao" style="width:100%; height:240px;"></canvas>

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
    data: {
      labels: ["Leitura (Bona)", "Método"],
      datasets: [
        {
          label: "Pontuação",
          data: [leitura, metodo],
          borderColor: "#00ffcc",
          backgroundColor: "rgba(0,255,204,0.25)",
          pointBorderColor: "#003333",
          borderWidth: 3,
          pointBackgroundColor: "#00ffcc",
          pointRadius: 7,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: { display: false }
      },

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
