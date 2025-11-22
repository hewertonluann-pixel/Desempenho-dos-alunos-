import { db } from "../firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const painel = document.getElementById("painelChamada");
const loader = document.getElementById("loaderChamada");
const obs = document.getElementById("observacoesChamada");
const inputLocal = document.getElementById("localEvento");
const switchTipo = document.getElementById("tipoEventoSwitch");

let alunos = [];
let presencasSalvas = {};
let tipoEvento = "ensaio";
let eventoId = null;
let veioDeEventos = false;

/* ===== MOSTRAR DATA ===== */
document.getElementById("dataChamada").textContent =
  new Date().toLocaleDateString("pt-BR");

/* ===== DETECTAR SE JÁ EXISTE EVENTO DO DIA ===== */
(async function iniciar() {
  loader.style.display = "block";

  const params = new URLSearchParams(window.location.search);
  eventoId = params.get("id");

  await detectarOrigem();
  await carregarAlunos();

  loader.style.display = "none";
})();

/* ===== VERIFICA DE QUAL COLEÇÃO O EVENTO VEIO ===== */
async function detectarOrigem() {
  if (!eventoId) return;

  const colecoes = ["ensaios", "apresentacoes", "eventos"];

  for (const c of colecoes) {
    const ref = doc(db, c, eventoId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const dados = snap.data();

      if (c === "eventos") {
        veioDeEventos = true;
      }

      tipoEvento = c === "apresentacoes" ? "apresentacao" : "ensaio";
      switchTipo.checked = tipoEvento === "apresentacao";

      if (dados.presencas) {
        dados.presencas.forEach(p => presencasSalvas[p.nome] = p.presenca);
      }

      obs.value = dados.observacoes || "";
      inputLocal.value = dados.local || "";
      return;
    }
  }
}

/* ===== TROCA TIPO DE EVENTO ===== */
switchTipo.addEventListener("change", () => {
  tipoEvento = switchTipo.checked ? "apresentacao" : "ensaio";
});

/* ===== CARREGAR ALUNOS ===== */
async function carregarAlunos() {
  const snap = await getDocs(collection(db, "alunos"));
  alunos = snap.docs.map(d => {
    const a = d.data();
    return {
      id: d.id,
      ...a,
      presenca: presencasSalvas[a.nome] || ""
    };
  });

  renderizarAlunos();
}

/* ===== RENDERIZAR CARDS ===== */
function renderizarAlunos() {
  painel.innerHTML = alunos.map(a => `
    <div class="card-chamada ${a.presenca || "vazio"}" data-nome="${a.nome}">
      <div class="foto">
        ${a.foto ? `<img src="${a.foto}">` : "Sem foto"}
      </div>
      <strong>${a.nome}</strong>
      <small>${a.instrumento || ""}</small>
    </div>
  `).join("");
}

/* ===== ALTERAR PRESENÇA ===== */
painel.addEventListener("click", e => {
  const card = e.target.closest(".card-chamada");
  if (!card) return;

  const nome = card.dataset.nome;
  const aluno = alunos.find(a => a.nome === nome);

  if (!aluno.presenca || aluno.presenca === "ausente")
    aluno.presenca = "presente";
  else if (aluno.presenca === "presente")
    aluno.presenca = "ausente";
  else aluno.presenca = "";

  card.className = `card-chamada ${aluno.presenca || "vazio"}`;
});

/* ===== SALVAR ===== */
document.getElementById("btnSalvarChamada").onclick = async () => {
  const hoje = new Date().toISOString().split("T")[0];

  const presencas = alunos.map(a => ({
    nome: a.nome,
    instrumento: a.instrumento || "",
    presenca: a.presenca
  }));

  let colecaoDestino = tipoEvento === "apresentacao" ? "apresentacoes" : "ensaios";

  if (eventoId) {
    await updateDoc(doc(db, colecaoDestino, eventoId), {
      data: hoje,
      local: inputLocal.value,
      observacoes: obs.value,
      presencas
    });
  } else {
    const novo = await addDoc(collection(db, colecaoDestino), {
      data: hoje,
      local: inputLocal.value,
      observacoes: obs.value,
      presencas
    });
    eventoId = novo.id;
  }

  await atualizarHistoricoMensal();

  alert("Chamada salva com sucesso!");
};

/* ===== ATUALIZAR HISTÓRICO MENSAL ===== */
async function atualizarHistoricoMensal() {
  const hoje = new Date().toISOString().slice(0, 7); // yyyy-mm

  for (const aluno of alunos) {
    const ref = doc(db, "alunos", aluno.id);
    const snap = await getDoc(ref);

    const dados = snap.data();
    let historico = dados.presencas || [];

    let registro = historico.find(p => p.mes === hoje);
    if (!registro) {
      registro = { mes: hoje, totalEnsaios: 0, presencasAluno: 0, percentual: 0 };
      historico.push(registro);
    }

    registro.totalEnsaios++;
    if (aluno.presenca === "presente") registro.presencasAluno++;

    registro.percentual = Math.round(
      (registro.presencasAluno / registro.totalEnsaios) * 100
    );

    await updateDoc(ref, { presencas: historico });
  }
}

/* ===== CANCELAR EVENTO ===== */
document.getElementById("btnCancelarEvento").onclick = async () => {
  if (!eventoId) return alert("Nenhum evento carregado.");

  const confirma = confirm("Deseja realmente cancelar?");
  if (!confirma) return;

  const colecoes = ["ensaios", "apresentacoes", "eventos"];

  for (const c of colecoes) {
    try {
      await deleteDoc(doc(db, c, eventoId));
    } catch (_) {}
  }

  alert("Evento cancelado.");
  document.getElementById("conteudo").innerHTML = "";
};
