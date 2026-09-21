import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { obterEventosDoAno, agruparEventosPorMes } from "./frequencia.js";
import { calcularFrequenciaElegivel } from "./participacoes.js";

const MESES_ABREVIADOS = {
  "01": "JAN", "02": "FEV", "03": "MAR", "04": "ABR",
  "05": "MAI", "06": "JUN", "07": "JUL", "08": "AGO",
  "09": "SET", "10": "OUT", "11": "NOV", "12": "DEZ"
};

function chaveMesAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function normalizarChaveMes(valor) {
  const texto = String(valor || chaveMesAtual());
  return /^\d{4}-\d{2}$/.test(texto) ? texto : chaveMesAtual();
}

/**
 * Recalcula os dados derivados de frequência de um mês usando as chamadas
 * que continuam na coleção eventos. O Coral não altera o comprometimento
 * da turma principal, pois seus alunos normalmente não têm turmaId coral.
 */
export async function atualizarComprometimentoMes({ mes = chaveMesAtual(), turmaId = null } = {}) {
  const chave = normalizarChaveMes(mes);
  const [ano] = chave.split("-");
  const alunosSnap = await getDocs(collection(db, "alunos"));
  const eventosPorTurma = {};

  const carregarEventosTurma = async id => {
    if (!id || eventosPorTurma[id]) return;
    const eventos = await obterEventosDoAno(Number(ano), id);
    eventosPorTurma[id] = agruparEventosPorMes(eventos);
  };

  let atualizados = 0;
  for (const alunoDoc of alunosSnap.docs) {
    const dados = alunoDoc.data();
    if (dados.ativo === false) continue;

    const alunoTurmaId = dados.turmaId || null;
    if (turmaId && alunoTurmaId !== turmaId) continue;

    if (!alunoTurmaId) {
      if (turmaId) continue;
      await updateDoc(doc(db, "alunos", alunoDoc.id), {
        "frequenciaMensal.porcentagem": 0,
        "frequenciaMensal.totalEventos": 0,
        "frequenciaMensal.presencas": 0,
        ultimaAtualizacaoComprometimento: serverTimestamp()
      });
      atualizados++;
      continue;
    }

    await carregarEventosTurma(alunoTurmaId);
    const eventosMes = eventosPorTurma[alunoTurmaId][chave] || [];
    const freq = calcularFrequenciaElegivel(
      eventosMes,
      { id: alunoDoc.id, ...dados },
      alunoTurmaId
    );

    const frequenciaAnual = { ...(dados.frequenciaAnual || {}) };
    const mesNumero = chave.slice(5, 7);
    const sigla = MESES_ABREVIADOS[mesNumero] || mesNumero;
    frequenciaAnual[sigla] = {
      percentual: freq.percentual,
      totalEnsaios: freq.totalAvaliadas,
      presencasAluno: freq.presencasAluno,
      ausencias: freq.ausencias,
      justificadas: freq.justificadas
    };

    await updateDoc(doc(db, "alunos", alunoDoc.id), {
      "frequenciaMensal.porcentagem": freq.percentual,
      "frequenciaMensal.percentual": freq.percentual,
      "frequenciaMensal.totalEventos": freq.totalEventos,
      "frequenciaMensal.presencas": freq.presencasAluno,
      "frequenciaMensal.ausencias": freq.ausencias,
      "frequenciaMensal.justificadas": freq.justificadas,
      [`frequenciaAnual.${sigla}`]: frequenciaAnual[sigla],
      ultimaAtualizacaoComprometimento: serverTimestamp()
    });
    atualizados++;
  }

  return { mes: chave, turmaId, atualizados };
}

export async function atualizarComprometimentoGeral() {
  return atualizarComprometimentoMes();
}
