// ========== professor.js ==========
import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { atualizarSnapshotMesAtual } from "./snapshots-mensais.js";

if (!db) console.error("❌ Firebase DB não carregado.");

// ========== TURMA ATIVA ==========
function getTurmaAtiva() {
  try { return JSON.parse(localStorage.getItem("turmaAtiva")); } catch { return null; }
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

async function gravarNotificacaoNivel(alunoId, campo, novoValor) {
  try {
    let alunoNome = "Aluno", nomeMetodo = campo === "leitura" ? "leitura" : "método", metodoLabel = "";
    const todosSnap = await getDocs(collection(db, "alunos"));
    const alunoDoc = todosSnap.docs.find(d => d.id === alunoId);
    if (alunoDoc) {
      const dados = alunoDoc.data();
      alunoNome = dados.nome || "Aluno";
      metodoLabel = campo === "leitura"
        ? (dados.leituraNome ? ` (${dados.leituraNome})` : "")
        : (dados.metodoNome  ? ` (${dados.metodoNome})`  : "");
    }
    await addDoc(collection(db, "notificacoes"), {
      tipo: "nivel", icone: "🚀", alunoNome,
      texto: `<strong>${alunoNome}</strong> avançou para o <em>Nível ${novoValor} de ${nomeMetodo}${metodoLabel}</em>`,
      data: serverTimestamp()
    });
  } catch (err) {
    console.warn("⚠️ Não foi possível gravar notificação de nível:", err);
  }
}

let currentAlunoId = null;

// ========== CARREGAR MÓDULO ==========
export async function carregarModulo(nome) {
  const conteudo    = document.getElementById("conteudo");
  const painel      = document.getElementById("painel");
  const painelLicoes = document.getElementById("painelLicoesProf");
  const intro       = document.querySelector(".intro-section");
  if (!conteudo) { console.error("Elemento #conteudo não encontrado."); return; }
  if (painel) painel.style.display = "none";
  if (painelLicoes) painelLicoes.style.display = "none";
  if (intro) intro.style.display = "none";
  conteudo.style.display = "block";
  conteudo.innerHTML = `<p>⏳ Carregando módulo "${nome}"...</p>`;
  try {
    const response = await fetch(`modules/${nome}.html`);
    if (!response.ok) throw new Error(`Módulo ${nome}.html não encontrado (status ${response.status}).`);
    conteudo.innerHTML = await response.text();
    await import(`./modules/${nome}.js`);
  } catch (erro) {
    conteudo.innerHTML = `<p style="color:#ff7777;">❌ Erro ao carregar o módulo: ${erro.message}</p>`;
  }
}
window.carregarModulo = carregarModulo;

window.exportarPDF = function () { alert("📄 Funcionalidade de exportar PDF removida temporariamente."); };

// ========== MODAIS ==========
function setupModalAdicionar() {
  const modal      = document.getElementById("modalAdicionar");
  const btnAdd     = document.getElementById("btnAdicionarAluno");
  const btnConfirm = document.getElementById("btnConfirmarAdicionar");
  const btnCancel  = document.getElementById("btnCancelarAdicionar");
  if (!modal || !btnAdd || !btnConfirm || !btnCancel) return;

  btnAdd.onclick    = () => modal.classList.add("ativo");
  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnConfirm.onclick = async () => {
    const nome        = document.getElementById("novoNome")?.value.trim();
    const instrumento = document.getElementById("novoInstrumento")?.value.trim();
    const fotoFile    = document.getElementById("novoFoto")?.files[0];
    if (!nome || !instrumento) { mostrarMensagem("mensagemInfo", "⚠️ Preencha nome e instrumento!"); return; }
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
      const turmaAtiva = getTurmaAtiva();
      await addDoc(collection(db, "alunos"), {
        nome, instrumento, foto: fotoBase64,
        leituraNome: "Bona", metodoNome: "Método",
        leitura: 1, metodo: 1, energia: 100,
        frequenciaMensal: { porcentagem: 0 }, frequenciaAnual: {},
        conquistas: [], classificado: false, senha: "asafe",
        turmaId:   turmaAtiva?.id   || "",
        turmaNome: turmaAtiva?.nome || "",
        criadoEm: new Date().toISOString()
      });
      modal.classList.remove("ativo");
      mostrarMensagem("mensagemSucesso", `🎉 Aluno "${nome}" adicionado!`);
      renderizarPainel();
    } catch (error) {
      console.error("Erro ao adicionar aluno:", error);
      mostrarMensagem("mensagemInfo", "❌ Erro ao adicionar aluno.");
    }
  };
}

