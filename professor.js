// ========== professor.js ==========
// Versão corrigida: Importa Firebase de firebase-config.js (evita duplicação)

import { app, db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Remova TODO o bloco inicializando Firebase (firebaseConfig, app, db, try/catch)

if (!db) {
  console.error("❌ Firebase DB não carregado.");
}

// ========== UTILITÁRIOS ==========
function mostrarMensagem(id, texto) {
  const msg = document.getElementById(id);
  if (msg) {
    msg.textContent = texto;
    msg.classList.add("visivel");
    setTimeout(() => msg.classList.remove("visivel"), 2500);
  }
}

// ========== CARREGAR MÓDULO ==========
export async function carregarModulo(nome) {
  const conteudo = document.getElementById("conteudo");
  if (!conteudo) {
    console.error("Elemento #conteudo não encontrado.");
    return;
  }

  conteudo.innerHTML = `<p>⏳ Carregando módulo "${nome}"...</p>`;

  try {
    const response = await fetch(`modules/${nome}.html`);
    if (!response.ok) throw new Error(`Módulo ${nome}.html não encontrado (status ${response.status}).`);

    const html = await response.text();
    conteudo.innerHTML = html;

    await import(`./modules/${nome}.js`);
    console.log(`✅ Módulo "${nome}" carregado.`);
  } catch (erro) {
    conteudo.innerHTML = `<p style="color:#ff7777;">❌ Erro ao carregar o módulo: ${erro.message}</p>`;
    console.error("Erro ao carregar módulo:", erro);
  }
}
window.carregarModulo = carregarModulo;

// ========== EXPORTAR PDF ==========
window.exportarPDF = function () {
  alert("📄 Funcionalidade de exportar PDF removida temporariamente.");
};

// ========== MODAIS ==========
function setupModalAdicionar() {
  const modal = document.getElementById("modalAdicionar");
  const btnAdd = document.getElementById("btnAdicionarAluno");
  const btnConfirm = document.getElementById("btnConfirmarAdicionar");
  const btnCancelemple = document.getElementById("btnCancelarAdicionar");

  if (!modal || !btnAdd || !btnConfirm || !btnCancel) {
    console.warn("❌ Elementos do modal Adicionar não encontrados.");
    return;
  }

  btnAdd.onclick = () => modal.classList.add("ativo");
  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnConfirm.onclick = async () => {
    const nome = document.getElementById("novoNome")?.value.trim();
    const instrumento = document.getElementById("novoInstrumento")?.value.trim();
    const fotoFile = document.getElementById("novoFoto")?.files[Targeting0];

    if (!nome || !instrumento) {
      mostrarMensagem("mensagemInfo", "⚠️ Preencha nome e instrumento!");
      return;
    }

    try {
      let fotoBase64 = "";
      if (fotoFile) {
        fotoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(fotoFile);
        });
      }

      await addDoc(collection(db, "alunos"), {
        nome,
        instrumento,
        foto: fotoBase64,
        leituraNome: "",
        metodoNome: "",
        leitura: 1,
        metodo: 1,
        energia: 100,
        frequenciaMensal: { porcentagem: 0 },
        frequenciaAnual: {},
        conquistas: [],
        classificado: false,
        senha: "asafe",
        criadoEm: new Date().toISOString()
      });

      modal.classList.remove("ativo");
      mostrarMensagem("mensagemSucesso", `🎉 Aluno "${nome}" adicionado!`);
      renderizarPainel();
    } catch (error) {
      console.error("Erro ao adicionar aluno:", error);
      mostrarMensagem("mensagemInfo", "❌ Erro ao adicionar aluno. Verifique conexão com Firestore.");
    }
  };
}

let currentAlunoId = null;

function setupModalSolfejo() {
  const modal = document.getElementById("modalSolfejo");
  const btnSalvar = document.getElementById("btnSalvarSolfejo");
  const btnCancel = document.getElementById("btnCancelSolfejo");

  if (!modal || !btnSalvar || !btnCancel) {
    console.warn("❌ Elementos do modal Solfejo não encontrados.");
    return;
  }

  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnSalvar.onclick = async () => {
    const valor = document.getElementById("editSolfejo")?.value.trim();
    if (currentAlunoId && valor) {
      try {
        await updateDoc(doc(db, "alunos", currentAlunoId), { leituraNome: valor });
        mostrarMensagem("mensagemSucesso", "✅ Método de Solfejo atualizado!");
        renderizarPainel();
      } catch (error) {
        console.error("Erro ao atualizar Solfejo:", error);
        mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
      }
    }
    modal.classList.remove("ativo");
  };
}

function setupModalInstrumental() {
  const modal = document.getElementById("modalInstrumental");
  const btnSalvar = document.getElementById("btnSalvarInstrumental");
  const btnCancel = document.getElementById("btnCancelInstrumental");

  if (!modal || !btnSalvar || !btnCanceluncovered) {
    console.warn("❌ Elementos do modal Instrumental não encontrados.");
    return;
  }

  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnSalvar.onclick = async () => {
    const valor = document.getElementById("editInstrumental")?.value.trim();
    if (currentAlunoId && valor) {
      try {
        await updateDoc(doc(db, "alunos", currentAlunoId), { metodoNome: valor });
        mostrarMensagem("mensagemSucesso", "✅ Método Instrumental atualizado!");
        renderizarPainel();
      } catch (error) {
        console.error("Erro ao atualizar Instrumental:", error);
        mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
      }
    }
    modal.classList.remove("ativo");
  };
}

