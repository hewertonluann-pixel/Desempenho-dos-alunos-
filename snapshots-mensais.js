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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const COLECAO = "snapshotsMensais";

// ── Utilitários ────────────────────────────────────────────────────────────
function getChaveMes(ano, mes) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function getAnoMesAtual() {
  const agora = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  return { ano: agora.getFullYear(), mes: agora.getMonth() + 1 };
}

async function snapExiste(alunoId, chave) {
  const q = query(
    collection(db, COLECAO),
    where("alunoId", "==", alunoId),
    where("chave",   "==", chave)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ── Snapshot automático do mês atual ──────────────────────────────────────
export async function garantirSnapshotDoMes(aluno) {
  const { ano, mes } = getAnoMesAtual();
  const chave = getChaveMes(ano, mes);
  if (await snapExiste(aluno.id, chave)) return false;

  await addDoc(collection(db, COLECAO), {
    alunoId:                aluno.id,
    alunoNome:              aluno.nome,
    ano,
    mes:                    String(mes).padStart(2, "0"),
    chave,
    leitura:                aluno.leitura  ?? 0,
    metodo:                 aluno.metodo   ?? 0,
    licaoLeitura:           aluno.licaoLeitura           || "",
    licaoMetodo:            aluno.licaoMetodo            || "",
    nomeMetodoLeitura:      aluno.solfejoNome             || "Bona",
    nomeMetodoInstrumental: aluno.metodoNome              || "-",
    criadoEm:               serverTimestamp(),
    origem:                 "automatico"
  });
  console.log(`📸 Snapshot criado: ${aluno.nome} · ${chave}`);
  return true;
}

// ── Snapshot retroativo manual (professor) ────────────────────────────────
export async function criarSnapshotRetroativo({
  aluno, ano, mes, leitura, metodo,
  licaoLeitura = "", licaoMetodo = "",
  nomeMetodoLeitura = "Bona", nomeMetodoInstrumental = "-"
}) {
  const chave = getChaveMes(ano, mes);
  const docId = `${aluno.id}_${chave}`;
  await setDoc(doc(db, COLECAO, docId), {
    alunoId: aluno.id, alunoNome: aluno.nome, ano,
    mes: String(mes).padStart(2, "0"), chave,
    leitura, metodo, licaoLeitura, licaoMetodo,
    nomeMetodoLeitura, nomeMetodoInstrumental,
    criadoEm: serverTimestamp(), origem: "retroativo"
  });
  console.log(`📸 Snapshot retroativo: ${aluno.nome} · ${chave}`);
}

// ── Atualizar snapshot do mês atual (ao salvar nível) ──────────────────────
export async function atualizarSnapshotMesAtual(aluno) {
  const { ano, mes } = getAnoMesAtual();
  const chave = getChaveMes(ano, mes);
  const docId = `${aluno.id}_${chave}`;
  await setDoc(doc(db, COLECAO, docId), {
    alunoId: aluno.id, alunoNome: aluno.nome, ano,
    mes: String(mes).padStart(2, "0"), chave,
    leitura:                aluno.leitura  ?? 0,
    metodo:                 aluno.metodo   ?? 0,
    licaoLeitura:           aluno.licaoLeitura           || "",
    licaoMetodo:            aluno.licaoMetodo            || "",
    nomeMetodoLeitura:      aluno.solfejoNome             || "Bona",
    nomeMetodoInstrumental: aluno.metodoNome              || "-",
    criadoEm: serverTimestamp(), origem: "atualizado"
  });
  console.log(`🔄 Snapshot atualizado: ${aluno.nome} · ${chave}`);
}

// ── Carregar snapshots de um aluno ──────────────────────────────────────────
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
    const q2 = query(collection(db, COLECAO), where("alunoId", "==", aluno.id));
    snap = await getDocs(q2);
  }
  const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => a.chave.localeCompare(b.chave));
  return lista;
}

// ── Carregar snapshots de todos os alunos ──────────────────────────────────
export async function carregarTodosSnapshots() {
  const snap = await getDocs(collection(db, COLECAO));
  const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  lista.sort((a, b) => a.chave.localeCompare(b.chave));
  return lista;
}

