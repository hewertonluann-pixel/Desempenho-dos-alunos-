// ========== ficha-aluno.js ==========
import { db } from "./firebase-config.js";
import {
  doc, getDoc, updateDoc,
  collection, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// ── Parâmetros de URL ──────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const alunoId = params.get("id");

if (!alunoId) {
  document.body.innerHTML = `
    <p style="color:#f87171;text-align:center;padding:60px;font-size:1.1rem;">
      ❌ Nenhum aluno especificado.<br>
      <a href="professor.html" style="color:#38bdf8;">← Voltar ao painel</a>
    </p>`;
  throw new Error("alunoId ausente na URL");
}

// ── Refs DOM ───────────────────────────────────────────────────
const loader         = document.getElementById("loaderFicha");
const fichaWrap      = document.getElementById("fichaWrap");
const tituloPagina   = document.getElementById("tituloPagina");
const fotoPerfil     = document.getElementById("fotoPerfil");
const nomeExibido    = document.getElementById("nomeExibido");
const instrumentoExibido = document.getElementById("instrumentoExibido");
const turmaExibida   = document.getElementById("turmaExibida");

const campoLogin     = document.getElementById("campoLogin");
const campoSenha     = document.getElementById("campoSenha");
const btnVerSenha    = document.getElementById("btnVerSenha");
const btnSalvarAcesso = document.getElementById("btnSalvarAcesso");
const btnRedefinir   = document.getElementById("btnRedefinir");
const btnCopiar      = document.getElementById("btnCopiar");

const campoNome      = document.getElementById("campoNome");
const campoInstrumento = document.getElementById("campoInstrumento");
const campoTurma     = document.getElementById("campoTurma");
const campoAtivo     = document.getElementById("campoAtivo");
const campoClassificado = document.getElementById("campoClassificado");
const btnSalvarDados = document.getElementById("btnSalvarDados");
const toastEl        = document.getElementById("toast");

const SENHA_PADRAO = "asafe";
let dadosAluno = null;
let timerToast = null;

// ── Toast ───────────────────────────────────────────────────────
function toast(msg, tipo = "ok") {
  clearTimeout(timerToast);
  toastEl.textContent = msg;
  toastEl.className = `show ${tipo}`;
  timerToast = setTimeout(() => { toastEl.className = ""; }, 3000);
}

// ── Mostrar/ocultar senha ───────────────────────────────────────
btnVerSenha.addEventListener("click", () => {
  const vis = campoSenha.type === "text";
  campoSenha.type = vis ? "password" : "text";
  btnVerSenha.textContent = vis ? "👁️" : "🙈";
});

// ── Carregar turmas no select ───────────────────────────────────
async function carregarTurmas(turmaIdAtual) {
  try {
    const snap = await getDocs(query(collection(db, "turmas"), orderBy("nome")));
    campoTurma.innerHTML = '<option value="">— Sem turma —</option>';
    snap.forEach(d => {
      const op = document.createElement("option");
      op.value = d.id;
      op.textContent = d.data().nome;
      if (d.id === turmaIdAtual) op.selected = true;
      campoTurma.appendChild(op);
    });
  } catch (e) {
    campoTurma.innerHTML = '<option value="">Erro ao carregar</option>';
  }
}

// ── Carregar ficha ──────────────────────────────────────────────
async function carregarFicha() {
  try {
    const snap = await getDoc(doc(db, "alunos", alunoId));
    if (!snap.exists()) {
      loader.innerHTML = `<p style="color:#f87171;">❌ Aluno não encontrado.</p>`;
      return;
    }

    dadosAluno = { id: snap.id, ...snap.data() };
    const d = dadosAluno;

    // ── Topo
    tituloPagina.textContent = `Ficha — ${d.nome}`;
    nomeExibido.textContent  = d.nome;
    instrumentoExibido.textContent = d.instrumento || "Instrumento não informado";

    if (d.foto) {
      fotoPerfil.innerHTML = `<img src="${d.foto}" alt="Foto de ${d.nome}">`;
    }

    if (d.turmaNome) {
      turmaExibida.textContent = `🏫 ${d.turmaNome}`;
      turmaExibida.style.display = "inline-flex";
    }

    // ── Acesso
    // Se não tiver login definido, sugerir primeiro nome
    const loginSugerido = d.login || primeiroNome(d.nome);
    campoLogin.value = loginSugerido;
    campoSenha.value = d.senha || SENHA_PADRAO;

    // ── Dados gerais
    campoNome.value = d.nome || "";
    campoInstrumento.value = d.instrumento || "";
    campoAtivo.value = String(d.ativo !== false);
    campoClassificado.value = String(d.classificado === true);

    await carregarTurmas(d.turmaId || "");

    loader.style.display = "none";
    fichaWrap.style.display = "flex";
  } catch (e) {
    console.error("Erro ao carregar ficha:", e);
    loader.innerHTML = `<p style="color:#f87171;">❌ Erro ao carregar. Tente recarregar.</p>`;
  }
}

// ── Helper: primeiro nome ───────────────────────────────────────
function primeiroNome(nomeCompleto = "") {
  return nomeCompleto.trim().split(/\s+/)[0] || "";
}

// ── Salvar acesso ───────────────────────────────────────────────
btnSalvarAcesso.addEventListener("click", async () => {
  const login = campoLogin.value.trim();
  const senha = campoSenha.value.trim();

  if (!login) { toast("⚠️ O campo Login não pode ficar vazio.", "err"); return; }
  if (!senha)  { toast("⚠️ A senha não pode ficar vazia.", "err"); return; }

  btnSalvarAcesso.disabled = true;
  try {
    await updateDoc(doc(db, "alunos", alunoId), { login, senha });
    dadosAluno.login = login;
    dadosAluno.senha = senha;
    toast(`✅ Acesso atualizado! Login: "${login}"`);
  } catch (e) {
    console.error(e);
    toast("❌ Erro ao salvar acesso.", "err");
  } finally {
    btnSalvarAcesso.disabled = false;
  }
});

// ── Redefinir senha para padrão ─────────────────────────────────
btnRedefinir.addEventListener("click", async () => {
  if (!confirm(`Redefinir senha de "${dadosAluno?.nome}" para a senha padrão (${SENHA_PADRAO})?`)) return;
  btnRedefinir.disabled = true;
  try {
    await updateDoc(doc(db, "alunos", alunoId), { senha: SENHA_PADRAO });
    campoSenha.value = SENHA_PADRAO;
    dadosAluno.senha = SENHA_PADRAO;
    toast(`🔄 Senha redefinida para padrão.`);
  } catch (e) {
    toast("❌ Erro ao redefinir senha.", "err");
  } finally {
    btnRedefinir.disabled = false;
  }
});

// ── Copiar credenciais ──────────────────────────────────────────
btnCopiar.addEventListener("click", () => {
  const login = campoLogin.value.trim();
  const senha = campoSenha.value.trim();
  const texto = `Login: ${login}\nSenha: ${senha}`;
  navigator.clipboard.writeText(texto)
    .then(() => toast("📋 Credenciais copiadas!"))
    .catch(() => toast("❌ Não foi possível copiar.", "err"));
});

// ── Salvar dados gerais ─────────────────────────────────────────
btnSalvarDados.addEventListener("click", async () => {
  const nome        = campoNome.value.trim();
  const instrumento = campoInstrumento.value.trim();
  const turmaId     = campoTurma.value || "";
  const ativo       = campoAtivo.value === "true";
  const classificado = campoClassificado.value === "true";

  if (!nome) { toast("⚠️ O nome não pode ficar vazio.", "err"); return; }

  btnSalvarDados.disabled = true;
  try {
    // Buscar nome da turma selecionada
    let turmaNome = "";
    if (turmaId) {
      const turmaSnap = await getDoc(doc(db, "turmas", turmaId));
      if (turmaSnap.exists()) turmaNome = turmaSnap.data().nome || "";
    }

    await updateDoc(doc(db, "alunos", alunoId), {
      nome, instrumento, turmaId, turmaNome, ativo, classificado
    });

    // Atualizar exibição do topo
    nomeExibido.textContent = nome;
    instrumentoExibido.textContent = instrumento || "Instrumento não informado";
    tituloPagina.textContent = `Ficha — ${nome}`;
    if (turmaNome) {
      turmaExibida.textContent = `🏫 ${turmaNome}`;
      turmaExibida.style.display = "inline-flex";
    } else {
      turmaExibida.style.display = "none";
    }
    dadosAluno = { ...dadosAluno, nome, instrumento, turmaId, turmaNome, ativo, classificado };

    toast("✅ Dados salvos com sucesso!");
  } catch (e) {
    console.error(e);
    toast("❌ Erro ao salvar dados.", "err");
  } finally {
    btnSalvarDados.disabled = false;
  }
});

// ── Inicializar ─────────────────────────────────────────────────
carregarFicha();
