// ========== professor.js ==========
// Módulo completo para Painel do Professor — Gerenciamento de Alunos e Funcionalidades

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Configurações do Firebase (assuma separado para segurança)
const firebaseConfig = {
  apiKey: "Sua_API_Key", // Substitua com firebase-config.js se separado
  authDomain: "seu-domínio.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto-id.appspot.com",
  messagingSenderId: "seu-id",
  appId: "seu-app-id",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========== UTILITÁRIOS ==========
function mostrarMensagem(id, texto) {
  const msg = document.getElementById(id);
  msg.textContent = texto;
  msg.classList.add("visivel");
  setTimeout(() => msg.classList.remove("visivel"), 2500);
}

let currentAlunoId = null;

// ========== CARREGAR MÓDULO ==========
export async function carregarModulo(nome) {
  const conteudo = document.getElementById("conteudo");
  if (!conteudo) {
    console.error("Elemento #conteudo não encontrado.");
    return;
  }

  conteudo.innerHTML = `
    <div style="padding:20px; opacity:0.8;">
      <p>🔄 Carregando módulo "${nome}"...</p>
    </div>
  `;

  try {
    const html = await fetch(`modules/${nome}.html`).then(r => {
      if (!r.ok) throw new Error(`Módulo ${nome}.html não encontrado`);
      return r.text();
    });
    conteudo.innerHTML = html;
    await import(`./modules/${nome}.js`);
  } catch (erro) {
    conteudo.innerHTML = `
      <div style="padding:20px; color:#ff7777;">
        <h3>❌ Erro ao carregar o módulo</h3>
        <p>${erro.message}</p>
      </div>
    `;
    console.error("Erro ao carregar módulo:", erro);
  }
}
window.carregarModulo = carregarModulo;

// ========== EXPORTAR PDF ==========
window.exportarPDF = function () {
  if (typeof html2pdf === 'undefined') {
    alert("❌ Biblioteca html2pdf não carregada!");
    return;
  }
  const elemento = document.getElementById('painel');
  html2pdf()
    .set({
      margin: 1,
      filename: 'relatorio-alunos.pdf',
      pagebreak: { mode: 'avoid-all' },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait' }
    })
    .from(elemento)
    .save()
    .catch(err => {
      console.error("Erro em exportar PDF:", err);
      alert("❌ Erro ao exportar PDF.");
    });
};

// ========== MODAL ADICIONAR ALUNO ==========
async function setupModalAdicionar() {
  const modal = document.getElementById("modalAdicionar");
  const btnAdd = document.getElementById("btnAdicionarAluno");
  const btnConfirmar = document.getElementById("btnConfirmarAdicionar");
  const btnCancelar = document.getElementById("btnCancelarAdicionar");

  btnAdd.onclick = () => modal.classList.add("ativo");
  btnCancelar.onclick = () => modal.classList.remove("ativo");

  btnConfirmar.onclick = async () => {
    const nome = document.getElementById("novoNome").value.trim();
    const instrumento = document.getElementById("novoInstrumento").value.trim();
    const fotoFile = document.getElementById("novoFoto").files[0];
    const leituraNome = document.getElementById("novaLeitura").value.trim();
    const metodoNome = document.getElementById("novoMetodo").value.trim();

    if (!nome || !instrumento) {
      mostrarMensagem("mensagemInfo", "⚠️ Preencha nome e instrumento!");
      return;
    }

    let fotoBase64 = "";
    if (fotoFile && fotoFile.size < 2 * 1024 * 1024) { // Limitação de tamanho
      fotoBase64 = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.readAsDataURL(fotoFile);
      });
    } else if (fotoFile) {
      mostrarMensagem("mensagemInfo", "⚠️ Foto muito grande (máx. 2MB)!");
      return;
    }

    const novoAluno = {
      nome, instrumento, foto: fotoBase64, leituraNome, metodoNome,
      senha: "asafe", leitura: 1, metodo: 1, energia: 100,
      frequenciaMensal: { porcentagem: 0 }, frequenciaAnual: {}, conquistas: [],
      classificado: false, criadoEm: new Date().toISOString(),
    };

    await addDoc(collection(db, "alunos"), novoAluno);
    modal.classList.remove("ativo");
    mostrarMensagem("mensagemSucesso", `🎉 Aluno ${nome} adicionado!`);
    renderizarPainel();
  };
}

