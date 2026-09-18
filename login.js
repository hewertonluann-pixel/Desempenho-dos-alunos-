// ========== login.js ==========
import { db } from "./firebase-config.js";
import { salvarUsuarioAtual, garantirFormato } from "./auth.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const nomeInput = document.getElementById("nome");
const senhaInput = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const erro = document.getElementById("erro");
const toggleSenha = document.getElementById("toggleSenha");

garantirFormato();

// O teclado do celular pode capitalizar ou remover/alterar acentos.
// A comparação normalizada mantém compatibilidade com os nomes já cadastrados.
function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function primeiroNome(nomeCompleto = "") {
  return String(nomeCompleto).trim().split(/\s+/)[0] || "";
}

function correspondeAoLogin(dados, alvo) {
  const login = normalizarTexto(dados.login || "");
  const nome = normalizarTexto(dados.nome || "");
  const primeiro = normalizarTexto(primeiroNome(dados.nome || ""));

  return login === alvo || nome === alvo || primeiro === alvo;
}

async function encontrarUsuario(colecao, input, senha) {
  const alvo = normalizarTexto(input);
  const snapshot = await getDocs(collection(db, colecao));
  const candidatos = snapshot.docs.filter((documento) =>
    correspondeAoLogin(documento.data(), alvo)
  );
  const documento = candidatos.find((candidato) =>
    String(candidato.data().senha ?? "") === senha
  );

  return {
    documento: documento || null,
    encontrouLogin: candidatos.length > 0
  };
}

function mostrarErro(mensagem) {
  erro.textContent = mensagem;
}

if (toggleSenha) {
  toggleSenha.addEventListener("click", () => {
    const mostrar = senhaInput.type === "password";
    senhaInput.type = mostrar ? "text" : "password";
    toggleSenha.textContent = mostrar ? "🙈" : "👁️";
  });
}

nomeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") senhaInput.focus();
});

senhaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") btnEntrar.click();
});

btnEntrar.addEventListener("click", async () => {
  const input = nomeInput.value.trim();
  const senha = senhaInput.value.trim();

  mostrarErro("");

  if (!input || !senha) {
    mostrarErro("Preencha nome e senha.");
    return;
  }

  btnEntrar.disabled = true;
  btnEntrar.innerHTML = '<span class="spinner"></span>Aguarde...';

  try {
    // Mantém a regra anterior: professor tem prioridade quando o nome coincide.
    const professor = await encontrarUsuario("usuarios", input, senha);
    if (professor.documento) {
      const dados = professor.documento.data();
      salvarUsuarioAtual(dados.nome, "professor", false, professor.documento.id);
      window.location.href = "professor.html";
      return;
    }

    const aluno = await encontrarUsuario("alunos", input, senha);
    if (aluno.documento) {
      const dados = aluno.documento.data();
      salvarUsuarioAtual(
        dados.nome,
        "aluno",
        dados.classificado === true,
        aluno.documento.id
      );
      window.location.href = `aluno.html?nome=${encodeURIComponent(dados.nome)}`;
      return;
    }

    if (professor.encontrouLogin || aluno.encontrouLogin) {
      mostrarErro("Senha incorreta.");
    } else {
      mostrarErro("Usuário não encontrado. Verifique o nome ou login.");
    }
  } catch (error) {
    console.error("Erro no login:", error);
    mostrarErro("Erro de conexão. Tente novamente.");
  } finally {
    btnEntrar.disabled = false;
    btnEntrar.innerHTML = "Entrar";
  }
});
