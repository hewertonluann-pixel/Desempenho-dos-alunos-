// ========== login.js ==========
import { db } from "./firebase-config.js";
import { salvarUsuarioAtual, garantirFormato } from "./auth.js";
import {
  collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const nomeInput   = document.getElementById("nome");
const senhaInput  = document.getElementById("senha");
const btnEntrar   = document.getElementById("btnEntrar");
const switchLogin = document.getElementById("switchLogin");
const erro        = document.getElementById("erro");

let modo = "aluno";

garantirFormato();

// ── Alternar modo aluno / professor ──────────────────────────
switchLogin.addEventListener("click", () => {
  if (modo === "aluno") {
    modo = "professor";
    switchLogin.textContent = "Entrar como Aluno";
  } else {
    modo = "aluno";
    switchLogin.textContent = "Entrar como Professor";
  }
});

// ── Helpers ───────────────────────────────────────────────────
function primeiroNome(nomeCompleto = "") {
  return nomeCompleto.trim().split(/\s+/)[0] || "";
}

/**
 * Tenta encontrar o documento do aluno no Firestore.
 *
 * Estratégia (em ordem):
 * 1. WHERE login == input           → campo login definido pelo professor
 * 2. WHERE nome  == input           → compatibilidade com alunos sem campo login
 * 3. WHERE nome  >= input (fallback) → para casos onde só o primeiro nome bate
 *
 * Em cada etapa verifica se a senha bate.
 */
async function buscarAluno(input, senha) {
  // 1. Busca por campo "login" (novo padrão)
  const q1   = query(collection(db, "alunos"), where("login", "==", input));
  const snap1 = await getDocs(q1);
  for (const d of snap1.docs) {
    if (d.data().senha === senha) return d;
  }

  // 2. Busca por "nome" exato (legado — alunos cadastrados antes do campo login)
  const q2   = query(collection(db, "alunos"), where("nome", "==", input));
  const snap2 = await getDocs(q2);
  for (const d of snap2.docs) {
    if (d.data().senha === senha) return d;
  }

  // 3. Fallback: aluno digitou apenas o primeiro nome, mas o banco tem nome completo
  //    Carrega todos e filtra por primeiroNome (seguro pois a senha ainda é validada)
  const snapTodos = await getDocs(collection(db, "alunos"));
  for (const d of snapTodos.docs) {
    const dados = d.data();
    if (
      primeiroNome(dados.nome).toLowerCase() === input.toLowerCase() &&
      dados.senha === senha
    ) {
      return d;
    }
  }

  return null;
}

// ── Login ────────────────────────────────────────────────────
btnEntrar.addEventListener("click", async () => {
  const input = nomeInput.value.trim();
  const senha = senhaInput.value.trim();

  erro.textContent = "";

  if (!input || !senha) {
    erro.textContent = "Preencha o login e a senha.";
    return;
  }

  btnEntrar.disabled = true;
  btnEntrar.textContent = "Entrando...";

  try {
    // ── ALUNO ────────────────────────────────────────────────
    if (modo === "aluno") {
      const docEncontrado = await buscarAluno(input, senha);

      if (!docEncontrado) {
        // Distinguir "não encontrado" de "senha errada"
        const snapVerifica = await getDocs(
          query(collection(db, "alunos"), where("login", "==", input))
        );
        const snapVerifica2 = await getDocs(
          query(collection(db, "alunos"), where("nome",  "==", input))
        );
        if (snapVerifica.empty && snapVerifica2.empty) {
          erro.textContent = "Aluno não encontrado. Verifique o login.";
        } else {
          erro.textContent = "Senha incorreta.";
        }
        return;
      }

      const aluno = docEncontrado.data();
      const docId = docEncontrado.id;

      salvarUsuarioAtual(aluno.nome, "aluno", aluno.classificado === true, docId);
      window.location.href = `aluno.html?nome=${encodeURIComponent(aluno.nome)}`;

    // ── PROFESSOR ────────────────────────────────────────────
    } else {
      const q    = query(collection(db, "usuarios"), where("nome", "==", input));
      const snap = await getDocs(q);

      if (snap.empty) {
        erro.textContent = "Professor não encontrado.";
        return;
      }

      let docEncontrado = null;
      for (const d of snap.docs) {
        if (d.data().senha === senha) { docEncontrado = d; break; }
      }

      if (!docEncontrado) {
        erro.textContent = "Senha incorreta.";
        return;
      }

      const prof  = docEncontrado.data();
      const docId = docEncontrado.id;

      salvarUsuarioAtual(prof.nome, "professor", false, docId);
      window.location.href = "professor.html";
    }

  } catch (e) {
    console.error("Erro no login:", e);
    erro.textContent = "Erro ao conectar. Tente novamente.";
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.textContent = "Entrar";
  }
});
