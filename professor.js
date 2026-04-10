// ========== professor.js ==========
import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { atualizarSnapshotMesAtual } from "./snapshots-mensais.js";
import { obterEventosDoAno, agruparEventosPorMes, calcularFrequenciaMensalParaAluno } from "./frequencia.js";

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
        ? (dados.leituraNome ? `(${dados.leituraNome})` : "")
        : (dados.metodoNome ? `(${dados.metodoNome})` : "");
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
  const conteudo = document.getElementById("conteudo");
  const painel = document.getElementById("painel");
  const painelLicoes = document.getElementById("painelLicoesProf");
  const intro = document.querySelector(".intro-section");

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
  const modal = document.getElementById("modalAdicionar");
  const btnAdd = document.getElementById("btnAdicionarAluno");
  const btnConfirm = document.getElementById("btnConfirmarAdicionar");
  const btnCancel = document.getElementById("btnCancelarAdicionar");

  if (!modal || !btnAdd || !btnConfirm || !btnCancel) return;

  btnAdd.onclick = () => modal.classList.add("ativo");
  btnCancel.onclick = () => modal.classList.remove("ativo");

  btnConfirm.onclick = async () => {
    const nome = document.getElementById("novoNome")?.value.trim();
    const instrumento = document.getElementById("novoInstrumento")?.value.trim();
    const fotoFile = document.getElementById("novoFoto")?.files[0];

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
        turmaId: turmaAtiva?.id || "",
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
  const modal = document.getElementById("modalSolfejo");
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
  const modal = document.getElementById("modalInstrumental");
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
    snap = await getDocs(query(collection(db, "alunos"), where("turmaId", "==", turmaAtiva.id)));
  } else {
    snap = await getDocs(collection(db, "alunos"));
  }
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function renderizarPainel() {
  const loader = document.getElementById("loader");
  const painel = document.getElementById("painel");
  const conteudo = document.getElementById("conteudo");

  if (conteudo) { conteudo.innerHTML = ""; conteudo.style.display = "none"; }
  if (!loader || !painel) return;

  loader.style.display = "flex";
  painel.style.display = "none";

  const turmaAtiva = getTurmaAtiva();
  const tituloPainel = document.getElementById("tituloPainelAlunos");
  if (tituloPainel) tituloPainel.textContent = turmaAtiva ? `👥 Alunos — ${turmaAtiva.nome}` : "👥 Todos os Alunos";

  try {
    const alunos = await carregarAlunos();
    if (!alunos.length) {
      loader.style.display = "none";
      painel.style.display = "flex";
      painel.innerHTML = `<p style="color:#94a3b8;padding:30px;text-align:center;">Nenhum aluno cadastrado.</p>`;
      return;
    }

    painel.innerHTML = alunos.map(aluno => `
      <div class="ficha-aluno-card ${aluno.ativo === false ? 'inativo' : ''}">
        <div class="card-header">
          <div class="foto-container" onclick="selecionarFoto('${aluno.id}')">
            ${aluno.foto ? `<img src="${aluno.foto}" alt="Foto">` : '<div class="sem-foto">👤</div>'}
            <div class="foto-overlay">📷</div>
            <input type="file" id="foto-${aluno.id}" accept="image/*" style="display:none;" onchange="atualizarFoto('${aluno.id}', this.files[0])">
          </div>
          <div class="header-info">
            <h3 title="${aluno.nome}">${aluno.nome}</h3>
            <p>${aluno.instrumento || '—'} · ${aluno.turmaNome || 'Sem turma'}</p>
          </div>
          <div class="status-badge ${aluno.ativo === false ? 'off' : 'on'}">
            ${aluno.ativo === false ? 'Inativo' : 'Ativo'}
          </div>
        </div>

        <div class="card-body">
          <div class="progresso-container">
            <div class="progresso-item">
              <div class="item-label" onclick="abrirModalSolfejo('${aluno.id}', '${aluno.leituraNome || 'Bona'}')">
                📖 ${aluno.leituraNome || 'Bona'} ✏️
              </div>
              <div class="controles">
                <button onclick="alterarNota('${aluno.id}', 'leitura', -1)">−</button>
                <input type="number" id="leitura-${aluno.id}" value="${aluno.leitura || 1}" onchange="atualizarNota('${aluno.id}','leitura',this.value)">
                <button onclick="alterarNota('${aluno.id}', 'leitura', 1)">+</button>
              </div>
            </div>
            <div class="progresso-item">
              <div class="item-label" onclick="abrirModalInstrumental('${aluno.id}', '${aluno.metodoNome || 'Método'}')">
                🎵 ${aluno.metodoNome || 'Método'} ✏️
              </div>
              <div class="controles">
                <button onclick="alterarNota('${aluno.id}', 'metodo', -1)">−</button>
                <input type="number" id="metodo-${aluno.id}" value="${aluno.metodo || 1}" onchange="atualizarNota('${aluno.id}','metodo',this.value)">
                <button onclick="alterarNota('${aluno.id}', 'metodo', 1)">+</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <button class="btn-card-action primary" onclick="window.location.href='ficha-aluno.html?id=${aluno.id}'" title="Ver ficha">📋 Ficha</button>
          <button class="btn-card-action secondary ${aluno.classificado ? 'active' : ''}" onclick="alternarClassificacao('${aluno.id}', ${aluno.classificado})">
            ${aluno.classificado ? '★ Classificado' : '☆ Classificar'}
          </button>
          <button class="btn-card-action icon-only ${aluno.ativo === false ? 'play' : 'pause'}"
            onclick="alternarAtivo('${aluno.id}', ${aluno.ativo !== false})"
            title="${aluno.ativo === false ? 'Ativar' : 'Desativar'}">
            ${aluno.ativo === false ? '▶️' : '⏸️'}
          </button>
          <button class="btn-card-action icon-only danger" onclick="confirmarRemocao('${aluno.id}', '${aluno.nome}')" title="Remover">🗑️</button>
        </div>
      </div>
    `).join("");

    loader.style.display = "none";
    painel.style.display = "flex";

    if (!document.getElementById("style-cards-novos")) {
      const style = document.createElement("style");
      style.id = "style-cards-novos";
      style.innerHTML = `
        #painel { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; padding: 20px; }
        .ficha-aluno-card {
          background: #1e293b; border-radius: 12px; border: 1px solid #334155;
          width: 320px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;
          display: flex; flex-direction: column; color: #f1f5f9; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .ficha-aluno-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2); border-color: #475569; }
        .ficha-aluno-card.inativo { opacity: 0.8; border-color: #ef444455; }
        .card-header { display: flex; align-items: center; padding: 16px; gap: 12px; position: relative; border-bottom: 1px solid #334155; }
        .foto-container { position: relative; width: 56px; height: 56px; border-radius: 50%; overflow: hidden; background: #334155; cursor: pointer; border: 2px solid #0ea5e9; }
        .foto-container img { width: 100%; height: 100%; object-fit: cover; }
        .sem-foto { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 24px; }
        .foto-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.2s; font-size: 14px; }
        .foto-container:hover .foto-overlay { opacity: 1; }
        .header-info { flex: 1; min-width: 0; }
        .header-info h3 { margin: 0; font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #f8fafc; }
        .header-info p { margin: 2px 0 0; font-size: 13px; color: #94a3b8; }
        .status-badge { position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
        .status-badge.on { background: #064e3b; color: #34d399; }
        .status-badge.off { background: #450a0a; color: #f87171; }
        .card-body { padding: 16px; flex: 1; }
        .progresso-container { display: flex; gap: 12px; }
        .progresso-item { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .item-label { font-size: 11px; color: #94a3b8; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .item-label:hover { color: #0ea5e9; text-decoration: underline; }
        .controles { display: flex; align-items: center; background: #0f172a; border-radius: 6px; border: 1px solid #334155; height: 32px; padding: 2px; }
        .controles button { background: none; border: none; color: #94a3b8; width: 24px; cursor: pointer; font-size: 16px; }
        .controles button:hover { color: #f1f5f9; background: #1e293b; border-radius: 4px; }
        .controles input { background: none; border: none; color: #f1f5f9; width: 34px; text-align: center; font-size: 14px; font-weight: 600; padding: 0; }
        .controles input::-webkit-inner-spin-button { -webkit-appearance: none; }
        .card-footer { padding: 12px 16px; display: flex; gap: 8px; border-top: 1px solid #334155; background: #1e293b; }
        .btn-card-action {
          flex: 1; height: 32px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: none;
          display: flex; align-items: center; justify-content: center; gap: 4px; transition: 0.2s;
        }
        .btn-card-action.primary { background: #0ea5e9; color: #fff; }
        .btn-card-action.primary:hover { background: #0284c7; }
        .btn-card-action.secondary { background: #334155; color: #cbd5e1; }
        .btn-card-action.secondary:hover { background: #475569; color: #f1f5f9; }
        .btn-card-action.secondary.active { background: #fbbf2433; color: #fbbf24; border: 1px solid #fbbf2455; }
        .btn-card-action.icon-only { flex: 0 0 32px; font-size: 14px; background: #334155; }
        .btn-card-action.icon-only:hover { background: #475569; }
        .btn-card-action.danger:hover { background: #991b1b; color: #fff; }
      `;
      document.head.appendChild(style);
    }

  } catch (error) {
    console.error("❌ Erro ao renderizar painel:", error);
    loader.style.display = "none";
    painel.innerHTML = `<p style="color:#ff7777; padding:20px;">❌ Falha ao carregar alunos.</p>`;
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
    const snap = await carregarAlunos();
    const aluno = snap.find(a => a.id === id);
    if (aluno) await atualizarSnapshotMesAtual({ ...aluno, [campo]: v });
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
    const snap = await carregarAlunos();
    const aluno = snap.find(a => a.id === id);
    if (aluno) await atualizarSnapshotMesAtual({ ...aluno, [campo]: v });
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
        where("data", "==", hoje)
      ));

    if (!snap.empty) {
      mostrarMensagem("mensagemInfo", `📅 Já existe uma chamada para ${turmaAtiva.nome} hoje!`);
      setTimeout(() => window.location.href = `ensaio.html?id=${snap.docs[0].id}`, 1500);
      return;
    }

    const alunosSnap = await getDocs(query(collection(db, "alunos"), where("turmaId", "==", turmaAtiva.id)));
    const presencas = alunosSnap.docs.map(d => ({ alunoId: d.id, nome: d.data().nome, presenca: "falta" }));

    const novo = await addDoc(collection(db, "eventos"), {
      turmaId: turmaAtiva.id, turmaNome: turmaAtiva.nome, data: hoje, tipo: "aula", observacoes: "", presencas
    });

    mostrarMensagem("mensagemSucesso", `📝 Chamada criada para ${turmaAtiva.nome}!`);
    setTimeout(() => window.location.href = `ensaio.html?id=${novo.id}`, 1500);
  } catch (error) {
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
  if (btnModoAluno) btnModoAluno.onclick = () => {
    if (user.nome) window.location.href = `aluno.html?nome=${encodeURIComponent(user.nome)}`;
  };

  window.addEventListener("turmaAtualChanged", () => {
    const painel = document.getElementById("painel");
    if (painel && painel.style.display !== "none") renderizarPainel();
  });
});

