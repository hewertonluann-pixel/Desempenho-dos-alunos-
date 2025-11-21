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
 * @param {Object} dados 
 *  - alunoId
 *  - alunoNome
 *  - tipo: "bona" | "metodo"
 *  - valor: número da lição
 *  - origem: "professor" | "enviar_licao" | "retroativo"
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
 * Carrega o histórico completo do aluno
 * @param {*} aluno
 * @returns Array ordenado por data crescente
 */
export async function carregarHistoricoProgressoAluno(aluno) {
  const consultas = query(
    collection(db, "historicoProgresso"),
    where("alunoId", "==", aluno.id),
    orderBy("data", "asc")
  );

  const snap = await getDocs(consultas);
  const lista = [];

  snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));

  return lista;
}

/**
 * Registrar retroativo inicial baseado nos valores atuais
 * (opcional na primeira execução)
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
