// frequencia.js
// ======================================================
// SISTEMA UNIFICADO DE FREQUÊNCIA
// Alimenta o gráfico anual, o gráfico mensal (bolinhas),
// o popup, e o painel de energia do aluno.
// ======================================================

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/* ======================================================
   1. OBTER TODOS OS EVENTOS DO ANO
   ====================================================== */
export async function obterEventosDoAno(ano) {
  const snap = await getDocs(collection(db, "eventos"));

  const eventos = [];
  snap.forEach(doc => {
    const dados = doc.data();
    if (!dados.data) return;

    if (dados.data.startsWith(`${ano}-`)) {
      eventos.push({
        data: dados.data,
        presencas: dados.presencas || []
      });
    }
  });

  return eventos;
}

/* ======================================================
   2. AGRUPAR EVENTOS POR MÊS
   ====================================================== */
export function agruparEventosPorMes(eventos) {
  const grupos = {};

  eventos.forEach(e => {
    const mes = e.data.slice(0, 7); // "2025-11"

    if (!grupos[mes]) grupos[mes] = [];
    grupos[mes].push(e);
  });

  return grupos;
}

/* ======================================================
   3. CALCULAR FREQUÊNCIA DO ALUNO NO MÊS
   ====================================================== */
export function calcularFrequenciaMensalParaAluno(eventosMes, nomeAluno) {
  if (!eventosMes || eventosMes.length === 0) {
    return {
      totalEventos: 0,
      presencasAluno: 0,
      percentual: 0
    };
  }

  const totalEventos = eventosMes.length;

  let presencasAluno = 0;

  eventosMes.forEach(ev => {
    const hit = ev.presencas.find(p => p.nome === nomeAluno);
    if (hit && hit.presenca === "presente") {
      presencasAluno++;
    }
  });

  const percentual = Math.round((presencasAluno / totalEventos) * 100);

  return { totalEventos, presencasAluno, percentual };
}

/* ======================================================
   4. GERAR GRADE DE FREQUÊNCIA MENSAL (bolinhas)
   ====================================================== */
  const mesesAbreviados = {
    "01": "JAN", "02": "FEV", "03": "MAR", "04": "ABR",
    "05": "MAI", "06": "JUN", "07": "JUL", "08": "AGO",
    "09": "SET", "10": "OUT", "11": "NOV", "12": "DEZ"
  };

  export async function gerarPainelFrequencia(aluno, ano, elementoDestino, abrirPopupCallback) {
  if (!elementoDestino) return;

  elementoDestino.innerHTML = "";

  const eventosAno = await obterEventosDoAno(ano);
  const agrupado = agruparEventosPorMes(eventosAno);

  const meses = [
    "01","02","03","04","05","06",
    "07","08","09","10","11","12"
  ];

  meses.forEach(mesNumero => {
    const chaveMes = `${ano}-${mesNumero}`;

    const eventosMes = agrupado[chaveMes] || [];

    const freq = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);

    const mesAbreviado = mesesAbreviados[mesNumero];

    const mesCard = document.createElement("div");
    mesCard.className = "month-card";
    mesCard.onclick = () => abrirPopupCallback({
      mes: mesNumero,
      ...freq
    });

    // Gráfico de pizza (donut) com porcentagem centralizada
    mesCard.innerHTML = `
      <div class="pie-chart" style="--p: ${freq.percentual};">
        <div class="pie-center">
          <span class="pie-value">${freq.percentual}%</span>
        </div>
      </div>
      <span class="month-name">${mesAbreviado}</span>
    `;

    elementoDestino.appendChild(mesCard);
  });
}


