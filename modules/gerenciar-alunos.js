import {
  carregarAlunos,
  renderizarPainel,
  alterarNota,
  atualizarNota,
  atualizarInstrumento,
  alternarClassificacao,
  alternarAtivo,
  removerAluno,
  alterarFoto
} from "../js/professor-alunos.js";

import { db } from "../firebase-config.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const painel = document.getElementById("painelGerenciar");
const loader = document.getElementById("loaderGerAlunos");

/* === RENDERIZA AO ABRIR MÓDULO === */
(async () => {
  await renderizarPainel(painel, loader);
})();

/* === EVENTOS DO PAINEL === */
painel.addEventListener("click", async (e) => {
  const el = e.target;
  if (!el.dataset?.acao) return;

  if (el.dataset.acao === "alterar") {
    await alterarNota(el.dataset.id, el.dataset.campo, el.dataset.delta);
  }
  if (el.dataset.acao === "remover") {
    if (confirm(`Remover o aluno ${el.dataset.nome}?`)) {
      await removerAluno(el.dataset.id);
      await renderizarPainel(painel, loader);
    }
  }
  if (el.dataset.acao === "classificar") {
    await alternarClassificacao(el.dataset.id, el.dataset.status === "true");
    await renderizarPainel(painel, loader);
  }
  if (el.dataset.acao === "alternarAtivo") {
    await alternarAtivo(el.dataset.id, el.dataset.status === "true");
    await renderizarPainel(painel, loader);
  }
});

/* === INPUTS (notas e instrumento) === */
painel.addEventListener("change", async (e) => {
  const el = e.target;
  if (el.dataset.acao === "input") {
    await atualizarNota(el.dataset.id, el.dataset.campo, el.value);
  }
  if (el.dataset.acao === "instrumento") {
    await atualizarInstrumento(el.dataset.id, el.value);
  }
  if (el.dataset.acao === "foto") {
    await alterarFoto(el.dataset.id, el.files[0]);
    await renderizarPainel(painel, loader);
  }
});

/* === MODAL ADICIONAR ALUNO === */
const modal = document.getElementById("modalAddAluno");
document.getElementById("btnAddNovoAluno").onclick = () => modal.style.display = "flex";
document.getElementById("cancelAddAluno").onclick = () => modal.style.display = "none";

document.getElementById("confirmAddAluno").onclick = async () => {
  const nome = document.getElementById("novoNomeAluno").value.trim();
  const instr = document.getElementById("novoInstrumentoAluno").value.trim();
  const foto = document.getElementById("novoFotoAluno").files[0];

  let base64 = "";
  if (foto) {
    base64 = await new Promise(res => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.readAsDataURL(foto);
    });
  }

  await addDoc(collection(db, "alunos"), {
    nome,
    instrumento: instr,
    foto: base64,
    leitura: 1,
    metodo: 1,
    energia: 100,
    frequenciaMensal: { porcentagem: 0 },
    frequenciaAnual: {},
    conquistas: [],
    classificado: false,
    ativo: true,
    senha: "asafe",
    criadoEm: new Date().toISOString()
  });

  modal.style.display = "none";
  await renderizarPainel(painel, loader);
};
