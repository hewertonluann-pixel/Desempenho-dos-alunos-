// ============================================================
// snapshots-mensais.js
// Sistema de "pegadas mensais" de evolução técnica
// Garante 1 registro por aluno por mês, sem duplicatas
// ============================================================

import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const COLECAO = "snapshotsMensais";

// ── Utilitário: chave do mês atual ───────────────────────────────────────────
function getChaveMes(ano, mes) {
  // mes = 1..12
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function getAnoMesAtual() {
  const agora = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };
}

// ── Verificar se já existe snapshot para este aluno/mês ─────────────────────
async function snapExiste(alunoId, chave) {
  const q = query(
    collection(db, COLECAO),
    where("alunoId", "==", alunoId),
    where("chave",   "==", chave)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Criar snapshot (chamado automaticamente ao abrir o painel) ───────────────
export async function garantirSnapshotDoMes(aluno) {
  const { ano, mes } = getAnoMesAtual();
  const chave = getChaveMes(ano, mes);

  // Anti-duplicata
  if (await snapExiste(aluno.id, chave)) return false; // já existe

  await addDoc(collection(db, COLECAO), {
    alunoId:               aluno.id,
    alunoNome:             aluno.nome,
    ano,
    mes:                   String(mes).padStart(2, "0"),
    chave,
    leitura:               aluno.leitura  ?? 0,
    metodo:                aluno.metodo   ?? 0,
    licaoLeitura:          aluno.licaoLeitura          || "",
    licaoMetodo:           aluno.licaoMetodo           || "",
    nomeMetodoLeitura:     aluno.solfejoNome            || "Bona",
    nomeMetodoInstrumental:aluno.metodoNome             || "-",
    criadoEm:              serverTimestamp(),
    origem:                "automatico"
  });

  console.log(`📸 Snapshot criado: ${aluno.nome} · ${chave}`);
  return true; // novo snapshot criado
}

// ── Criar snapshot retroativo (chamado pelo professor) ───────────────────────
export async function criarSnapshotRetroativo({
  aluno, ano, mes,
  leitura, metodo,
  licaoLeitura = "", licaoMetodo = "",
  nomeMetodoLeitura = "Bona", nomeMetodoInstrumental = "-"
}) {
  const chave = getChaveMes(ano, mes);

  // Usa setDoc com ID determinístico → sobrescreve se já existir
  const docId = `${aluno.id}_${chave}`;
  await setDoc(doc(db, COLECAO, docId), {
    alunoId:               aluno.id,
    alunoNome:             aluno.nome,
    ano,
    mes:                   String(mes).padStart(2, "0"),
    chave,
    leitura,
    metodo,
    licaoLeitura,
    licaoMetodo,
    nomeMetodoLeitura,
    nomeMetodoInstrumental,
    criadoEm:              serverTimestamp(),
    origem:                "retroativo"
  });

  console.log(`📸 Snapshot retroativo: ${aluno.nome} · ${chave}`);
}

// ── Forçar atualização do snapshot do mês atual (ao salvar nível) ────────────
export async function atualizarSnapshotMesAtual(aluno) {
  const { ano, mes } = getAnoMesAtual();
  const chave = getChaveMes(ano, mes);
  const docId = `${aluno.id}_${chave}`;

  await setDoc(doc(db, COLECAO, docId), {
    alunoId:               aluno.id,
    alunoNome:             aluno.nome,
    ano,
    mes:                   String(mes).padStart(2, "0"),
    chave,
    leitura:               aluno.leitura  ?? 0,
    metodo:                aluno.metodo   ?? 0,
    licaoLeitura:          aluno.licaoLeitura          || "",
    licaoMetodo:           aluno.licaoMetodo           || "",
    nomeMetodoLeitura:     aluno.solfejoNome            || "Bona",
    nomeMetodoInstrumental:aluno.metodoNome             || "-",
    criadoEm:              serverTimestamp(),
    origem:                "atualizado"
  });

  console.log(`🔄 Snapshot atualizado: ${aluno.nome} · ${chave}`);
}

// ── Carregar todos os snapshots de um aluno (ordenados por data) ─────────────
export async function carregarSnapshotsAluno(aluno) {
  let snap;
  try {
    const q = query(
      collection(db, COLECAO),
      where("alunoId", "==", aluno.id),
      orderBy("chave", "asc")
    );
    snap = await getDocs(q);
  } catch {
    // fallback sem índice
    const q2 = query(
      collection(db, COLECAO),
      where("alunoId", "==", aluno.id)
    );
    snap = await getDocs(q2);
  }

  const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => a.chave.localeCompare(b.chave));
  return lista;
}

// ── Carregar snapshots de TODOS os alunos (para o professor) ─────────────────
export async function carregarTodosSnapshots() {
  const snap = await getDocs(collection(db, COLECAO));
  const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => a.chave.localeCompare(b.chave));
  return lista;
}