function setupModalSolfejo() {
  const modal     = document.getElementById("modalSolfejo");
  const btnSalvar = document.getElementById("btnSalvarSolfejo");
  const btnCancel = document.getElementById("btnCancelSolfejo");
  if (!modal || !btnSalvar || !btnCancel) return;
  btnCancel.onclick = () => modal.classList.remove("ativo");
  btnSalvar.onclick = async () => {
    const valor = document.getElementById("editSolfejo")?.value.trim();
    if (currentAlunoId && valor) {
      try {
        await updateDoc(doc(db, "alunos", currentAlunoId), { leituraNome: valor });
        mostrarMensagem("mensagemSucesso", "✅ Método de Solfejo atualizado!");
        const todosSnap = await getDocs(collection(db, "alunos"));
        const alunoDoc = todosSnap.docs.find(d => d.id === currentAlunoId);
        if (alunoDoc) await atualizarSnapshotMesAtual({ id: alunoDoc.id, ...alunoDoc.data(), solfejoNome: valor });
        renderizarPainel();
      } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
    }
    modal.classList.remove("ativo");
  };
}

function setupModalInstrumental() {
  const modal     = document.getElementById("modalInstrumental");
  const btnSalvar = document.getElementById("btnSalvarInstrumental");
  const btnCancel = document.getElementById("btnCancelInstrumental");
  if (!modal || !btnSalvar || !btnCancel) return;
  btnCancel.onclick = () => modal.classList.remove("ativo");
  btnSalvar.onclick = async () => {
    const valor = document.getElementById("editInstrumental")?.value.trim();
    if (currentAlunoId && valor) {
      try {
        await updateDoc(doc(db, "alunos", currentAlunoId), { metodoNome: valor });
        mostrarMensagem("mensagemSucesso", "✅ Método Instrumental atualizado!");
        const todosSnap = await getDocs(collection(db, "alunos"));
        const alunoDoc = todosSnap.docs.find(d => d.id === currentAlunoId);
        if (alunoDoc) await atualizarSnapshotMesAtual({ id: alunoDoc.id, ...alunoDoc.data(), metodoNome: valor });
        renderizarPainel();
      } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
    }
    modal.classList.remove("ativo");
  };
}

// ========== FUNÇÕES DE ALUNOS ==========
async function carregarAlunos() {
  const turmaAtiva = getTurmaAtiva();
  let snap;
  if (turmaAtiva?.id) {
    console.log(`🟡 Filtrando alunos da turma: ${turmaAtiva.nome}`);
    snap = await getDocs(
      query(collection(db, "alunos"), where("turmaId", "==", turmaAtiva.id))
    );
  } else {
    console.log("🟡 Sem turma ativa — exibindo todos os alunos.");
    snap = await getDocs(collection(db, "alunos"));
  }
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function renderizarPainel() {
  const loader   = document.getElementById("loader");
  const painel   = document.getElementById("painel");
  const conteudo = document.getElementById("conteudo");
  if (conteudo) { conteudo.innerHTML = ""; conteudo.style.display = "none"; }
  if (!loader || !painel) { console.error("❌ Elementos #loader ou #painel não encontrados."); return; }

  loader.style.display = "flex";
  painel.style.display = "none";

  const turmaAtiva = getTurmaAtiva();
  const tituloPainel = document.getElementById("tituloPainelAlunos");
  if (tituloPainel) {
    tituloPainel.textContent = turmaAtiva
      ? `👥 Alunos — ${turmaAtiva.nome}`
      : "👥 Todos os Alunos";
  }

  try {
    const alunos = await carregarAlunos();

    if (!alunos.length) {
      loader.style.display = "none";
      painel.style.display = "flex";
      painel.innerHTML = `
        <p style="color:#94a3b8;padding:30px;text-align:center;">
          ${turmaAtiva
            ? `Nenhum aluno cadastrado na turma <strong>${turmaAtiva.nome}</strong>.`
            : "Nenhum aluno cadastrado."}
        </p>`;
      return;
    }

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
            <button class="classificar" onclick="window.location.href='ficha-aluno.html?id=${aluno.id}'" title="Abrir ficha do aluno" style="background:#0ea5e9;">📋 Ficha</button>
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
  } catch (error) {
    console.error("❌ Erro ao renderizar painel:", error);
    loader.style.display = "none";
    painel.innerHTML = `<p style="color:#ff7777; padding:20px;">❌ Falha ao carregar alunos.</p>`;
    mostrarMensagem("mensagemInfo", "❌ Erro ao carregar alunos. Tente recarregar a página.");
  }
}
window.renderizarPainel = renderizarPainel;

window.selecionarFoto = function(id) {
  const input = document.getElementById(`foto-${id}`);
  if (input) input.click();
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
    await gravarNotificacaoNivel(id, campo, v);
    const todosSnap = await getDocs(collection(db, "alunos"));
    const alunoDoc = todosSnap.docs.find(d => d.id === id);
    if (alunoDoc) await atualizarSnapshotMesAtual({ id: alunoDoc.id, ...alunoDoc.data(), [campo]: v });
  } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
};

