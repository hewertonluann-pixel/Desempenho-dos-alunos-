// graficoResumo.js — gráfico horizontal moderno de composição de valores
import "https://cdn.jsdelivr.net/npm/chart.js";

export function gerarGraficoResumo(rows, canvasId = 'graficoResumo') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (window.graficoAtual) window.graficoAtual.destroy();

  // Totais
  let totalISS = 0, totalTFLF = 0, totalOutros = 0;
  rows.forEach(r => {
    const tipo = (r.descricaoResumida || '').toLowerCase();
    const valor = Number(r.valor || 0);
    if (tipo.includes('lançamento de tributo') || tipo.includes('emissão de guia de issqn')) totalISS += valor;
    else if (tipo.includes('apuração de tflf')) totalTFLF += valor;
    else totalOutros += valor;
  });

  // Gradientes de cor
  const gradISS = ctx.createLinearGradient(0, 0, 400, 0);
  gradISS.addColorStop(0, '#3b82f6');
  gradISS.addColorStop(1, '#2563eb');

  const gradTFLF = ctx.createLinearGradient(0, 0, 400, 0);
  gradTFLF.addColorStop(0, '#22c55e');
  gradTFLF.addColorStop(1, '#15803d');

  const gradOutros = ctx.createLinearGradient(0, 0, 400, 0);
  gradOutros.addColorStop(0, '#9ca3af');
  gradOutros.addColorStop(1, '#6b7280');

  window.graficoAtual = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['ISSQN', 'TFLF', 'Outros'],
      datasets: [{
        label: 'Valor arrecadado (R$)',
        data: [totalISS, totalTFLF, totalOutros],
        backgroundColor: [gradISS, gradTFLF, gradOutros],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: '#fff',
          bodyColor: '#e5e7eb',
          cornerRadius: 6,
          displayColors: false,
          callbacks: {
            label: ctx => 'R$ ' + ctx.parsed.x.toLocaleString('pt-BR')
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: '#4b5563',
            callback: v => 'R$ ' + v.toLocaleString('pt-BR')
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#111827', font: { weight: 600 } }
        }
      }
    }
  });
}
