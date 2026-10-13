// configuracoes.js
// Gerenciamento de configurações do aluno: senha e preferências de painéis

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

function normalizarLogin(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

// ========== OBTER ALUNO LOGADO ==========
async function carregarAlunoAtual() {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");

  if (!nomeAluno) {
    window.location.href = "index.html";
    return null;
  }

  const sessao = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  if (sessao.docId) {
    const alunoPorId = await getDoc(doc(db, "alunos", sessao.docId));
    if (alunoPorId.exists()) return { id: alunoPorId.id, ...alunoPorId.data() };
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
  await carregarOrdemPaineis();
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

// ========== SALVAR LOGIN ==========
document.getElementById("btnSalvarLogin")?.addEventListener("click", async () => {
  const login = document.getElementById("loginConfig").value.trim().replace(/\s+/g, " ");
  const mensagem = document.getElementById("mensagemLogin");
  const btn = document.getElementById("btnSalvarLogin");

  try {
    const aluno = await carregarAlunoAtual();
    if (!aluno) return;

    const loginNormalizado = normalizarLogin(login);
    const [todosAlunos, todosUsuarios] = await Promise.all([
      getDocs(collection(db, "alunos")),
      getDocs(collection(db, "usuarios"))
    ]);
    const loginEmUso = loginNormalizado && (
      todosAlunos.docs.some(d =>
        d.id !== aluno.id && normalizarLogin(d.data().login || "") === loginNormalizado
      ) || todosUsuarios.docs.some(d => normalizarLogin(d.data().login || "") === loginNormalizado)
    );

    if (loginEmUso) {
      mensagem.textContent = "❌ Este login já está em uso. Escolha outro.";
      mensagem.style.color = "#ef4444";
      return;
    }

    btn.disabled = true;
    btn.textContent = "Salvando...";
    await updateDoc(doc(db, "alunos", aluno.id), { login });
    mensagem.textContent = "✅ Login salvo com sucesso!";
    mensagem.style.color = "#22c55e";
  } catch (error) {
    console.error("Erro ao salvar login:", error);
    mensagem.textContent = "❌ Erro ao salvar login. Tente novamente.";
    mensagem.style.color = "#ef4444";
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Salvar Login";
    setTimeout(() => { mensagem.textContent = ""; }, 3000);
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

// ========== REPOSICIONAMENTO DE PAINÉIS ==========

const paineisDisponiveis = [
  { id: "comprometimento", nome: "Comprometimento", icone: "⚡" },
  { id: "frequencia", nome: "Frequência Anual", icone: "📅" },
  { id: "conquistas", nome: "Conquistas", icone: "🏆" },
  { id: "evolucao", nome: "Evolução Técnica", icone: "📈" },
  { id: "notificacoes", nome: "Atividades Recentes", icone: "🔔" },
  { id: "licoes", nome: "Lições Enviadas", icone: "📝" }
];

let draggedElement = null;

async function carregarOrdemPaineis() {
  const aluno = await carregarAlunoAtual();
  if (!aluno) return;

  const ordemSalva = aluno.ordemPaineis || paineisDisponiveis.map(p => p.id);
  const preferencias = aluno.preferencias || {};
  const lista = document.getElementById("painelOrdemLista");
  if (!lista) return;

  lista.innerHTML = "";

  // Ordenar painéis conforme a ordem salva
  const paineisOrdenados = ordemSalva
    .map(id => paineisDisponiveis.find(p => p.id === id))
    .filter(p => p !== undefined);

  // Adicionar painéis que não estão na ordem salva (novos painéis)
  paineisDisponiveis.forEach(p => {
    if (!ordemSalva.includes(p.id)) {
      paineisOrdenados.push(p);
    }
  });

  paineisOrdenados.forEach((painel, index) => {
    const item = document.createElement("div");
    item.className = "drag-item";
    item.draggable = true;
    item.dataset.id = painel.id;
    item.innerHTML = `
      <div class="drag-handle">☰</div>
      <div class="drag-info">
        <span class="drag-icon">${painel.icone}</span>
        <span class="drag-name">${painel.nome}</span>
      </div>
      <label class="switch painel-switch" title="Ativar ou desativar painel">
        <input type="checkbox" data-painel-id="${painel.id}" ${preferencias[painel.id] !== false ? "checked" : ""}>
        <span class="slider"></span>
      </label>
      <div class="drag-order">#${index + 1}</div>
    `;

    // Eventos de drag
    item.addEventListener("dragstart", handleDragStart);
    item.addEventListener("dragover", handleDragOver);
    item.addEventListener("drop", handleDrop);
    item.addEventListener("dragend", handleDragEnd);

    lista.appendChild(item);
  });
}

function handleDragStart(e) {
  draggedElement = this;
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = "move";

  const afterElement = getDragAfterElement(e.currentTarget.parentElement, e.clientY);
  const draggable = document.querySelector(".dragging");

  if (afterElement == null) {
    e.currentTarget.parentElement.appendChild(draggable);
  } else {
    e.currentTarget.parentElement.insertBefore(draggable, afterElement);
  }

  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  return false;
}

function handleDragEnd(e) {
  this.classList.remove("dragging");
  atualizarNumerosOrdem();
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll(".drag-item:not(.dragging)")];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function atualizarNumerosOrdem() {
  const items = document.querySelectorAll(".drag-item");
  items.forEach((item, index) => {
    const orderDiv = item.querySelector(".drag-order");
    if (orderDiv) {
      orderDiv.textContent = `#${index + 1}`;
    }
  });
}

// ========== SALVAR PAINÉIS: VISIBILIDADE + ORDEM ==========
document.getElementById("btnRestaurarPainelConfig")?.addEventListener("click", async () => {
  const mensagem = document.getElementById("mensagemPainelConfig");
  const btn = document.getElementById("btnRestaurarPainelConfig");

  try {
    const aluno = await carregarAlunoAtual();
    if (!aluno) return;

    const ordemPaineis = paineisDisponiveis.map(painel => painel.id);
    const preferencias = Object.fromEntries(ordemPaineis.map(id => [id, true]));

    btn.disabled = true;
    btn.textContent = "Restaurando...";
    await updateDoc(doc(db, "alunos", aluno.id), { ordemPaineis, preferencias });
    await carregarOrdemPaineis();
    mensagem.textContent = "✅ Padrões restaurados com sucesso!";
    mensagem.style.color = "#22c55e";
  } catch (error) {
    console.error("Erro ao restaurar padrões dos painéis:", error);
    mensagem.textContent = "❌ Erro ao restaurar padrões. Tente novamente.";
    mensagem.style.color = "#ef4444";
  } finally {
    btn.disabled = false;
    btn.textContent = "↩️ Restaurar padrões";
    setTimeout(() => { mensagem.textContent = ""; }, 3000);
  }
});

document.getElementById("btnSalvarPainelConfig")?.addEventListener("click", async () => {
  const mensagem = document.getElementById("mensagemPainelConfig");
  const btn = document.getElementById("btnSalvarPainelConfig");

  try {
    const aluno = await carregarAlunoAtual();
    if (!aluno) return;

    const items = document.querySelectorAll(".drag-item");
    const ordemPaineis = Array.from(items).map(item => item.dataset.id);
    const preferencias = {};
    document.querySelectorAll("[data-painel-id]").forEach(input => {
      preferencias[input.dataset.painelId] = input.checked;
    });

    btn.disabled = true;
    btn.textContent = "Salvando...";
    await updateDoc(doc(db, "alunos", aluno.id), { ordemPaineis, preferencias });
    mensagem.textContent = "✅ Painéis salvos com sucesso!";
    mensagem.style.color = "#22c55e";
  } catch (error) {
    console.error("Erro ao salvar painéis:", error);
    mensagem.textContent = "❌ Erro ao salvar painéis. Tente novamente.";
    mensagem.style.color = "#ef4444";
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Salvar Painéis";
    setTimeout(() => { mensagem.textContent = ""; }, 3000);
  }
});

// ========== INICIALIZAÇÃO COMPLETA ==========
document.addEventListener("DOMContentLoaded", () => {
  carregarPreferencias();
});