// ========== MODAL SOLFEJO ==========
function setupModalSolfejo() {
  const modal = document.getElementById("modalSolfejo");
  const btnSalvar = document.getElementById("btnSalvarSolfejo");
  const btnCancel = document.getElementById("btnCancelSolfejo");

  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnSalvar.onclick = async () => {
    const valor = document.getElementById("editSolfejo").value.trim();
    if (currentAlunoId) {
      await updateDoc(doc(db, "alunos", currentAlunoId), { leituraNome: valor });
      mostrarMensagem("mensagemSucesso", "✅ Método de Solfejo atualizado!");
      renderizarPainel();
    }
    modal.classList.remove("ativo");
  };
}

// ========== MODAL INSTRUMENTAL ==========
function setupModalInstrumental() {
  const modal = document.getElementById("modalInstrumental");
  const btnSalvar = document.getElementById("btnSalvarInstrumental");
  const btnCancel = document.getElementById("btnCancelInstrumental");

  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnSalvar.onclick = async () => {
    const valor = document.getElementById("editInstrumental").value.trim();
    if (currentAlunoId) {
      await updateDoc(doc(db, "alunos", currentAlunoId), { metodoNome: valor });
      mostrarMensagem("mensagemSucesso", "✅ Método Instrumental atualizado!");
      renderizarPainel();
    }
    modal.classList.remove("ativo");
  };
}

