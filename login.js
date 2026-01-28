import { db } from "./firebase-config.js";
import { salvarUsuarioAtual, garantirFormato } from "./auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const nomeInput = document.getElementById("nome");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const switchLogin = document.getElementById("switchLogin");
const erro = document.getElementById("erro");

let modo = "aluno"; // padrão

garantirFormato();

// Alternar modo aluno/professor
switchLogin.addEventListener("click", () => {
  if (modo === "aluno") {
    modo = "professor";
    switchLogin.textContent = "Entrar como Aluno";
  } else {
    modo = "aluno";
    switchLogin.textContent = "Entrar como Professor";
  }
});

btnEntrar.addEventListener("click", async () => {
  const nome = nomeInput.value.trim();
  const senha = senhaInput.value.trim();

  erro.textContent = "";

  if (!nome || !senha) {
    erro.textContent = "Preencha nome e senha.";
    return;
  }

  // Se login de aluno
  if (modo === "aluno") {
    const q = query(collection(db, "alunos"), where("nome", "==", nome));
    const snap = await getDocs(q);

    if (snap.empty) {
      erro.textContent = "Aluno não encontrado.";
      return;
    }

    const aluno = snap.docs[0].data();

    if (aluno.senha !== senha) {
      erro.textContent = "Senha incorreta.";
      return;
    }

    // Salva o objeto completo do aluno, incluindo 'classificado' se existir
    salvarUsuarioAtual(aluno);

    window.location.href = `aluno.html?nome=${encodeURIComponent(aluno.nome)}`;
  }

  // Se login de professor
  else {
    const q = query(collection(db, "usuarios"), where("nome", "==", nome));
    const snap = await getDocs(q);

    if (snap.empty) {
      erro.textContent = "Professor não encontrado.";
      return;
    }

    const prof = snap.docs[0].data();

    if (prof.senha !== senha) {
      erro.textContent = "Senha incorreta.";
      return;
    }

    // Salva o objeto completo do professor
    salvarUsuarioAtual(prof);

    window.location.href = "professor.html";
  }
});
