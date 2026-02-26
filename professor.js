// ========== professor.js ==========
// Versão final corrigida: Com edição de métodos Solfejo e Instrumental nos cards
// CORREÇÃO: Removido 'app' do import para evitar "app is not defined"

import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

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

/**
 * Grava uma notificação de nível na coleção "notificacoes" do Firestore.
 * Chamado quando o professor altera leitura ou método de um aluno manualmente.
 */
async function gravarNotificacaoNivel(alunoId, campo, novoValor) {
  try {
    // Buscar nome e dados do aluno
    const snap = await getDocs(
      query(collection(db, "alunos"), where("__name__", ">=", alunoId), where("__name__", "<=", alunoId))
    );
    // Busca direta pelo doc id é mais simples:
    const alunoDocRef = doc(db, "alunos", alunoId);
    // Usamos getDocs com a referência direta via getDoc (disponível)
    // fallback: buscamos todos e filtramos (já temos id)
    let alunoNome = "Aluno";
    let nomeMetodo = campo === "leitura" ? "leitura" : "método";
    let metodoLabel = "";

    const todosSnap = await getDocs(collection(db, "alunos"));
    const alunoDoc = todosSnap.docs.find(d => d.id === alunoId);
    if (alunoDoc) {
      const dados = alunoDoc.data();
      alunoNome = dados.nome || "Aluno";
      if (campo === "leitura") {
        nomeMetodo = "leitura";
        metodoLabel = dados.leituraNome ? ` (${dados.leituraNome})` : "";
      } else {
        nomeMetodo = "método";
        metodoLabel = dados.metodoNome ? ` (${dados.metodoNome})` : "";
      }
    }

    await addDoc(collection(db, "notificacoes"), {
      tipo: "nivel",
      icone: "🚀",
      alunoNome,
      texto: `<strong>${alunoNome}</strong> avançou para o <em>Nível ${novoValor} de ${nomeMetodo}${metodoLabel}</em>`,
      data: serverTimestamp()
    });
  } catch (err) {
    console.warn("⚠️ Não foi possível gravar notificação de nível:", err);
  }
}

// Declarar currentAlunoId apenas uma vez no topo
let currentAlunoId = null;

// ========== CARREGAR MÓDULO ==========
export async function carregarModulo(nome) {
  const conteudo = document.getElementById("conteudo");
  const painel = document.getElementById("painel");
  const painelLicoes = document.getElementById("painelLicoesProf");
  const intro = document.querySelector(".intro-section");

  if (!conteudo) {
    console.error("Elemento #conteudo não encontrado.");
    return;
  }

  // Ocultar outros painéis
  if (painel) painel.style.display = "none";
  if (painelLicoes) painelLicoes.style.display = "none";
  if (intro) intro.style.display = "none";
  
  conteudo.style.display = "block";
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
        leituraNome: "Bona",  // PADRÃO
        metodoNome: "Método", // PADRÃO
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
    console.log(`✅ ${snap.docs.length} alunos carregado(s).`);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error("❌ Erro ao carregar alunos:", error);
    throw error;
  }
}

