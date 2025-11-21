// ================================
// evolucao.js
// Registro e leitura de progresso
// ================================

import { db } from "./firebase-config.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/**
 * Registrar evolução de leitura ou método.
 */
export async function registrarHistoricoProgresso(dados) {
  try {
    await addDoc(collection(db, "historicoProgresso"), {
      alunoId: dados.alunoId,
      alunoNome: dados.alunoNome,
      tipo: dados.tipo,
      valor: dados.valor,
      origem: dados.origem || "manual",
      data: serverTimestamp()
    });
    console.log("Histórico registrado:", dados);
  } catch (erro) {
    console.error("Erro ao registrar histórico:", erro);
  }
}

/**
 * Carrega histórico ordenado corretamente, mesmo sem índice.
 */
export async function carregarHistoricoProgressoAluno(aluno) {
  const colRef = collection(db, "historicoProgresso");

  let snap;

  try {
    // ⚠ TENTATIVA COM ORDEM → pode exigir índice
    const q = query(
      colRef,
      where("alunoId", "==", aluno.id),
      orderBy("data", "asc")
    );

    snap = await getDocs(q);
  } catch (e) {
    console.warn("Sem índice composto. Usando fallback automático.");

    // 🔥 Fallback sem orderBy (não exige índice)
    const q2 = query(
      colRef,
      where("alunoId", "==", aluno.id)
    );

    snap = await getDocs(q2);
  }

  // Converte e ordena manualmente
  const lista = [];

  snap.forEach((d) => {
    const data = d.data();

    // Converter serverTimestamp() para JS Date
    let dt;
    if (data.data && typeof data.data.toDate === "function") {
      dt = data.data.toDate();
    } else if (data.data instanceof Date) {
      dt = data.data;
    } else if (typeof data.data === "string") {
      dt = new Date(data.data);
    } else {
      dt = new Date();
    }

    lista.push({
      id: d.id,
      ...data,
      data: dt
    });
  });

  // Ordena do mais antigo para o mais recente
  lista.sort((a, b) => a.data - b.data);

  return lista;
}

/**
 * Registrar ponto inicial retroativo
 */
export async function registrarPontoInicial(aluno) {
  await registrarHistoricoProgresso({
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    tipo: "bona",
    valor: aluno.leitura ?? 0,
    origem: "retroativo"
  });

  await registrarHistoricoProgresso({
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    tipo: "metodo",
    valor: aluno.metodo ?? 0,
    origem: "retroativo"
  });
}
