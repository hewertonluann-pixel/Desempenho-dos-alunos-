// aluno.js
import { db } from "./firebase-config.js";
import { collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { gerarPainelConquistas } from "./conquistas.js";
import { gerarPainelFrequencia } from "./frequencia.js";

// --- Identifica nome e modo público ---
function getAlunoAtual() {
  const params = new URLSearchParams(window.location.search);
  return params.get("nome");
}

function isModoPublico() {
  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "public";
}

// --- POPUP SENHA ---
export function abrirPopup() {
  if (isModoPublico()) return; // bloco de proteção
  document.getElementById("popupSenha").style.display = "flex";
}
export function fecharPopup() {
  document.getElementById("popupSenha").style.display = "none";
}

// --- ALTERAR SENHA ---
export async function salvarSenha() {
  if (isModoPublico()) return; // bloqueado
  const novaSenha = document.getElementById("novaSenha").value.trim();
  if (!novaSenha) return;

  const nome = getAlunoAtual();
  const q = query(collection(db, "alunos"), where("nome", "==", nome));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const alunoId = snap.docs[0].id;
  await updateDoc(doc(db, "alunos", alunoId), { senha: novaSenha });

  document.getElementById("mensagemSenha").textContent =
    "✅ Senha alterada com sucesso!";
}

// --- ALTERAR FOTO ---
export async function enviarNovaFoto() {
  if (isModoPublico()) return; // impede alteração

  const arquivo = document.getElementById("novaFoto").files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = async (e) => {
    const novaImagem = e.target.result;
    const nome = getAlunoAtual();

    const q = query(collection(db, "alunos"), where("nome", "==", nome));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const alunoId = snap.docs[0].id;
    await updateDoc(doc(db, "alunos", alunoId), { foto: novaImagem });

    document.getElementById("fotoAluno").innerHTML =
      `<img src="${novaImagem}" alt="Foto atualizada" />`;
  };

  leitor.readAsDataURL(arquivo);
}

// --- ACESSAR MODO PROFESSOR ---
export function acessarModoProfessor() {
  if (isModoPublico()) return; // impedido

  const nome = getAlunoAtual();
  localStorage.setItem("usuarioLogado", JSON.stringify({ nome, tipo: "professor" }));
  window.location.href = "professor.html";
}

// --- CARREGAR FICHA DO ALUNO ---
export async function renderizarFicha() {
  const nome = getAlunoAtual();
  const publico = isModoPublico();

  const q = query(collection(db, "alunos"), where("nome", "==", nome));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const alunoDoc = snap.docs[0];
  const aluno = alunoDoc.data();

  // Nome e dados básicos
  document.getElementById("nomeAluno").textContent = aluno.nome;
  document.getElementById("instrumentoAluno").textContent = aluno.instrumento || "";
  document.getElementById("leituraValor").textContent = aluno.leitura || 0;
  document.getElementById("metodoValor").textContent = aluno.metodo || 0;

  const total = (aluno.leitura || 0) + (aluno.metodo || 0);
  document.getElementById("scoreGeralValor").textContent = total;

  // Foto
  if (aluno.foto) {
    document.getElementById("fotoAluno").innerHTML =
      `<img src="${aluno.foto}" alt="Foto de ${aluno.nome}">`;
  }

  // ENERGIA
  const freq = aluno.frequenciaMensal?.porcentagem || 0;
  const barra = document.getElementById("barraEnergia");
  const textoEnergia = document.getElementById("textoEnergia");

  barra.style.width = `${freq}%`;

  if (freq < 40) {
    barra.style.background = "linear-gradient(90deg, #ff0000, #ff6600)";
    textoEnergia.textContent = "Energia baixa";
  } else if (freq < 80) {
    barra.style.background = "linear-gradient(90deg, #ffcc00, #ffff66)";
    textoEnergia.textContent = "Energia média";
  } else {
    barra.style.background = "linear-gradient(90deg, #00ff66, #00ffaa)";
    textoEnergia.textContent = "Energia máxima!";
  }

  // CONQUISTAS
  gerarPainelConquistas(aluno, document.getElementById("gradeConquistas"));

  // FREQUÊNCIA ANUAL
  gerarPainelFrequencia(aluno, document.getElementById("gradeFrequencia"));

  // 👨‍🏫 Mostrar botão do professor somente se:
  // 1. Aluno é classificado
  // 2. NÃO está no modo público
  if (aluno.classificado && !publico) {
    document.getElementById("modoProfessorBtn").style.display = "block";
  }

  // 🔒 Bloquear alterações se estiver no modo público
  if (publico) {
    document.getElementById("boxAlterarSenha").style.display = "none";
    document.getElementById("boxAlterarFoto").style.display = "none";
    document.getElementById("modoProfessorBtn").style.display = "none";

    // Desativa campos
    window.abrirPopup = () => {};
    window.salvarSenha = () => {};
    window.enviarNovaFoto = () => {};
    window.acessarModoProfessor = () => {};
  }
}

// --- EXPOSE FUNCTIONS (importante!) ---
window.abrirPopup = abrirPopup;
window.fecharPopup = fecharPopup;
window.salvarSenha = salvarSenha;
window.enviarNovaFoto = enviarNovaFoto;
window.acessarModoProfessor = acessarModoProfessor;

// Renderizar ao abrir página
renderizarFicha();
