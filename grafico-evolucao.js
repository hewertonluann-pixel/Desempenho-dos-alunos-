// ================================================
//  GRAFICO DE EVOLUÇÃO - SCRIPT PARA PAGINA ALUNO
// ================================================
//  - Puxa dados reais do Firestore
//  - Cria histórico de 12 meses (JAN–DEZ)
//  - Gráfico neon com 2 eixos (Bona / Método)
//  - Frequência real como gráfico de fundo
//  - Marcador neon no último valor
// ================================================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// ------------------------------------------------------
//  1. OBTER ALUNO REAL / FIRESTORE (busca por nome)
// ------------------------------------------------------
export async function carregarAlunoReal() {
  const params = new URLSearchParams(window.location.search);
  const nome = params.get("nome");

  if (!nome) {
    console.error("Nome do aluno não informado na URL");
    return null;
  }

  // Buscar aluno pelo campo "nome" (correto)
  const q = query(collection(db, "alunos"), where("nome", "==", nome));
  const snap = await getDocs(q);

  if (snap.empty) {
    console.error("Aluno não encontrado no Firestore:", nome);
    return null;
  }

  return snap.docs[0].data();
}


// ------------------------------------------------------
//  2. GERAR HISTÓRICO DE 12 MESES (BONA / MÉTODO)
// ------------------------------------------------------
function gerarHistorico(valorAtual, tipo) {
  let inicio = tipo === "bona" ? 60 : 1;
  let fim = valorAtual;
  let pontos = 12;  // AGORA SÃO 12 MESES DO ANO

  if (fim < inicio) fim = inicio;

  let delta = (fim - inicio) / (pontos - 1);
  let vetor = [];

  for (let i = 0; i < pontos; i++) {
    vetor.push(Math.round(inicio + delta * i));
  }

  return vetor;
}


// ------------------------------------------------------
//  3. MONTAR OBJETO FINAL PARA O GRÁFICO
// ------------------------------------------------------
export function montarDadosParaGrafico(aluno) {
  const meses = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

  // Frequência REAL por mês
  const frequencia = meses.map(m => {
    return aluno.frequenciaAnual?.[m]?.percentual || 0;
  });

  return {
    meses,
    bona: gerarHistorico(aluno.leitura || 60, "bona"),
    metodo: gerarHistorico(aluno.metodo || 1, "metodo"),
    frequencia
  };
}


// =======================================================
//  4. PLUGIN DO MARCADOR NEON (mostra último valor)
// =======================================================
const ultimoValorPlugin = {
  id: "ultimoValor",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[1];
    const meta = chart.getDatasetMeta(1);

    if (!meta || !meta.data || meta.data.length === 0) return;

    const ponto = meta.data[meta.data.length - 1];
    const valor = dataset.data[dataset.data.length - 1];

    ctx.save();
    ctx.font = "bold 13px Inter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const largura = 42;
    const altura = 22;

    const rectX = ponto.x - largura - 10;
    const rectY = ponto.y - altura / 2;

    ctx.fillStyle = "rgba(14,165,233,0.85)";
    ctx.fillRect(rectX, rectY, largura, altura);

    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(rectX, rectY, largura, altura);

    ctx.fillStyle = "#fff";
    ctx.fillText(valor, rectX + largura / 2, rectY + altura / 2);

    ctx.restore();
  }
};


// =======================================================
//  5. MONTAR O GRÁFICO (Chart.js)
// =======================================================
export function montarGraficoEvolucao(idCanvas, dados) {
  const ctx = document.getElementById(idCanvas).getContext("2d");

  const ticksBona = [60, 80, 100, 120];
  const ticksMetodo = [0, 10, 20, 30, 40, 50];

  let grafico = new Chart(ctx, {
    type: "line",
    plugins: [ultimoValorPlugin],
    data: {
      labels: dados.meses,
      datasets: [
        {
          label: "Frequência (%)",
          data: dados.frequencia,
          fill: true,
          borderColor: "rgba(14,165,233,0)",
          backgroundColor: "rgba(14,165,233,0.18)",
          tension: 0.3,
          pointRadius: 0,
          yAxisID: "yFreq"
        },
        {
          label: "Bona",
          data: dados.bona,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.15)",
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          yAxisID: "yBona"
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
        yBona: {
          min: 60,
          max: 120,
          ticks: {
            color: "#e2e8f0",
            callback: v => ticksBona.includes(v) ? v : ""
          },
          grid: { color: "rgba(255,255,255,0.05)" },
          position: "left"
        },

        yMetodo: {
          min: 0,
          max: 50,
          ticks: {
            color: "#e2e8f0",
            callback: v => ticksMetodo.includes(v) ? v : ""
          },
          grid: { color: "rgba(255,255,255,0.05)" },
          display: false,
          position: "left"
        },

        yFreq: {
          min: 0,
          max: 100,
          display: false
        },

        x: {
          ticks: { color: "#e2e8f0" },
          grid: { display: false }
        }
      }
    }
  });


  // -----------------------------------------------------
  // BOTÕES (trocar entre Bona e Método)
  // -----------------------------------------------------
  const btnBona = document.getElementById("btnBona");
  const btnMetodo = document.getElementById("btnMetodo");

  btnBona.onclick = () => {
    btnBona.classList.add("ativo");
    btnMetodo.classList.remove("ativo");

    grafico.data.datasets[1].label = "Bona";
    grafico.data.datasets[1].data = dados.bona;
    grafico.data.datasets[1].borderColor = "#3b82f6";
    grafico.data.datasets[1].backgroundColor = "rgba(59,130,246,0.15)";
    grafico.data.datasets[1].yAxisID = "yBona";

    grafico.options.scales.yBona.display = true;
    grafico.options.scales.yMetodo.display = false;

    grafico.update();
  };

  btnMetodo.onclick = () => {
    btnMetodo.classList.add("ativo");
    btnBona.classList.remove("ativo");

    grafico.data.datasets[1].label = "Método";
    grafico.data.datasets[1].data = dados.metodo;
    grafico.data.datasets[1].borderColor = "#22c55e";
    grafico.data.datasets[1].backgroundColor = "rgba(34,197,94,0.15)";
    grafico.data.datasets[1].yAxisID = "yMetodo";

    grafico.options.scales.yBona.display = false;
    grafico.options.scales.yMetodo.display = true;

    grafico.update();
  };
}