window.atualizarNota = async function(id, campo, valor) {
  try {
    let v = parseInt(valor);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 130) v = 130;
    await updateDoc(doc(db, "alunos", id), { [campo]: v });
    mostrarMensagem("mensagemSucesso", "✅ Nota atualizada!");
    await gravarNotificacaoNivel(id, campo, v);
    const todosSnap = await getDocs(collection(db, "alunos"));
    const alunoDoc = todosSnap.docs.find(d => d.id === id);
    if (alunoDoc) await atualizarSnapshotMesAtual({ id: alunoDoc.id, ...alunoDoc.data(), [campo]: v });
  } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
};

window.atualizarCampo = async function(id, campo, valor) {
  try {
    await updateDoc(doc(db, "alunos", id), { [campo]: valor });
    mostrarMensagem("mensagemSucesso", `✅ ${campo.charAt(0).toUpperCase() + campo.slice(1)} atualizado!`);
  } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
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
  } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
};

window.alternarClassificacao = async function(id, classificado) {
  try {
    await updateDoc(doc(db, "alunos", id), { classificado: !classificado });
    renderizarPainel();
    mostrarMensagem("mensagemSucesso", classificado ? "📤 Desclassificado!" : "🎯 Classificado!");
  } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
};

window.alternarAtivo = async function(id, ativo) {
  try {
    await updateDoc(doc(db, "alunos", id), { ativo: !ativo });
    renderizarPainel();
    mostrarMensagem("mensagemSucesso", ativo ? "⏸️ Aluno Desativado!" : "▶️ Aluno Ativado!");
  } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na atualização."); }
};

window.confirmarRemocao = async function(id, nome) {
  if (!confirm(`Tem certeza de que deseja remover o aluno ${nome}?`)) return;
  try {
    await deleteDoc(doc(db, "alunos", id));
    mostrarMensagem("mensagemSucesso", `🗑️ ${nome} removido!`);
    renderizarPainel();
  } catch (error) { mostrarMensagem("mensagemInfo", "❌ Erro na remoção."); }
};

window.abrirModalSolfejo = function(alunoId, valorAtual) {
  currentAlunoId = alunoId;
  const input = document.getElementById("editSolfejo");
  if (input) input.value = valorAtual || "Bona";
  document.getElementById("modalSolfejo")?.classList.add("ativo");
};

window.abrirModalInstrumental = function(alunoId, valorAtual) {
  currentAlunoId = alunoId;
  const input = document.getElementById("editInstrumental");
  if (input) input.value = valorAtual || "Método";
  document.getElementById("modalInstrumental")?.classList.add("ativo");
};

