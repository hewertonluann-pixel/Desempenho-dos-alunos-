import { db } from "./firebase-config.js";
import { salvarUsuarioAtual, garantirFormato } from "./auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const nomeInput    = document.getElementById("nome");
const senhaInput   = document.getElementById("senha");
const btnEntrar    = document.getElementById("btnEntrar");
const switchLogin  = document.getElementById("switchLogin");
const erro         = document.getElementById("erro");

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

// ── Login ────────────────────────────────────────────────────
btnEntrar.addEventListener("click", async () => {
  const nome  = nomeInput.value.trim();
  const senha = senhaInput.value.trim();

  erro.textContent = "";

  if (!nome || !senha) {
    erro.textContent = "Preencha nome e senha.";
    return;
  }

  btnEntrar.disabled = true;
  btnEntrar.textContent = "Entrando...";

  try {
    // ── ALUNO ────────────────────────────────────────────────
    if (modo === "aluno") {
      const q    = query(collection(db, "alunos"), where("nome", "==", nome));
      const snap = await getDocs(q);

      if (snap.empty) {
        erro.textContent = "Aluno não encontrado.";
        return;
      }

      // Percorre TODOS os documentos com este nome (trata homônimos)
      // e usa o primeiro cuja senha bate
      let docEncontrado = null;
      for (const d of snap.docs) {
        if (d.data().senha === senha) {
          docEncontrado = d;
          break;
        }
      }

      if (!docEncontrado) {
        erro.textContent = "Senha incorreta.";
        return;
      }

      const aluno = docEncontrado.data();
      const docId = docEncontrado.id; // ← ID único do Firestore

      salvarUsuarioAtual(
        aluno.nome,
        "aluno",
        aluno.classificado === true,
        docId
      );

      window.location.href = `aluno.html?nome=${encodeURIComponent(aluno.nome)}`;

    // ── PROFESSOR ────────────────────────────────────────────
    } else {
      const q    = query(collection(db, "usuarios"), where("nome", "==", nome));
      const snap = await getDocs(q);

      if (snap.empty) {
        erro.textContent = "Professor não encontrado.";
        return;
      }

      let docEncontrado = null;
      for (const d of snap.docs) {
        if (d.data().senha === senha) {
          docEncontrado = d;
          break;
        }
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
