// ========== professor.js ==========
// Versão final corrigida e completa para Painel do Professor

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Configurações do Firebase (substitua com suas chaves reais)
const firebaseConfig = {
  apiKey: "AIzaSyDdMROcKph5I-ClMiOmPiBXgGpDxoF2dZc",
  authDomain: "asafenotas-5cf3f.firebaseapp.com",
  projectId: "asafenotas-5cf3f",
  storageBucket: "asafenotas-5cf3f.appspot.com",
  messagingSenderId: "312062581585",
  appId: "1:312062581585:web:432ff63a527dd86fc1170",
  measurementId: "G-Z6G6D4RKZQ"
};

// Inicializar Firebase
let app, db;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("✅ Firebase inicializado com sucesso.");
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase:", error);
  alert("Erro crítico: Firebase não pôde ser inicializado. Verifique credenciais no código.");
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
  const btnCancel = document.getElementById("btnCancelarAdicionar");

  if (!modal || !btnAdd || !btnConfirm || !btnCancel) {
    console.warn("❌ Elementos do modal Adicionar não encontrados.");
    return;
  }

  btnAdd.onclick = () => modal.classList.add("ativo");
  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnConfirm.onclick = async () => {
    const nome = document.getElementById("novoNome")?.value.trim();
    const instrumento = document.getElementById("novoInstrumento")?.value.trim();
    const fotoFile = document.getElementById("novoFoto")?.files[0];

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
        leituraNome: "", // Adicionar campos se necessário
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

  if (!modal || !btnSalvar || !btnCancel) {
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
        <div class="name">${aluno.nome}</strong></div>
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

window.selecionarFoto = function(id) {
  const input = document.getElementById(`foto-${id}`);
  if (input) input.click();
  else console.warn(`❌ Input foto-${id} não encontrado.`);
};

window.alterarNota = async function(id, campo, delta) {
  try {
    const input = document.getElementById(`${campo}-${id}`);
    if (!input) return;
    let v = parseInt(input.value) + delta;
    if (v < 1) v = 1;
    if (v > 130) v = 130;
    input.value = v;
    await updateDoc(doc(db, "alunos", id), { [campo]: v });
    mostrarMensagem("mensagemSucesso", "✅ Nota ajustada!");
  } catch (error) {
    console.error("Erro ao ajustar nota:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
  }
};

window.atualizarNota = async function(id, campo, valor) {
  try {
    let v = parseInt(valor);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 130) v = 130;
    await updateDoc(doc(db, "alunos", id), { [campo]: v });
    mostrarMensagem("mensagemSucesso", "✅ Nota atualizada!");
  } catch (error) {
    console.error("Erro ao atualizar nota:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
  }
};

window.atualizarCampo = async function(id, campo, valor) {
  try {
    await updateDoc(doc(db, "alunos", id), { [campo]: valor });
    mostrarMensagem("mensagemSucesso", `✅ ${campo.charAt(0).toUpperCase() + campo.slice(1)} atualizado!`);
  } catch (error) {
    console.error("Erro ao atualizar campo:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
  }
};

window.atualizarFoto = async function(id, file) {
  if (!file || !file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
    mostrarMensagem("mensagemInfo", "⚠️ Arquivo inválido (image <2MB)!");
    return;
  }
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      await updateDoc(doc(db, "alunos", id), { foto: e.target.result });
      mostrarMensagem("mensagemSucesso", "✅ Foto atualizada!");
      renderizarPainel();
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Erro ao atualizar foto:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
  }
};

window.alternarClassificacao = async function(id, classificado) {
  try {
    await updateDoc(doc(db, "alunos", id), { classificado: !classificado });
    renderizarPainel();
    mostrarMensagem("mensagemSucesso", classificado ? "📤 Desclassificado!" : "🎯 Classificado!");
  } catch (error) {
    console.error("Erro ao alternar classificação:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
  }
};

window.confirmarRemocao = async function(id, nome) {
  if (!confirm(`Tem certeza de que deseja remover o aluno ${nome}?`)) return;
  try {
    await deleteDoc(doc(db, "alunos", id));
    mostrarMensagem("mensagemSucesso", `🗑️ ${nome} removido!`);
    renderizarPainel();
  } catch (error) {
    console.error("Erro ao remover aluno:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na remoção.");
  }
};

window.abrirModalSolfejo = function(alunoId, valorAtual) {
  currentAlunoId = alunoId;
  const input = document.getElementById("editSolfejo");
  if (input) input.value = valorAtual || "";
  const modal = document.getElementById("modalSolfejo");
  if (modal) modal.classList.add("ativo");
  else console.warn("❌ Modal Solfejo não encontrado.");
};

window.abrirModalInstrumental = function(alunoId, valorAtual) {
  currentAlunoId = alunoId;
  const input = document.getElementById("editInstrumental");
  if (input) input.value = valorAtual || "";
  const modal = document.getElementById("modalInstrumental");
  if (modal) modal.classList.add("ativo");
  else console.warn("❌ Modal Instrumental não encontrado.");
};

// ========== EVENTOS ==========
async function criarEventoGenerico() {
  try {
    console.log("🟡 Criando chamada do dia...");
    const hoje = new Date().toISOString().split("T")[0];
    const snap = await getDocs(collection(db, "eventos"));
    const existente = snap.docs.find(doc => doc.data().data === hoje);
    if (existente) {
      mostrarMensagem("mensagemInfo", "📅 Já existe discussão chamada para hoje!");
      setTimeout(() => window.location.href = `ensaio.html?id=${existente.id}`, 1500);
      return;
    }

    const novo = await addDoc(collection(db, "eventos"), {
      data: hoje,
      observacoes: "",
      presencas: [],
      tipo: "chamada"
    });
    mostrarMensagem("mensagemSucesso", "🆕 Chamada criada!");
    setTimeout(() => window.location.href = `ensaio.html?id=${novo.id}`, 1500);
  } catch (error) {
    console.error("Erro ao criar chamada:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro ao criar chamada. Verifique conexão.");
  }
}

// incluir Painel de Lições (integrar com professor-licoes.js)
window.mostrarPainelLicoes = function() {
  console.log("🟢 Toggle painel lições");
  // Importar dinamicamente professor-licoes.js
  import("./professor-licoes.js").then(module => {
    if (module.mostrarPainelLicoes) {
      module.mostrarPainelLicoes(); // Delegate para o módulo
    } else {
      console.error("Função mostrarPainelLicoes não encontrada no professor-licoes.js");
    }
  }).catch(error => {
    console.error("Erro ao carregar professor-licoes.js:", error);
  });
};

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

  // Eventos com checks null para evitar errors
  const btnAdicionar = document.getElementById("btnAdicionarAluno");
  if (btnAdicionar) setupModalAdicionar(); // Já setup acima

  const btnMostrarAlunos = document.getElementById("btnMostrarAlunos");
  if (btnMostrarAlunos) btnMostrarAlunos.onclick = renderizarPainel;

  const btnModoAluno = document.getElementById("btnModoAluno");
  if (btnModoAluno) {
    btnModoAluno.onclick = () => {
      if (user.nome) {
        window.location.href = `aluno.html?nome=${encodeURIComponent(user.nome)}`;
      } else {
        console.warn("Nome de usuário não encontrado no localStorage.");
      }
    };
  }

  const btnCriarChamada = document.getElementById("btnCriarChamada");
  if (btnCriarChamada) btnCriarChamada.onclick = criarEventoGenerico;

  const btnRecalcular = document.getElementById("btnRecalcularEnergia");
  if (btnRecalcular) {
    btnRecalcular.onclick = async () => {
      mostrarMensagem("mensagemInfo", "⚙️ Recalculando energia...");
      try {
        const snap = await getDocs(collection(db, "alunos"));
        let total = 0;
        for (const docAl of snap.docs) {
          try {
            const aluno = docAl.data();
            const freq = aluno.frequenciaMensal?.porcentagem || 0;
            let energia = 10;
            if (freq >= 80) energia = 100;
            else if (freq >= 50) energia = 70;
            else if (freq >= 30) energia = 40;

            await updateDoc(doc(db, "alunos", docAl.id), { energia });
            total++;
          } catch (innerError) {
            console.error(`Erro ao atualizar energia para ${docAl.id}:`, innerError);
          }
        }
        mostrarMensagem("mensagemSucesso", `⚡ Energia recalculada para ${total} alunos!`);
      } catch (error) {
        console.error("Erro geral no recálculo:", error);
        mostrarMensagem("mensagemInfo", "❌ Erro no recálculo. Verifique conexão.");
      }
    };
  }

  const btnLicoes = document.getElementById("btnMostrarLicoes");
  if (btnLicoes) btnLicoes.onclick = mostrarPainelLicoes;
  else console.warn("❌ Botão #btnMostrarLicoes não encontrado.");

  // Verificar se mensagens existem
  if (!document.getElementById("mensagemSucesso")) console.warn("❌ #mensagemSucesso não encontrado.");
  if (!document.getElementById("mensagemInfo")) console.warn("❌ #mensagemInfo não encontrado.");
});

// ========== EXPORT ==========
export function setupModalsAlunos() {
  console.log("🟢 Configurando modais de alunos...");
  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();
}