// ========== EVENTOS / CHAMADA ==========
async function criarEventoGenerico() {
  try {
    const turmaAtiva = getTurmaAtiva();
    if (!turmaAtiva?.id) {
      mostrarMensagem("mensagemInfo", "⚠️ Selecione uma turma ativa antes de criar a chamada.");
      return;
    }
    const hoje = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date()).split('/').reverse().join('-');

    const snap = await getDocs(
      query(collection(db, "eventos"),
        where("turmaId", "==", turmaAtiva.id),
        where("data",    "==", hoje)
      )
    );
    if (!snap.empty) {
      mostrarMensagem("mensagemInfo", `📅 Já existe uma chamada para ${turmaAtiva.nome} hoje!`);
      setTimeout(() => window.location.href = `ensaio.html?id=${snap.docs[0].id}`, 1500);
      return;
    }

    const alunosSnap = await getDocs(
      query(collection(db, "alunos"), where("turmaId", "==", turmaAtiva.id))
    );
    const presencas = alunosSnap.docs.map(d => ({
      alunoId:  d.id,
      nome:     d.data().nome,
      presenca: "falta"
    }));

    const novo = await addDoc(collection(db, "eventos"), {
      turmaId:   turmaAtiva.id,
      turmaNome: turmaAtiva.nome,
      data:      hoje,
      tipo:      "aula",
      observacoes: "",
      presencas
    });

    mostrarMensagem("mensagemSucesso", `📝 Chamada criada para ${turmaAtiva.nome}!`);
    setTimeout(() => window.location.href = `ensaio.html?id=${novo.id}`, 1500);
  } catch (error) {
    console.error("Erro ao criar chamada:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro ao criar chamada. Verifique conexão.");
  }
}

window.mostrarPainelLicoes = function() {
  import('./professor-licoes.js').then(module => {
    if (module.mostrarPainelLicoes) module.mostrarPainelLicoes();
  }).catch(error => console.error("Erro ao carregar professor-licoes.js:", error));
};

// ========== DOMContentLoaded ==========
document.addEventListener("DOMContentLoaded", () => {
  if (!db) { console.error("❌ Firebase DB não carregado."); return; }

  const user = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  const usuarioDiv = document.getElementById("usuarioLogado");
  if (usuarioDiv) usuarioDiv.textContent = user?.nome ? `Professor: ${user.nome}` : "-";

  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();

  document.getElementById("btnMostrarAlunos")?.addEventListener("click", renderizarPainel);
  document.getElementById("btnCriarChamada")?.addEventListener("click", criarEventoGenerico);
  document.getElementById("btnAtualizarComprometimento")?.addEventListener("click", atualizarComprometimentoGeral);

  const btnModoAluno = document.getElementById("btnModoAluno");
  if (btnModoAluno) {
    btnModoAluno.onclick = () => {
      if (user.nome) window.location.href = `aluno.html?nome=${encodeURIComponent(user.nome)}`;
    };
  }

  window.addEventListener("turmaAtualChanged", (e) => {
    const turma = e.detail;
    console.log("🔄 Turma alterada:", turma?.nome ?? "todas");
    const painel = document.getElementById("painel");
    if (painel && painel.style.display !== "none") {
      renderizarPainel();
    }
  });
});

// ========== COMPROMETIMENTO GERAL ==========
async function atualizarComprometimentoGeral() {
  const btn = document.getElementById("btnAtualizarComprometimento");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Atualizando..."; }
  try {
    const anoAtual  = new Date().getFullYear();
    const mesAtual  = String(new Date().getMonth() + 1).padStart(2, "0");
    const chaveMes  = `${anoAtual}-${mesAtual}`;

    const snapEventos = await getDocs(collection(db, "eventos"));
    const eventosMes  = snapEventos.docs
      .map(d => d.data())
      .filter(d => d.data?.startsWith(chaveMes));

    const snapAlunos = await getDocs(collection(db, "alunos"));
    let atualizados  = 0;

    for (const alunoDoc of snapAlunos.docs) {
      const dados = alunoDoc.data();
      if (dados.ativo === false) continue;
      const nomeAluno = dados.nome;
      let presencas = 0;
      eventosMes.forEach(ev => {
        const p = ev.presencas?.find(p => p.nome === nomeAluno || p.alunoId === alunoDoc.id);
        if (p?.presenca === "presente") presencas++;
      });
      const total = eventosMes.length;
      await updateDoc(doc(db, "alunos", alunoDoc.id), {
        "frequenciaMensal.porcentagem":  total > 0 ? Math.round((presencas / total) * 100) : 0,
        "frequenciaMensal.totalEventos": total,
        "frequenciaMensal.presencas":    presencas,
        ultimaAtualizacaoComprometimento: serverTimestamp()
      });
      atualizados++;
    }
    mostrarMensagem("mensagemSucesso", `⚡ Comprometimento de ${atualizados} alunos atualizado!`);
  } catch (error) {
    console.error("❌ Erro ao atualizar comprometimento:", error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⚡ Atualizar Comprometimento"; }
  }
}

// ========== EXPORT ==========
export function setupModalsAlunos() {
  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();
}