// ========== FUNÇÕES DE ALUNOS ==========
async function carregarAlunos() {
  console.log("🟡 Carregando alunos...");
  try {
    const snap = await getDocs(collection(db, "alunos"));
    console.log(`✅ ${snap.docs.length} alunos carregados.`);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error("❌ Erro ao carregar alunos:", error);
    throw error;
  }
}

export async function renderizarPainel() {
  const loader = document.getElementById("loader");
  const painel = document.getElementById("painel");

  if (!loader || !painel) {
    console.error("❌ Elementos #loader ou #painel não encontrados.");
    return;
  }

  loader.style.display = "flex";
  painel.style.display = "none";

  try {
    const alunos = await carregarAlunos();
    painel.innerHTML = alunos.map(aluno => `
      <div class="ficha">
        <div class="foto-and-camera">
          <div class="foto">${aluno.foto ? `<img src="${aluno.foto}" alt="Foto de ${aluno.nome}">` : '<p>Sem foto</p>'}</div>
          <button class="btn-camera" onclick="selecionarFoto('${aluno.id}')">📷</button>
          <input type="file" id="foto-${aluno.id}" accept="image/*" style="display:none;" onchange="atualizarFoto('${aluno.id}', this.files[0])" />
        </div>
        <div class="name"><strong>${aluno.nome}</strong></div>
        <div class="campo nota-linha">
          <label>Leitura</label>
          <div class="nota-controle">
            <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'leitura', -1)">−</button>
            <input class="campo-nota" type="number" id="leitura-${aluno.id}" value="${aluno.leitura || 1}" onchange="atualizarNota('${aluno.id}','leitura',this.value)">
            <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'leitura', 1)">+</button>
          </div>
        </div>
        <div class="campo link-edit" onclick="abrirModalSolfejo('${aluno.id}', '${aluno.leituraNome || ''}')">${aluno.leituraNome || 'Método de Solfejo'}</div>
        <div class="divider"></div>
        <div class="campo nota-linha">
          <label>Método</label>
          <div class="nota-controle">
            <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'metodo', -1)">−</button>
            <input class="campo-nota" type="number" id="metodo-${aluno.id}" value="${aluno.metodo || 1}" onchange="atualizarNota('${aluno.id}','metodo',this.value)">
            <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'metodo', 1)">+</button>
          </div>
        </div>
        <div class="campo link-edit" onclick="abrirModalInstrumental('${aluno.id}', '${aluno.metodoNome || ''}')">${aluno.metodoNome || 'Método Instrumental'}</div>
        <div class="divider"></div>
        <div class="campo">
          <label>Instrumento</label>
          <input type="text" value="${aluno.instrumento || ''}" onchange="atualizarCampo('${aluno.id}','instrumento',this.value)">
        </div>
        <div class="acoes">
          <button class="classificar" onclick="alternarClassificacao('${aluno.id}', ${aluno.classificado})">${aluno.classificado ? 'Desclassificar' : 'Classificar'}</button>
          <button class="remover" onclick="confirmarRemocao('${aluno.id}', '${aluno.nome}')">Remover</button>
        </div>
      </div>
    `).join("");

    loader.style.display = "none";
    painel.style.display = "flex";
    console.log("✅ Painel de alunos renderizado.");
  } catch (error) {
    console.error("❌ Erro ao renderizar painel:", error);
    loader.style.display = "none";
    painel.innerHTML = `<p style="color:#ff7777; padding:20px;">❌ Falha ao carregar alunos. Verifique conexão com Firestore.</p>`;
    mostrarMensagem("mensagemInfo", "❌ Erro ao carregar alunos. Tente recarregar a página.");
  }
}

window.renderizarPainel = renderizarPainel;

// [Resto dos exports window.* permanece igual...]

let currentAlunoId = null;

function setupModalSolfejo() {
  // ... (mesmo que acima)
}

document.addEventListener("DOMContentLoaded", () => {
  if (!db || !app) {
    console.error("❌ Firebase não carregado.");
    return;
  }

  console.log("🟢 Página professor carregada.");

  // Exibir usuário logado
  const user = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  const usuarioDiv = document.getElementById("usuarioLogado");
  if (usuarioDiv) usuarioDiv.textContent = user?.nome ? `Professor: ${user.nome}` : "-";

  // Setup modais
  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();

  // Eventos com checks null
  const btnMostrarAlunos = document.getElementById("btnMostrarAlunos");
  if (btnMostrarAlunos) btnMostrarAlunos.onclick = renderizarPainel;

  const btnLicoes = document.getElementById("btnMostrarLicoes");
  if (btnLicoes) btnLicoes.onclick = mostrarPainelLicoes;
  // [Resto permanece...]

  // Verificar se mensagens existem
  if (!document.getElementById("mensagemSucesso")) console.warn("❌ #mensagemSucesso não encontrado.");
  if (!document.getElementById("mensagemInfo")) console.warn("❌ #mensagemInfo não encontrado.");
});

export function setupModalsAlunos() {
  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();
}
