// ==========================================
// evolucao-teste.js
// Criar histórico de teste para um aluno
// e limpar histórico
// ==========================================

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/**
 * Gera histórico de progresso de exemplo
 * para o aluno informado pelo NOME.
 *
 * @param {string} nomeAluno
 */
export async function gerarHistoricoTeste(nomeAluno) {
  console.log("🔵 Gerando histórico de teste para:", nomeAluno);

  // Carrega aluno pelo nome
  const snapAlunos = await getDocs(collection(db, "alunos"));
  let aluno = null;

  snapAlunos.forEach((d) => {
    const dados = d.data();
    if (dados.nome.toLowerCase() === nomeAluno.toLowerCase()) {
      aluno = { id: d.id, ...dados };
    }
  });

  if (!aluno) {
    alert("Aluno não encontrado!");
    return;
  }

  const meses = [
    { mes: 1, bona: 5, metodo: 2 },
    { mes: 2, bona: 8, metodo: 3 },
    { mes: 3, bona: 15, metodo: 6 },
    { mes: 4, bona: 20, metodo: 9 },
    { mes: 5, bona: 28, metodo: 12 },
    { mes: 6, bona: 35, metodo: 17 },
    { mes: 7, bona: 44, metodo: 20 },
    { mes: 8, bona: 50, metodo: 25 },
    { mes: 9, bona: 60, metodo: 28 },
    { mes: 10, bona: 75, metodo: 31 },
    { mes: 11, bona: aluno.leitura || 80, metodo: aluno.metodo || 35 }
  ];

  const ano = new Date().getFullYear();

  for (const m of meses) {
    const data = new Date(ano, m.mes - 1, 10); // dia 10 de cada mês

    await addDoc(collection(db, "historicoProgresso"), {
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      tipo: "bona",
      valor: m.bona,
      origem: "simulado",
      data
    });

    await addDoc(collection(db, "historicoProgresso"), {
      alunoId: aluno.id,
      alunoNome: aluno.nome,
      tipo: "metodo",
      valor: m.metodo,
      origem: "simulado",
      data
    });

    console.log(`✔ Inserido mês ${m.mes}`);
  }

  alert("Histórico de teste criado com sucesso!");
}

/**
 * Remove TODO o histórico de um aluno pelo nome.
 *
 * @param {string} nomeAluno
 */
export async function limparHistorico(nomeAluno) {
  console.log("🗑 Limpando histórico de:", nomeAluno);

  const snapAlunos = await getDocs(collection(db, "alunos"));
  let aluno = null;

  snapAlunos.forEach((d) => {
    if (d.data().nome.toLowerCase() === nomeAluno.toLowerCase()) {
      aluno = { id: d.id, ...d.data() };
    }
  });

  if (!aluno) {
    alert("Aluno não encontrado!");
    return;
  }

  const q = query(
    collection(db, "historicoProgresso"),
    where("alunoId", "==", aluno.id)
  );

  const snapHist = await getDocs(q);

  let contador = 0;

  for (const docHist of snapHist.docs) {
    await deleteDoc(doc(db, "historicoProgresso", docHist.id));
    contador++;
  }

  alert(`Histórico apagado: ${contador} registros.`);
}
