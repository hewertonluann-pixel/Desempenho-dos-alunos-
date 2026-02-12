// configuracoes.js
// Gerenciamento de configurações do aluno: senha e preferências de painéis

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// ========== OBTER ALUNO LOGADO ==========
async function carregarAlunoAtual() {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");

  if (!nomeAluno) {
    window.location.href = "index.html";
    return null;
  }

  const snap = await getDocs(collection(db, "alunos"));
  let alunoEncontrado = null;

  snap.forEach(d => {
    const dados = d.data();
    if (dados.nome === nomeAluno) {
      alunoEncontrado = { id: d.id, ...dados };
    }
  });

  if (!alunoEncontrado) {
    alert("Aluno não encontrado.");
    window.location.href = "index.html";
    return null;
  }

  return alunoEncontrado;
}

// ========== CARREGAR PREFERÊNCIAS ==========
async function carregarPreferencias() {
  const aluno = await carregarAlunoAtual();
  if (!aluno) return;

  const preferencias = aluno.preferencias || {
    comprometimento: true,
    frequencia: true,
    conquistas: true,
    evolucao: true,
    notificacoes: true,
    licoes: true
  };

  document.getElementById("toggleComprometimento").checked = preferencias.comprometimento !== false;
  document.getElementById("toggleFrequencia").checked = preferencias.frequencia !== false;
  document.getElementById("toggleConquistas").checked = preferencias.conquistas !== false;
  document.getElementById("toggleEvolucao").checked = preferencias.evolucao !== false;
  document.getElementById("toggleNotificacoes").checked = preferencias.notificacoes !== false;
  document.getElementById("toggleLicoes").checked = preferencias.licoes !== false;
}

// ========== SALVAR SENHA ==========
document.getElementById("btnSalvarSenha")?.addEventListener("click", async () => {
  const senhaAtual = document.getElementById("senhaAtual").value.trim();
  const novaSenha = document.getElementById("novaSenhaConfig").value.trim();
  const confirmarSenha = document.getElementById("confirmarSenha").value.trim();
  const mensagem = document.getElementById("mensagemSenha");

  if (!senhaAtual || !novaSenha || !confirmarSenha) {
    mensagem.textContent = "⚠️ Preencha todos os campos!";
    mensagem.style.color = "#f59e0b";
    return;
  }

  if (novaSenha.length < 6) {
    mensagem.textContent = "⚠️ A nova senha deve ter pelo menos 6 caracteres.";
    mensagem.style.color = "#f59e0b";
    return;
  }

  if (novaSenha !== confirmarSenha) {
    mensagem.textContent = "⚠️ As senhas não coincidem!";
    mensagem.style.color = "#f59e0b";
    return;
  }

  try {
    const aluno = await carregarAlunoAtual();
    if (!aluno) return;

    // Verificar senha atual
    if (aluno.senha !== senhaAtual) {
      mensagem.textContent = "❌ Senha atual incorreta!";
      mensagem.style.color = "#ef4444";
      return;
    }

    // Atualizar senha
    await updateDoc(doc(db, "alunos", aluno.id), { senha: novaSenha });
    mensagem.textContent = "✅ Senha alterada com sucesso!";
    mensagem.style.color = "#22c55e";

    // Limpar campos
    document.getElementById("senhaAtual").value = "";
    document.getElementById("novaSenhaConfig").value = "";
    document.getElementById("confirmarSenha").value = "";

    setTimeout(() => {
      mensagem.textContent = "";
    }, 3000);
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    mensagem.textContent = "❌ Erro ao alterar senha. Tente novamente.";
    mensagem.style.color = "#ef4444";
  }
});

// ========== SALVAR PREFERÊNCIAS ==========
document.getElementById("btnSalvarPreferencias")?.addEventListener("click", async () => {
  const mensagem = document.getElementById("mensagemPreferencias");

  try {
    const aluno = await carregarAlunoAtual();
    if (!aluno) return;

    const preferencias = {
      comprometimento: document.getElementById("toggleComprometimento").checked,
      frequencia: document.getElementById("toggleFrequencia").checked,
      conquistas: document.getElementById("toggleConquistas").checked,
      evolucao: document.getElementById("toggleEvolucao").checked,
      notificacoes: document.getElementById("toggleNotificacoes").checked,
      licoes: document.getElementById("toggleLicoes").checked
    };

    await updateDoc(doc(db, "alunos", aluno.id), { preferencias });
    mensagem.textContent = "✅ Preferências salvas com sucesso!";
    mensagem.style.color = "#22c55e";

    setTimeout(() => {
      mensagem.textContent = "";
    }, 3000);
  } catch (error) {
    console.error("Erro ao salvar preferências:", error);
    mensagem.textContent = "❌ Erro ao salvar preferências. Tente novamente.";
    mensagem.style.color = "#ef4444";
  }
});

// ========== VOLTAR AO PAINEL ==========
window.voltarParaPainel = function() {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");
  if (nomeAluno) {
    window.location.href = `aluno.html?nome=${encodeURIComponent(nomeAluno)}`;
  } else {
    window.location.href = "index.html";
  }
};

// ========== INICIALIZAÇÃO ==========
document.addEventListener("DOMContentLoaded", carregarPreferencias);