export async function renderizarPainel() {
  const loader = document.getElementById("loader");
  const painel = document.getElementById("painel");
  const conteudo = document.getElementById("conteudo");

  if (conteudo) {
    conteudo.innerHTML = "";
    conteudo.style.display = "none";
  }

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
        <div class="dados">
          <div class="campo"><label>${aluno.nome}</label></div>
          <div class="campo nota-linha">
            <label>Leitura</label>
            <div class="nota-controle">
              <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'leitura', -1)">−</button>
              <input class="campo-nota" type="number" id="leitura-${aluno.id}" value="${aluno.leitura || 1}" onchange="atualizarNota('${aluno.id}','leitura',this.value)">
              <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'leitura', 1)">+</button>
            </div>
          </div>
          <div class="campo link-edit" onclick="abrirModalSolfejo('${aluno.id}', '${aluno.leituraNome || 'Bona'}')">${aluno.leituraNome || 'Bona'}</div>
          <div class="divider"></div>
          <div class="campo nota-linha">
            <label>Método</label>
            <div class="nota-controle">
              <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'metodo', -1)">−</button>
              <input class="campo-nota" type="number" id="metodo-${aluno.id}" value="${aluno.metodo || 1}" onchange="atualizarNota('${aluno.id}','metodo',this.value)">
              <button class="botao-nota" onclick="alterarNota('${aluno.id}', 'metodo', 1)">+</button>
            </div>
          </div>
          <div class="campo link-edit" onclick="abrirModalInstrumental('${aluno.id}', '${aluno.metodoNome || 'Método'}')">${aluno.metodoNome || 'Método'}</div>
          <div class="divider"></div>
          <div class="campo">
            <label>Instrumento</label>
            <input type="text" value="${aluno.instrumento || ''}" onchange="atualizarCampo('${aluno.id}','instrumento',this.value)">
          </div>
          <div class="acoes">
            <button class="classificar" onclick="alternarClassificacao('${aluno.id}', ${aluno.classificado})">${aluno.classificado ? 'Desclassificar' : 'Classificar'}</button>
            <button class="classificar" 
              style="background: ${aluno.ativo === false ? '#22c55e' : '#f59e0b'}; color: #fff;" 
              onclick="alternarAtivo('${aluno.id}', ${aluno.ativo !== false})">
              ${aluno.ativo === false ? 'Ativar' : 'Desativar'}
            </button>
            <button class="remover" onclick="confirmarRemocao('${aluno.id}', '${aluno.nome}')">Remover</button>
          </div>
        </div>
      </div>
    `).join("");

    loader.style.display = "none";
    painel.style.display = "flex";
    console.log("✅ Painel de alunos renderizado com métodos editáveis.");
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
    // Grava notificação de nível
    await gravarNotificacaoNivel(id, campo, v);
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
    // Grava notificação de nível
    await gravarNotificacaoNivel(id, campo, v);
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

window.alternarAtivo = async function(id, ativo) {
  try {
    await updateDoc(doc(db, "alunos", id), { ativo: !ativo });
    renderizarPainel();
    mostrarMensagem("mensagemSucesso", ativo ? "⏸️ Aluno Desativado!" : "▶️ Aluno Ativado!");
  } catch (error) {
    console.error("Erro ao alternar status ativo:", error);
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
  if (input) input.value = valorAtual || "Bona";
  const modal = document.getElementById("modalSolfejo");
  if (modal) modal.classList.add("ativo");
  else console.warn("❌ Modal Solfejo não encontrado.");
};

window.abrirModalInstrumental = function(alunoId, valorAtual) {
  currentAlunoId = alunoId;
  const input = document.getElementById("editInstrumental");
  if (input) input.value = valorAtual || "Método";
  const modal = document.getElementById("modalInstrumental");
  if (modal) modal.classList.add("ativo");
  else console.warn("❌ Modal Instrumental não encontrado.");
};

// ========== EVENTOS ==========
async function criarEventoGenerico() {
  try {
    console.log("🟡 Criando chamada do dia...");
    // Usando fuso horário de Brasília (GMT-3)
    const hoje = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date()).split('/').reverse().join('-');
    
    const snap = await getDocs(collection(db, "eventos"));
    const existente = snap.docs.find(doc => doc.data().data === hoje);
    if (existente) {
      mostrarMensagem("mensagemInfo", "📅 Já existe uma chamada para hoje!");
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

window.mostrarPainelLicoes = function() {
  console.log("🟢 Toggle painel lições");
  import('./professor-licoes.js').then(module => {
    if (module.mostrarPainelLicoes) {
      module.mostrarPainelLicoes();
    } else {
      console.error("Função mostrarPainelLicoes não encontrada no professor-licoes.js");
    }
  }).catch(error => {
    console.error("Erro ao carregar professor-licoes.js:", error);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  if (!db) {
    console.error("❌ Firebase DB não carregado.");
    return;
  }

  console.log("🟢 Página professor carregada.");

  const user = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  const usuarioDiv = document.getElementById("usuarioLogado");
  if (usuarioDiv) usuarioDiv.textContent = user?.nome ? `Professor: ${user.nome}` : "-";

  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();

  const btnMostrarAlunos = document.getElementById("btnMostrarAlunos");
  if (btnMostrarAlunos) btnMostrarAlunos.onclick = renderizarPainel;

  const btnLicoes = document.getElementById("btnMostrarLicoes");
  if (btnLicoes) btnLicoes.onclick = mostrarPainelLicoes;

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

  const btnAtualizarComprometimento = document.getElementById("btnAtualizarComprometimento");
  if (btnAtualizarComprometimento) btnAtualizarComprometimento.onclick = atualizarComprometimentoGeral;
});

// ========== ATUALIZAR COMPROMETIMENTO GERAL ==========
async function atualizarComprometimentoGeral() {
  const btn = document.getElementById("btnAtualizarComprometimento");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Atualizando...";
  }

  try {
    console.log("🟡 Iniciando atualização de comprometimento...");
    
    // 1. Obter todos os eventos do ano atual
    const anoAtual = new Date().getFullYear();
    const snapEventos = await getDocs(collection(db, "eventos"));
    const eventosAno = snapEventos.docs
      .map(d => d.data())
      .filter(d => d.data && d.data.startsWith(`${anoAtual}-`));

    // 2. Agrupar por mês para pegar o mês atual
    const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");
    const chaveMesAtual = `${anoAtual}-${mesAtual}`;
    const eventosMesAtual = eventosAno.filter(e => e.data.startsWith(chaveMesAtual));

    // 3. Obter todos os alunos
    const snapAlunos = await getDocs(collection(db, "alunos"));
    
    let atualizados = 0;
    for (const alunoDoc of snapAlunos.docs) {
      const alunoData = alunoDoc.data();
      
      // Se o aluno estiver desativado, ignoramos ele no cálculo de comprometimento
      if (alunoData.ativo === false) continue;

      const nomeAluno = alunoData.nome;

      // Calcular frequência do mês atual
      let presencasNoMes = 0;
      eventosMesAtual.forEach(ev => {
        const presenca = ev.presencas?.find(p => p.nome === nomeAluno);
        if (presenca && presenca.presenca === "presente") {
          presencasNoMes++;
        }
      });

      const totalEventosMes = eventosMesAtual.length;
      const percentualMes = totalEventosMes > 0 
        ? Math.round((presencasNoMes / totalEventosMes) * 100) 
        : 0;

      // Atualizar no Firestore
      await updateDoc(doc(db, "alunos", alunoDoc.id), {
        "frequenciaMensal.porcentagem": percentualMes,
        "frequenciaMensal.totalEventos": totalEventosMes,
        "frequenciaMensal.presencas": presencasNoMes,
        ultimaAtualizacaoComprometimento: serverTimestamp()
      });
      atualizados++;
    }

    mostrarMensagem("mensagemSucesso", `⚡ Comprometimento de ${atualizados} alunos atualizado!`);
    console.log(`✅ Atualização concluída: ${atualizados} alunos.`);
  } catch (error) {
    console.error("❌ Erro ao atualizar comprometimento:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização. Verifique o console.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "⚡ Atualizar Comprometimento";
    }
  }
}

// ========== EXPORT ==========
export function setupModalsAlunos() {
  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();
}
