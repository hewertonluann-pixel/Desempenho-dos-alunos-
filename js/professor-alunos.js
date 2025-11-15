// ===============================
// professor-alunos.js
// Módulo exclusivo de gerenciamento de alunos
// ===============================

import { db } from "../firebase-config.js";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";


// ---------- CARREGAR ALUNOS ----------
export async function carregarAlunos() {
  const snapshot = await getDocs(collection(db, "alunos"));
  const alunos = [];
  snapshot.forEach(docItem => alunos.push({ id: docItem.id, ...docItem.data() }));
  alunos.sort((a, b) => a.nome.localeCompare(b.nome));
  return alunos;
}


// ---------- RENDERIZAR PAINEL ----------
export async function renderizarPainel(painelElem, loaderElem) {
  loaderElem.style.display = "flex";
  painelElem.style.display = "none";

  const alunos = await carregarAlunos();

  painelElem.innerHTML = alunos.map(aluno => `
    <div class="ficha">
      <div class="foto">
        ${aluno.foto ? `<img src="${aluno.foto}" alt="${aluno.nome}">` : "Sem foto"}
      </div>

      <div class="dados">
        <div class="campo"><label>${aluno.nome}</label></div>

        <!-- Leitura -->
        <div class="campo nota-linha">
          <label>Leitura (BONA)</label>
          <div class="nota-controle">
            <button class="botao-nota" data-acao="alterar" data-campo="leitura" data-id="${aluno.id}" data-delta="-1">−</button>
            <input class="campo-nota" type="number" id="leitura-${aluno.id}"
                   value="${aluno.leitura ?? 1}"
                   data-acao="input" data-campo="leitura" data-id="${aluno.id}">
            <button class="botao-nota" data-acao="alterar" data-campo="leitura" data-id="${aluno.id}" data-delta="1">+</button>
          </div>
        </div>

        <!-- Método -->
        <div class="campo nota-linha">
          <label>Método</label>
          <div class="nota-controle">
            <button class="botao-nota" data-acao="alterar" data-campo="metodo" data-id="${aluno.id}" data-delta="-1">−</button>
            <input class="campo-nota" type="number" id="metodo-${aluno.id}"
                   value="${aluno.metodo ?? 1}"
                   data-acao="input" data-campo="metodo" data-id="${aluno.id}">
            <button class="botao-nota" data-acao="alterar" data-campo="metodo" data-id="${aluno.id}" data-delta="1">+</button>
          </div>
        </div>

        <!-- Instrumento -->
        <div class="campo">
          <label>Instrumento</label>
          <input type="text"
                 value="${aluno.instrumento ?? ''}"
                 data-acao="instrumento" data-id="${aluno.id}">
        </div>

        <div class="acoes">
          <button class="classificar"
                  data-acao="classificar"
                  data-id="${aluno.id}"
                  data-status="${aluno.classificado === true}">
            ${aluno.classificado ? "Desclassificar" : "Classificar"}
          </button>

          <button class="remover" data-acao="remover" data-id="${aluno.id}" data-nome="${aluno.nome}">
            Remover
          </button>

          <label class="alterar-foto">📷
            <input type="file" accept="image/*"
                   data-acao="foto" data-id="${aluno.id}">
          </label>
        </div>
      </div>
    </div>
  `).join("");

  loaderElem.style.display = "none";
  painelElem.style.display = "flex";
}


// ---------- ALTERAR NOTA +/− ----------
export async function alterarNota(id, campo, delta) {
  const input = document.getElementById(`${campo}-${id}`);
  let v = Number(input.value) + Number(delta);
  if (v < 1) v = 1;
  if (v > 130) v = 130;

  input.value = v;
  await updateDoc(doc(db, "alunos", id), { [campo]: v });
}


// ---------- ALTERAR NOTA (digitado) ----------
export async function atualizarNota(id, campo, valor) {
  let v = parseInt(valor);
  if (isNaN(v) || v < 1) v = 1;
  if (v > 130) v = 130;

  await updateDoc(doc(db, "alunos", id), { [campo]: v });
}


// ---------- ATUALIZAR INSTRUMENTO ----------
export async function atualizarInstrumento(id, valor) {
  await updateDoc(doc(db, "alunos", id), { instrumento: valor });
}


// ---------- ALTERNAR CLASSIFICAÇÃO ----------
export async function alternarClassificacao(id, atual) {
  await updateDoc(doc(db, "alunos", id), { classificado: !atual });
}


// ---------- REMOVER ALUNO ----------
export async function removerAluno(id) {
  await deleteDoc(doc(db, "alunos", id));
}


// ---------- ALTERAR FOTO ----------
export async function alterarFoto(id, arquivo) {
  const leitor = new FileReader();
  return new Promise((resolve) => {
    leitor.onload = async (e) => {
      await updateDoc(doc(db, "alunos", id), { foto: e.target.result });
      resolve();
    };
    leitor.readAsDataURL(arquivo);
  });
}