// ========== FUNÇÕES DE ALUNOS ==========
async function carregarAlunos() {
  const snapshot = await getDocs(collection(db, "alunos"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function renderizarPainel() {
  const loader = document.getElementById("loader");
  const painel = document.getElementById("painel");
  loader.style.display = "flex";
  painel.style.display = "none";

  const alunos = await carregarAlunos();
  painel.innerHTML = alunos.map(aluno => `
    <div class="ficha">
      <div class="foto">${aluno.foto ? `<img src="${aluno.foto}" alt="${aluno.nome}">` : '<div style="width:100%; height:100%; background:#666; display:flex; align-items:center; justify-content:center; color:#fff;">Sem foto</div>'}</div>
      <div class="name">${aluno.nome}</div>
      <div class="metodos">
        <span class="link-edit" onclick="abrirModalSolfejo('${aluno.id}', '${aluno.leituraNome || ''}')">${aluno.leituraNome || 'Método de Solfejo'}</span><br>
        <span class="link-edit" onclick="abrirModalInstrumental('${aluno.id}', '${aluno.metodoNome || ''}')">${aluno.metodoNome || 'Método Instrumental'}</span>
      </div>
      <div class="divider"></div>
      <div class="campo nota-linha">
        <label>Leitura (Nota)</label>
        <div class="nota-controle">
          <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'leitura', -1)">−</button>
          <input class="campo-nota" type="number" id="leitura-${aluno.id}" value="${aluno.leitura || 1}" onchange="atualizarNota('${aluno.id}','leitura',this.value)">
          <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'leitura', 1)">+</button>
        </div>
      </div>
      <div class="campo nota-linha">
        <label>Método (Nota)</label>
        <div class="nota-controle">
          <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'metodo', -1)">−</button>
          <input class="campo-nota" type="number" id="metodo-${aluno.id}" value="${aluno.metodo || 1}" onchange="atualizarNota('${aluno.id}','metodo',this.value)">
          <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'metodo', 1)">+</button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="campo">
        <label>Instrumento</label>
        <input type="text" value="${aluno.instrumento || ''}" onchange="atualizarCampo('${aluno.id}','instrumento',this.value)">
      </div>
      <div class="campo">
        <label class="alterar-foto">📷 Fotos</label>
        <input type="file" accept="image/*" onchange="atualizarFoto('${aluno.id}', this.files[0])">
      </div>
      <div class="acoes">
        <button class="classificar" onclick="alternarClassificacao('${aluno.id}', ${aluno.classificado})">${aluno.classificado ? 'Desclassificar' : 'Classificar'}</button>
        <button class="remover" onclick="confirmarRemocao('${aluno.id}', '${aluno.nome}')">Remover</button>
      </div>
    </div>
  `).join("");

  loader.style.display = "none";
  painel.style.display = "flex";
}
window.renderizarPainel = renderizarPainel;

window.alterarNota = async function(id, campo, delta) {
  const input = document.getElementById(`${campo}-${id}`);
  let v = parseInt(input.value) + delta;
  if (v < 1) v = 1; if (v > 130) v = 130;
  input.value = v;
  await updateDoc(doc(db, "alunos", id), { [campo]: v });
  mostrarMensagem("mensagemSucesso", `✅ Nota ajustada!`);
};

window.atualizarNota = async function(id, campo, valor) {
  let v = parseInt(valor);
  if (isNaN(v) || v < 1) v = 1; if (v > 130) v = 130;
  await updateDoc(doc(db, "alunos", id), { [campo]: v });
  mostrarMensagem("mensagemSucesso", `✅ Nota atualizada!`);
};

window.atualizarCampo = async function(id, campo, valor) {
  await updateDoc(doc(db, "alunos", id), { [campo]: valor });
  mostrarMensagem("mensagemSucesso", `✅ ${campo.charAt(0).toUpperCase() + campo.slice(1)} atualizado!`);
};

window.atualizarFoto = async function(id, file) {
  if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
    mostrarMensagem("mensagemInfo", "⚠️ Arquivo inválido (image <2MB)!");
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    await updateDoc(doc(db, "alunos", id), { foto: e.target.result });
    mostrarMensagem("mensagemSucesso", "✅ Foto atualizada!");
    renderizarPainel();
  };
  reader.readAsDataURL(file);
};

window.alternarClassificacao = async function(id, classificado) {
  await updateDoc(doc(db, "alunos", id), { classificado: !classificado });
  renderizarPainel();
  mostrarMensagem("mensagemSucesso", classificado ? "📤 Desclassificado!" : "🎯 Classificado!");
};

window.confirmarRemocao = async function(id, nome) {
  if (!confirm(`Tem certeza de que deseja remover o aluno ${nome}?`)) return;
  await deleteDoc(doc(db, "alunos", id));
  mostrarMensagem("mensagemSucesso", `🗑️ ${nome} removido!`);
  renderizarPainel();
};

// ========== MODAIS ========== 
window.abrirModalSolfejo = function(alunoId, valorAtual) {
  currentAlunoId = alunoId;
  document.getElementById("editSolfejo").value = valorAtual || "";
  document.getElementById("modalSolfejo").classList.add("ativo");
};

window.abrirModalInstrumental = function(alunoId, valorAtual) {
  currentAlunoId = alunoId;
  document.getElementById("editInstrumental").value = valorAtual || "";
  document.getElementById("modalInstrumental").classList.add("ativo");
};

// ========== EVENTOS PRINCIPAIS ==========
async function criarEventoGenerico() {
  const hoje = new Date().toISOString().split("T")[0];
  const snap = await getDocs(collection(db, "eventos"));
  const existente = snap.docs.find(doc => doc.data().data === hoje);
  if (existente) {
    mostrarMensagem("mensagemInfo", "📅 Já existe evento para hoje!");
    setTimeout(() => window.location.href = `ensaio.html?id=${existente.id}`, 1500);
    return;
  }
  const novoEvento = await addDoc(collection(db, "eventos"), {
    data: hoje, observacoes: "", presencas: [], tipo: "pendente"
  });
  mostrarMensagem("mensagemSucesso", "🆕 Evento criado!");
  setTimeout(() => window.location.href = `ensaio.html?id=${novoEvento.id}`, 1500);
}

document.getElementById("btnMostrarAlunos").addEventListener("click", renderizarPainel);

document.getElementById("btnModoAluno").addEventListener("click", () => {
  const usuario = new URLSearchParams(window.location.search).get("usuario") || "Professor";
  window.location.href = `aluno.html?nome=${encodeURIComponent(usuario)}`;
});

document.getElementById("btnCriarEvento").addEventListener("click", criarEventoGenerico);

document.getElementById("btnRecalcularEnergia").addEventListener("click", async () => {
  mostrarMensagem("mensagemInfo", "⚙️ Recalculando energia...");
  const snap = await getDocs(collection(db, "alunos"));
  let total = 0;
  for (const docAl of snap.docs) {
    const aluno = docAl.data();
    const freq = aluno.frequenciaMensal?.porcentagem || 0;
    let energia = 10;
    if (freq >= 80) energia = 100;
    else if (freq >= 50) energia = 70;
    else if (freq >= 30) energia = 40;
    await updateDoc(doc(db, "alunos", docAl.id), { energia });
    total++;
  }
  mostrarMensagem("mensagemSucesso", `⚡ Energia recalculada para ${total} alunos!`);
});

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
  // Exibir professor logado
  const user = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  document.getElementById("usuarioLogado").textContent =
    user?.nome ? `Professor logado: ${user.nome}` : "Professor";

  // Setup modais
  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();
});
