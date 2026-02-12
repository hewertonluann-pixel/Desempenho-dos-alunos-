// professor-alunos.js
// Módulo oficial para gerenciar alunos no Painel do Professor
// Compatível com a arquitetura unificada de CHAMADA DO DIA

import { db } from "../firebase-config.js";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/* ============================================================
   1. CARREGAR ALUNOS
   ============================================================ */
export async function carregarAlunos() {
  const snap = await getDocs(collection(db, "alunos"));
  const alunos = [];

  snap.forEach((d) => {
    alunos.push({ id: d.id, ...d.data() });
  });

  alunos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return alunos;
}

/* ============================================================
   2. RENDERIZAR PAINEL
   ============================================================ */
export async function renderizarPainel(painelEl, loaderEl) {
  painelEl.style.display = "none";
  loaderEl.style.display = "block";

  const alunos = await carregarAlunos();

  painelEl.innerHTML = alunos
    .map((aluno) => criarFichaHTML(aluno))
    .join("");

  loaderEl.style.display = "none";
  painelEl.style.display = "grid";
}

/* ============================================================
   3. GERAR HTML DE CADA FICHA DO ALUNO
   ============================================================ */
function criarFichaHTML(aluno) {
  const foto = aluno.foto
    ? `<img src="${aluno.foto}" alt="${aluno.nome}">`
    : `<img src="https://via.placeholder.com/85" alt="Sem foto">`;

  return `
    <div class="ficha">

      <div class="foto">${foto}
        <input type="file" data-acao="foto" data-id="${aluno.id}" style="margin-top:4px;" />
      </div>

      <div class="dados">

        <div class="campo">
          <label>${aluno.nome}</label>
        </div>

        <div class="campo nota-linha">
          <label>Leitura</label>
          <div class="nota-controle">
            <button class="botao-nota" 
              data-acao="alterar" data-id="${aluno.id}" data-campo="leitura" data-delta="-1">−</button>

            <input type="number" class="campo-nota"
              value="${aluno.leitura ?? 1}"
              data-acao="input" data-id="${aluno.id}" data-campo="leitura">

            <button class="botao-nota" 
              data-acao="alterar" data-id="${aluno.id}" data-campo="leitura" data-delta="1">+</button>
          </div>
        </div>

        <div class="campo nota-linha">
          <label>Método</label>
          <div class="nota-controle">
            <button class="botao-nota"
              data-acao="alterar" data-id="${aluno.id}" data-campo="metodo" data-delta="-1">−</button>

            <input type="number" class="campo-nota"
              value="${aluno.metodo ?? 1}"
              data-acao="input" data-id="${aluno.id}" data-campo="metodo">

            <button class="botao-nota"
              data-acao="alterar" data-id="${aluno.id}" data-campo="metodo" data-delta="1">+</button>
          </div>
        </div>

        <div class="campo">
          <label>Instrumento</label>
          <input type="text" class="campo-nota" style="width:120px;"
            value="${aluno.instrumento ?? ""}"
            data-acao="instrumento" data-id="${aluno.id}">
        </div>

        <div class="acoes">
          <button class="classificar"
            data-acao="classificar"
            data-id="${aluno.id}"
            data-status="${aluno.classificado}">
            ${aluno.classificado ? "Desclassificar" : "Classificar"}
          </button>

          <button class="remover"
            data-acao="remover"
            data-id="${aluno.id}"
            data-nome="${aluno.nome}">
            Remover
          </button>
        </div>

      </div>
    </div>
  `;
}

/* ============================================================
   4. ALTERAR NOTA DE LEITURA OU MÉTODO
   ============================================================ */
export async function alterarNota(id, campo, delta) {
  const ref = doc(db, "alunos", id);
  const valorAtual = parseInt(
    document.querySelector(`[data-id="${id}"][data-campo="${campo}"]`)?.value || "1"
  );

  let novoValor = valorAtual + Number(delta);
  if (novoValor < 1) novoValor = 1;
  if (novoValor > 130) novoValor = 130;

  await updateDoc(ref, { [campo]: novoValor });
}

/* ============================================================
   5. ATUALIZAR NOTA PELO INPUT
   ============================================================ */
export async function atualizarNota(id, campo, valor) {
  let v = parseInt(valor);
  if (isNaN(v) || v < 1) v = 1;
  if (v > 130) v = 130;

  await updateDoc(doc(db, "alunos", id), { [campo]: v });
}

/* ============================================================
   6. ATUALIZAR INSTRUMENTO
   ============================================================ */
export async function atualizarInstrumento(id, novoInstrumento) {
  await updateDoc(doc(db, "alunos", id), {
    instrumento: novoInstrumento.trim()
  });
}

/* ============================================================
   7. CLASSIFICAR / DESCLASSIFICAR
   ============================================================ */
export async function alternarClassificacao(id, classificadoAtual) {
  await updateDoc(doc(db, "alunos", id), {
    classificado: !classificadoAtual
  });
}

/* ============================================================
   8. REMOVER ALUNO
   ============================================================ */
export async function removerAluno(id) {
  await deleteDoc(doc(db, "alunos", id));
}

/* ============================================================
   9. ALTERAR FOTO
   ============================================================ */
export async function alterarFoto(id, arquivo) {
  if (!arquivo) return;

  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(arquivo);
  });

  await updateDoc(doc(db, "alunos", id), { foto: base64 });
}