// ============================================================
// PREENCHIMENTO AUTOMÁTICO INTELIGENTE DE PEGADAS
// Lógica:
//   1. Nível inicial padrão: leitura=60, metodo=1
//   2. Busca notificações de alteração de nível do aluno
//   3. Reconstrói a linha do tempo mês a mês desde Jan/ano
//      até o mês atual, aplicando alterações quando ocorreram
//   4. Pula meses que já possuem snapshot salvo
// ============================================================
export async function preenchimentoAutomaticoPegadas(aluno, anoAlvo, onProgress) {
  const LEITURA_INICIAL = 60;
  const METODO_INICIAL  = 1;

  const { ano: anoAtual, mes: mesAtual } = getAnoMesAtual();
  const ano = anoAlvo || anoAtual;

  // ── 1. Buscar notificações de nível do aluno ─────────────────────────────
  const snapNotif = await getDocs(
    query(
      collection(db, "notificacoes"),
      where("tipo",      "==", "nivel"),
      where("alunoNome", "==", aluno.nome)
    )
  );

  // Mapear alterações por chave "YYYY-MM"
  // Cada entrada: { leitura?: number, metodo?: number }
  const alteracoesPorMes = {};

  snapNotif.forEach(d => {
    const notif = d.data();
    // Extrair data da notificação
    let dt;
    if (notif.data && typeof notif.data.toDate === "function") dt = notif.data.toDate();
    else if (notif.data instanceof Date) dt = notif.data;
    else dt = null;

    if (!dt) return;

    const nAno = dt.getFullYear();
    const nMes = String(dt.getMonth() + 1).padStart(2, "0");
    const chave = `${nAno}-${nMes}`;

    if (!alteracoesPorMes[chave]) alteracoesPorMes[chave] = {};

    // Detectar se é leitura ou método pelo texto da notificação
    const texto = notif.texto || "";
    // Extrair o número do nível: "Nível 65 de leitura" ou "Nível 5 de método"
    const matchNivel = texto.match(/Nível\s+(\d+)/i);
    const novoNivel  = matchNivel ? Number(matchNivel[1]) : null;

    if (novoNivel === null) return;

    if (/leitura/i.test(texto)) {
      // Guarda o maior nível de leitura registrado no mês
      if (!alteracoesPorMes[chave].leitura || novoNivel > alteracoesPorMes[chave].leitura) {
        alteracoesPorMes[chave].leitura = novoNivel;
      }
    } else if (/método|metodo/i.test(texto)) {
      if (!alteracoesPorMes[chave].metodo || novoNivel > alteracoesPorMes[chave].metodo) {
        alteracoesPorMes[chave].metodo = novoNivel;
      }
    }
  });

  console.log(`📊 Alterações encontradas para ${aluno.nome}:`, alteracoesPorMes);

  // ── 2. Verificar snapshots já existentes ───────────────────────────────────
  const snapExistentes = await carregarSnapshotsAluno(aluno);
  const chavesExistentes = new Set(snapExistentes.map(s => s.chave));

  // ── 3. Reconstruir linha do tempo mês a mês ──────────────────────────────
  let leituraAtual = LEITURA_INICIAL;
  let metodoAtual  = METODO_INICIAL;

  // Se o aluno já tem nível diferente do padrão e NÃO há nenhuma notificação,
  // usa o nível atual do aluno como base para todos os meses
  const temAlteracoes = Object.keys(alteracoesPorMes).length > 0;
  if (!temAlteracoes) {
    leituraAtual = aluno.leitura ?? LEITURA_INICIAL;
    metodoAtual  = aluno.metodo  ?? METODO_INICIAL;
  }

  const mesFinal = (ano === anoAtual) ? mesAtual : 12;
  let criados    = 0;
  let pulados    = 0;

  for (let mes = 1; mes <= mesFinal; mes++) {
    const chave = getChaveMes(ano, mes);

    // Aplicar alteração se houver neste mês
    if (alteracoesPorMes[chave]) {
      if (alteracoesPorMes[chave].leitura != null)
        leituraAtual = alteracoesPorMes[chave].leitura;
      if (alteracoesPorMes[chave].metodo != null)
        metodoAtual  = alteracoesPorMes[chave].metodo;
    }

    // Pular se já existe snapshot salvo
    if (chavesExistentes.has(chave)) {
      pulados++;
      if (onProgress) onProgress({ chave, status: "pulado", leitura: leituraAtual, metodo: metodoAtual });
      continue;
    }

    // Criar snapshot com ID determinístico (não duplica)
    const docId = `${aluno.id}_${chave}`;
    await setDoc(doc(db, COLECAO, docId), {
      alunoId:                aluno.id,
      alunoNome:              aluno.nome,
      ano,
      mes:                    String(mes).padStart(2, "0"),
      chave,
      leitura:                leituraAtual,
      metodo:                 metodoAtual,
      licaoLeitura:           "",
      licaoMetodo:            "",
      nomeMetodoLeitura:      aluno.solfejoNome  || "Bona",
      nomeMetodoInstrumental: aluno.metodoNome   || "-",
      criadoEm:               serverTimestamp(),
      origem:                 "automatico-inteligente"
    });

    criados++;
    if (onProgress) onProgress({ chave, status: "criado", leitura: leituraAtual, metodo: metodoAtual });
    console.log(`✅ ${aluno.nome} · ${chave} → Leitura ${leituraAtual} · Método ${metodoAtual}`);
  }

  return { criados, pulados };
}

// ============================================================
// PREENCHIMENTO EM LOTE — TODOS OS ALUNOS
// Chama preenchimentoAutomaticoPegadas para cada aluno
// ============================================================
export async function preenchimentoAutomaticoTodosAlunos(ano, onProgress) {
  const snapAlunos = await getDocs(collection(db, "alunos"));
  const alunos = snapAlunos.docs.map(d => ({ id: d.id, ...d.data() }));

  let totalCriados = 0;
  let totalPulados = 0;
  let processados  = 0;

  for (const aluno of alunos) {
    if (onProgress) onProgress({
      fase: "aluno",
      nome: aluno.nome,
      processados,
      total: alunos.length
    });

    const result = await preenchimentoAutomaticoPegadas(aluno, ano, (detalhe) => {
      if (onProgress) onProgress({ fase: "mes", nome: aluno.nome, ...detalhe });
    });

    totalCriados += result.criados;
    totalPulados += result.pulados;
    processados++;
  }

  return { totalCriados, totalPulados, totalAlunos: alunos.length };
}