// ========== COMPROMETIMENTO GERAL ==========
async function atualizarComprometimentoGeral() {
  const btn = document.getElementById("btnAtualizarComprometimento");
  if (btn) { btn.disabled = true; btn.textContent = "⏳ Atualizando..."; }

  try {
    const anoAtual = new Date().getFullYear();
    const mesAtual = String(new Date().getMonth() + 1).padStart(2, "0");
    const chaveMes = `${anoAtual}-${mesAtual}`;

    // Carregar todos os alunos (sem filtro de turma ativa)
    // para garantir que TODOS sejam atualizados corretamente,
    // cada um usando somente os eventos da sua própria turma.
    const alunosSnap = await getDocs(collection(db, "alunos"));

    // Agrupar alunos por turmaId para minimizar leituras no Firestore:
    // em vez de buscar eventos N vezes (1 por aluno), buscamos 1 vez por turma.
    const turmasMap = {}; // { turmaId: { eventos, agrupado } }

    for (const alunoDoc of alunosSnap.docs) {
      const dados = alunoDoc.data();
      if (dados.ativo === false) continue;

      const turmaId = dados.turmaId || null;

      // Se ainda não buscamos os eventos desta turma, buscar agora
      if (turmaId && !turmasMap[turmaId]) {
        const eventosDoAno = await obterEventosDoAno(anoAtual, turmaId);
        turmasMap[turmaId] = {
          agrupado: agruparEventosPorMes(eventosDoAno)
        };
      }

      // Aluno sem turmaId: freq = 0, não é possível calcular denominável correto
      if (!turmaId) {
        await updateDoc(doc(db, "alunos", alunoDoc.id), {
          "frequenciaMensal.porcentagem": 0,
          "frequenciaMensal.totalEventos": 0,
          "frequenciaMensal.presencas": 0,
          ultimaAtualizacaoComprometimento: serverTimestamp()
        });
        continue;
      }

      // Calcular frequência do aluno usando somente os eventos da sua turma
      const eventosMes = turmasMap[turmaId].agrupado[chaveMes] || [];
      const freq = calcularFrequenciaMensalParaAluno(eventosMes, dados.nome);

      await updateDoc(doc(db, "alunos", alunoDoc.id), {
        "frequenciaMensal.porcentagem": freq.percentual,
        "frequenciaMensal.totalEventos": freq.totalEventos,
        "frequenciaMensal.presencas": freq.presencasAluno,
        ultimaAtualizacaoComprometimento: serverTimestamp()
      });
    }

    const total = alunosSnap.docs.filter(d => d.data().ativo !== false).length;
    mostrarMensagem("mensagemSucesso", `⚡ Comprometimento de ${total} alunos atualizado por turma!`);
  } catch (error) {
    console.error(error);
    mostrarMensagem("mensagemInfo", "❌ Erro na atualização.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "⚡ Atualizar Comprometimento"; }
  }
}

export function setupModalsAlunos() {
  setupModalAdicionar();
  setupModalSolfejo();
  setupModalInstrumental();
}
