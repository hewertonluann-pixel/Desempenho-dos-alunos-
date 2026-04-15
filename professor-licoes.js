// professor-licoes.js – layout por aluno com tabs Leitura/Método e navegação por setas

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// ─── Cache global para permitir re-render sem novo fetch ───────────────────────
let _gruposCache = new Map(); // Map<alunoNome, { alunoId, instrumento, solfejoNome, metodoNome, foto, leitura:[], metodo:[] }>

// ─── ESTILOS ───────────────────────────────────────────────────────────────────
function injetarEstilos() {
  if (document.getElementById("estilos-licoes-prof")) return;
  const s = document.createElement("style");
  s.id = "estilos-licoes-prof";
  s.textContent = `
    .grid-licoes-alunos {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 18px;
      margin-top: 10px;
    }
    @media (max-width: 640px) {
      .grid-licoes-alunos { grid-template-columns: 1fr; }
    }

    /* ── Card do aluno ── */
    .aluno-licao-card {
      background: linear-gradient(160deg, #0f172a, #020617);
      border: 1px solid rgba(34,211,238,0.25);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    }

    /* ── Header do aluno ── */
    .alc-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 15px;
      background: linear-gradient(135deg, rgba(34,211,238,0.07), transparent);
      border-bottom: 1px solid rgba(34,211,238,0.15);
    }
    .alc-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; font-weight: 900; color: #fff; flex-shrink: 0;
      border: 2px solid rgba(34,211,238,0.4);
      text-transform: uppercase;
    }
    .alc-avatar-img {
      width: 42px; height: 42px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
      border: 2px solid rgba(34,211,238,0.4);
    }
    .alc-info { flex: 1; min-width: 0; }
    .alc-nome { font-size: 0.95rem; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .alc-instr { font-size: 0.75rem; color: #64748b; }
    .alc-chips { display: flex; gap: 5px; flex-wrap: wrap; }
    .alc-chip {
      font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; white-space: nowrap;
    }
    .chip-l { background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.35); }
    .chip-m { background: rgba(34,197,94,0.12);  color: #86efac; border: 1px solid rgba(34,197,94,0.3); }

    /* ── Tabs tipo ── */
    .alc-tabs {
      display: flex;
      border-bottom: 1px solid rgba(34,211,238,0.1);
    }
    .alc-tab {
      flex: 1; padding: 10px 6px;
      font-size: 0.76rem; font-weight: 700;
      text-align: center; cursor: pointer;
      border: none; background: transparent;
      color: #475569;
      border-bottom: 2px solid transparent;
      transition: all 0.2s; letter-spacing: 0.3px;
    }
    .alc-tab:disabled { opacity: 0.3; cursor: default; }
    .alc-tab.tab-ativo-l { color: #a5b4fc; border-bottom-color: #818cf8; background: rgba(99,102,241,0.07); }
    .alc-tab.tab-ativo-m { color: #86efac; border-bottom-color: #4ade80; background: rgba(34,197,94,0.06); }
    .alc-tab .tab-badge {
      display: inline-block;
      background: rgba(239,68,68,0.85); color: #fff;
      border-radius: 999px; font-size: 0.58rem;
      padding: 1px 5px; margin-left: 4px; vertical-align: middle;
    }

    /* ── Corpo ── */
    .alc-body { padding: 14px 15px; }

    /* ── Navegador de lições ── */
    .alc-nav {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 11px;
    }
    .alc-nav-btn {
      width: 42px; height: 42px;
      background: rgba(34,211,238,0.07);
      border: 1px solid rgba(34,211,238,0.2);
      border-radius: 10px;
      color: #22d3ee; font-size: 1.1rem;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s; flex-shrink: 0;
      -webkit-tap-highlight-color: transparent;
    }
    .alc-nav-btn:hover:not(:disabled) { background: rgba(34,211,238,0.16); }
    .alc-nav-btn:disabled { opacity: 0.2; cursor: default; }
    .alc-indicador { flex: 1; text-align: center; padding: 0 8px; }
    .alc-num-grande {
      font-size: 2rem; font-weight: 900; color: #f9fafb; line-height: 1;
    }
    .alc-num-grande.cor-l { color: #a5b4fc; }
    .alc-num-grande.cor-m { color: #86efac; }
    .alc-num-sub  { font-size: 0.7rem; color: #64748b; margin-top: 2px; }
    .alc-paginacao { font-size: 0.62rem; color: #475569; margin-top: 3px; }

    /* ── Urgência ── */
    .alc-urgencia-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 9px;
    }
    .alc-urg {
      font-size: 0.7rem; font-weight: 700; padding: 3px 10px; border-radius: 999px;
    }
    .urg-antigo { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
    .urg-ontem  { background: rgba(250,204,21,0.12); color: #fbbf24; border: 1px solid rgba(250,204,21,0.3); }
    .urg-hoje   { background: rgba(34,197,94,0.12);  color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
    .alc-data-envio { font-size: 0.68rem; color: #475569; }

    /* ── Áudio ── */
    .alc-audio { margin-bottom: 9px; }
    .alc-audio audio { width: 100%; height: 34px; }

    /* ── Comentário ── */
    .alc-comentario {
      background: rgba(56,189,248,0.06);
      border-left: 3px solid rgba(56,189,248,0.4);
      border-radius: 0 8px 8px 0;
      padding: 7px 10px; margin-bottom: 9px;
      font-size: 0.79rem; color: #cbd5e1; line-height: 1.5;
    }
    .alc-comentario strong { font-size: 0.72rem; color: #38bdf8; display: block; margin-bottom: 2px; }

    /* ── Correção ── */
    .alc-correcao {
      display: flex; gap: 8px; align-items: flex-end;
      background: rgba(251,146,60,0.06);
      border: 1px solid rgba(251,146,60,0.2);
      border-radius: 8px; padding: 8px 10px; margin-bottom: 9px;
    }
    .alc-correcao-label { font-size: 0.65rem; font-weight: 700; color: #fb923c; margin-bottom: 3px; }
    .alc-correcao select,
    .alc-correcao input[type="number"] {
      background: rgba(15,23,42,0.9);
      border: 1px solid rgba(251,146,60,0.3);
      border-radius: 6px; color: #e2e8f0;
      font-size: 0.82rem; padding: 5px 8px; outline: none;
    }
    .alc-correcao input[type="number"] { width: 64px; }

    /* ── Feedback ── */
    .alc-feedback { margin-bottom: 11px; }
    .alc-feedback textarea {
      width: 100%; background: rgba(15,23,42,0.8);
      border: 1px solid rgba(250,204,21,0.2);
      border-radius: 8px; padding: 8px;
      color: #e2e8f0; font-size: 0.82rem;
      font-family: inherit; resize: none; height: 50px;
    }
    .alc-feedback textarea::placeholder { color: #374151; }

    /* ── Botões grandes ── */
    .alc-acoes {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
    }
    .alc-btn {
      padding: 15px 8px;
      border: none; border-radius: 12px;
      font-size: 0.9rem; font-weight: 700;
      cursor: pointer; letter-spacing: 0.3px;
      transition: transform 0.15s, box-shadow 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      -webkit-tap-highlight-color: transparent;
      min-height: 52px;
    }
    .alc-btn:active { transform: scale(0.97); }
    .alc-btn-reprovar {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: #fff; box-shadow: 0 4px 14px rgba(220,38,38,0.2);
    }
    .alc-btn-aprovar {
      background: linear-gradient(135deg, #16a34a, #15803d);
      color: #fff; box-shadow: 0 4px 14px rgba(22,163,74,0.25);
    }
    .alc-btn:hover:not(:disabled) { transform: translateY(-2px); }
    .alc-btn:disabled { opacity: 0.4; cursor: default; transform: none; }

    /* ── Sem lições neste tipo ── */
    .alc-sem-licoes {
      padding: 22px 0; text-align: center;
      font-size: 0.8rem; color: #374151;
    }

    /* ── Todas avaliadas ── */
    .alc-concluido {
      padding: 20px; text-align: center;
      font-size: 0.85rem; color: #4ade80; font-weight: 600;
    }
  `;
  document.head.appendChild(s);
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────
function badgeUrgencia(criadoEm) {
  const dias = Math.floor((Date.now() - new Date(criadoEm)) / 86_400_000);
  if (dias === 0) return `<span class="alc-urg urg-hoje">🟢 Hoje</span>`;
  if (dias === 1) return `<span class="alc-urg urg-ontem">🟡 Ontem</span>`;
  return `<span class="alc-urg urg-antigo">🔴 Há ${dias} dia${dias > 1 ? "s" : ""}</span>`;
}

function inicialAvatar(nome) {
  return (nome || "?").trim().charAt(0).toUpperCase();
}

/**
 * Retorna o HTML do avatar:
 * - Se o aluno tiver foto cadastrada no Firestore (campo "foto"),
 *   exibe <img> com fallback automático para a inicial caso a URL esteja quebrada.
 * - Caso contrário exibe div colorido com a inicial do nome.
 */
function htmlAvatar(nome, fotoURL) {
  if (fotoURL) {
    return `
      <img
        class="alc-avatar-img"
        src="${fotoURL}"
        alt="${nome}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="alc-avatar" style="display:none">${inicialAvatar(nome)}</div>
    `;
  }
  return `<div class="alc-avatar">${inicialAvatar(nome)}</div>`;
}

// ─── RENDER DO CORPO DE UMA LIÇÃO ─────────────────────────────────────────────
function htmlCorpoLicao(licao, idx, total, tipo, solfejoNome, metodoNome) {
  const nomeRef   = tipo === "leitura" ? (solfejoNome || "Bona") : (metodoNome || "N/A");
  const corClass  = tipo === "leitura" ? "cor-l" : "cor-m";
  const dataFmt   = new Date(licao.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return `
    <div class="alc-nav">
      <button class="alc-nav-btn btn-prev" ${idx === 0 ? "disabled" : ""}>◀</button>
      <div class="alc-indicador">
        <div class="alc-num-grande ${corClass}">#${licao.numero} <span style="font-size:0.65rem;font-weight:500;color:#64748b;">${nomeRef}</span></div>
        <div class="alc-num-sub">${tipo === "leitura" ? "📘 Leitura" : "🎵 Método"} — ${nomeRef}</div>
        <div class="alc-paginacao">${idx + 1} de ${total} lição${total > 1 ? "ões" : ""} pendente${total > 1 ? "s" : ""}</div>
      </div>
      <button class="alc-nav-btn btn-next" ${idx >= total - 1 ? "disabled" : ""}>▶</button>
    </div>

    <div class="alc-urgencia-row">
      ${badgeUrgencia(licao.criadoEm)}
      <span class="alc-data-envio">${dataFmt}</span>
    </div>

    <div class="alc-audio"><audio controls src="${licao.audioURL || ""}"></audio></div>

    ${licao.texto ? `<div class="alc-comentario"><strong>💬 Comentário:</strong>${licao.texto}</div>` : ""}

    <div class="alc-correcao"
      data-licao-id="${licao.id}"
      data-aluno-id="${licao.alunoId}"
      data-tipo-orig="${licao.tipo}"
      data-numero-orig="${licao.numero}"
      data-solfejo-nome="${solfejoNome || "Bona"}"
      data-metodo-nome="${metodoNome || "N/A"}">
      <div style="flex:1;">
        <div class="alc-correcao-label">✏️ Tipo</div>
        <select class="sel-tipo-corr">
          <option value="leitura" ${licao.tipo === "leitura" ? "selected" : ""}>Leitura</option>
          <option value="metodo"  ${licao.tipo === "metodo"  ? "selected" : ""}>Método</option>
        </select>
      </div>
      <div>
        <div class="alc-correcao-label">Nº</div>
        <input type="number" class="inp-num-corr" min="1" value="${licao.numero}">
      </div>
    </div>

    <div class="alc-feedback">
      <textarea class="txt-feedback" placeholder="Feedback para o aluno (opcional)...">${licao.observacaoProfessor || ""}</textarea>
    </div>

    <div class="alc-acoes">
      <button class="alc-btn alc-btn-reprovar btn-reprovar-lic">❌ Reprovar</button>
      <button class="alc-btn alc-btn-aprovar  btn-aprovar-lic" >✅ Aprovar</button>
    </div>
  `;
}

// ─── RENDER DO CARD DE UM ALUNO ───────────────────────────────────────────────
function criarCardAluno(nomeAluno, grupo) {
  const { alunoId, instrumento, solfejoNome, metodoNome, foto, leitura, metodo } = grupo;

  // Ordena por data mais antiga primeiro
  leitura.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
  metodo.sort((a, b)  => new Date(a.criadoEm) - new Date(b.criadoEm));

  const temL = leitura.length > 0;
  const temM = metodo.length  > 0;
  const tabInicialL = temL;

  const card = document.createElement("div");
  card.className = "aluno-licao-card";
  card.dataset.alunoNome = nomeAluno;

  card._tabAtiva   = tabInicialL ? "leitura" : "metodo";
  card._idxLeitura = 0;
  card._idxMetodo  = 0;

  // ── Header ──
  const header = document.createElement("div");
  header.className = "alc-header";
  header.innerHTML = `
    ${htmlAvatar(nomeAluno, foto)}
    <div class="alc-info">
      <div class="alc-nome">${nomeAluno}</div>
      <div class="alc-instr">${instrumento || "N/A"}</div>
    </div>
    <div class="alc-chips">
      ${temL ? `<span class="alc-chip chip-l">📘 ${leitura.length}</span>` : ""}
      ${temM ? `<span class="alc-chip chip-m">🎵 ${metodo.length}</span>`  : ""}
    </div>
  `;
  card.appendChild(header);

  // ── Tabs ──
  const tabs = document.createElement("div");
  tabs.className = "alc-tabs";
  tabs.innerHTML = `
    <button class="alc-tab ${tabInicialL ? "tab-ativo-l" : ""}" data-tipo="leitura" ${!temL ? "disabled" : ""}>
      📘 Leitura${temL ? `<span class="tab-badge">${leitura.length}</span>` : ""}
    </button>
    <button class="alc-tab ${!tabInicialL ? "tab-ativo-m" : ""}" data-tipo="metodo" ${!temM ? "disabled" : ""}>
      🎵 Método${temM ? `<span class="tab-badge">${metodo.length}</span>` : ""}
    </button>
  `;
  card.appendChild(tabs);

  // ── Corpo ──
  const body = document.createElement("div");
  body.className = "alc-body";
  card.appendChild(body);

  function renderCorpo() {
    const tipo  = card._tabAtiva;
    const lista = tipo === "leitura" ? leitura : metodo;
    const idx   = tipo === "leitura" ? card._idxLeitura : card._idxMetodo;

    if (lista.length === 0) {
      body.innerHTML = `<div class="alc-sem-licoes">Sem lições pendentes neste tipo.</div>`;
      return;
    }

    body.innerHTML = htmlCorpoLicao(lista[idx], idx, lista.length, tipo, solfejoNome, metodoNome);
    vincularEventosCorpo(body, card, lista, tipo);
  }

  tabs.querySelectorAll(".alc-tab").forEach(btn => {
    btn.onclick = () => {
      if (btn.disabled) return;
      card._tabAtiva = btn.dataset.tipo;
      tabs.querySelectorAll(".alc-tab").forEach(b => b.classList.remove("tab-ativo-l", "tab-ativo-m"));
      btn.classList.add(card._tabAtiva === "leitura" ? "tab-ativo-l" : "tab-ativo-m");
      renderCorpo();
    };
  });

  renderCorpo();
  return card;
}

// ─── VINCULAR EVENTOS DO CORPO ────────────────────────────────────────────────
function vincularEventosCorpo(body, card, lista, tipo) {
  const idxKey = tipo === "leitura" ? "_idxLeitura" : "_idxMetodo";

  const btnPrev = body.querySelector(".btn-prev");
  const btnNext = body.querySelector(".btn-next");

  if (btnPrev) btnPrev.onclick = () => { card[idxKey]--; reRenderCorpo(body, card, lista, tipo); };
  if (btnNext) btnNext.onclick = () => { card[idxKey]++; reRenderCorpo(body, card, lista, tipo); };

  const btnAprovar  = body.querySelector(".btn-aprovar-lic");
  const btnReprovar = body.querySelector(".btn-reprovar-lic");

  if (btnAprovar)  btnAprovar.onclick  = () => tratarLicao(body, card, lista, tipo, true);
  if (btnReprovar) btnReprovar.onclick = () => tratarLicao(body, card, lista, tipo, false);
}

function reRenderCorpo(body, card, lista, tipo) {
  const idxKey = tipo === "leitura" ? "_idxLeitura" : "_idxMetodo";
  const grupo  = _gruposCache.get(card.dataset.alunoNome);
  body.innerHTML = htmlCorpoLicao(lista[card[idxKey]], card[idxKey], lista.length, tipo, grupo.solfejoNome, grupo.metodoNome);
  vincularEventosCorpo(body, card, lista, tipo);
}

// ─── TRATAR (aprovar / reprovar) ──────────────────────────────────────────────
async function tratarLicao(body, card, lista, tipo, aprovar) {
  const idxKey  = tipo === "leitura" ? "_idxLeitura" : "_idxMetodo";
  const idx     = card[idxKey];
  const licao   = lista[idx];

  const selTipo  = body.querySelector(".sel-tipo-corr");
  const inpNum   = body.querySelector(".inp-num-corr");
  const txtFeed  = body.querySelector(".txt-feedback");

  const tipoFinal   = selTipo ? selTipo.value : licao.tipo;
  const numeroFinal = inpNum  ? parseInt(inpNum.value, 10) : licao.numero;
  const feedback    = txtFeed ? txtFeed.value.trim() : "";

  const grupo     = _gruposCache.get(card.dataset.alunoNome);
  const nomeRef   = tipoFinal === "leitura" ? (grupo.solfejoNome || "Bona") : (grupo.metodoNome || "N/A");
  const alunoId   = licao.alunoId;
  const alunoNome = card.dataset.alunoNome;
  const agora     = new Date();

  body.querySelectorAll(".alc-btn").forEach(b => b.disabled = true);

  const dadosCorrigidos = {
    tipo:              tipoFinal,
    numero:            numeroFinal,
    corrigidoPeloProf: (tipoFinal !== licao.tipo || numeroFinal !== licao.numero)
  };

  if (aprovar) {
    await updateDoc(doc(db, "alunos", alunoId), { [tipoFinal]: numeroFinal });

    await updateDoc(doc(db, "licoes", licao.id), {
      ...dadosCorrigidos,
      status: "aprovado",
      observacaoProfessor: feedback,
      respondidoEm: agora.toISOString(),
      avaliadoEm:   Timestamp.fromDate(agora)
    });

    const ano   = agora.getFullYear();
    const mes   = agora.getMonth() + 1;
    const chave = `${alunoId}_${ano}_${String(mes).padStart(2, "0")}`;

    const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
    const alunoData = alunoSnap.exists() ? alunoSnap.data() : {};

    const payload = {
      alunoId, ano, mes, chave,
      origem: "aprovacao_professor",
      atualizadoEm: Timestamp.fromDate(agora)
    };

    if (tipoFinal === "leitura") {
      payload.leitura                  = numeroFinal;
      payload.licaoLeitura             = `${nomeRef} #${numeroFinal}`;
      payload.nomeMetodoLeitura        = nomeRef;
      payload.metodo                   = alunoData.metodo ?? 0;
      payload.licaoMetodo              = alunoData.licaoMetodo || "";
      payload.nomeMetodoInstrumental   = alunoData.metodoNome || "-";
    } else {
      payload.metodo                   = numeroFinal;
      payload.licaoMetodo              = `${nomeRef} #${numeroFinal}`;
      payload.nomeMetodoInstrumental   = nomeRef;
      payload.leitura                  = alunoData.leitura ?? 0;
      payload.licaoLeitura             = alunoData.licaoLeitura || "";
      payload.nomeMetodoLeitura        = alunoData.leituraNome || "Bona";
    }

    await setDoc(doc(db, "snapshotsMensais", chave), payload, { merge: true });

    const tipoLabel = tipoFinal === "leitura" ? "leitura" : "método";
    await addDoc(collection(db, "notificacoes"), {
      tipo: "nivel", icone: "🚀", alunoNome,
      texto: `<strong>${alunoNome}</strong> avançou para o <em>Nível ${numeroFinal} de ${tipoLabel}</em> (${nomeRef})`,
      data: serverTimestamp()
    });

  } else {
    await updateDoc(doc(db, "licoes", licao.id), {
      ...dadosCorrigidos,
      status: "reprovado",
      observacaoProfessor: feedback,
      respondidoEm: agora.toISOString(),
      avaliadoEm:   Timestamp.fromDate(agora)
    });
  }

  lista.splice(idx, 1);

  const tabBtn = card.querySelector(`.alc-tab[data-tipo="${tipo}"]`);
  const badge  = tabBtn?.querySelector(".tab-badge");
  if (badge) {
    if (lista.length === 0) {
      badge.remove();
      tabBtn.disabled = true;
      tabBtn.classList.remove("tab-ativo-l", "tab-ativo-m");
    } else {
      badge.textContent = lista.length;
    }
  }

  const chipSel = tipo === "leitura" ? ".chip-l" : ".chip-m";
  const chip = card.querySelector(chipSel);
  if (chip) {
    if (lista.length === 0) chip.remove();
    else chip.textContent = (tipo === "leitura" ? "📘 " : "🎵 ") + lista.length;
  }

  if (lista.length === 0) {
    const outroTipo  = tipo === "leitura" ? "metodo" : "leitura";
    const outraLista = outroTipo === "leitura"
      ? _gruposCache.get(card.dataset.alunoNome).leitura
      : _gruposCache.get(card.dataset.alunoNome).metodo;

    if (outraLista.length > 0) {
      card._tabAtiva = outroTipo;
      const outroTab = card.querySelector(`.alc-tab[data-tipo="${outroTipo}"]`);
      card.querySelectorAll(".alc-tab").forEach(b => b.classList.remove("tab-ativo-l", "tab-ativo-m"));
      outroTab?.classList.add(outroTipo === "leitura" ? "tab-ativo-l" : "tab-ativo-m");
      reRenderCorpo(body, card, outraLista, outroTipo);
    } else {
      body.innerHTML = `<div class="alc-concluido">🎉 Todas as lições de ${alunoNome} foram avaliadas!</div>`;
    }
  } else {
    if (card[idxKey] >= lista.length) card[idxKey] = lista.length - 1;
    reRenderCorpo(body, card, lista, tipo);
  }
}

// ─── INSERIR PAINEL ───────────────────────────────────────────────────────────
function inserirPainel() {
  const destino = document.getElementById("painelLicoesProf");
  if (!destino) { console.error("❌ painelLicoesProf não encontrado."); return; }

  injetarEstilos();

  const wrapper = document.createElement("div");
  wrapper.id = "cardSolicitacoesLicao";
  wrapper.style.cssText = "background:rgba(15,23,42,0.9);border:1px solid rgba(56,189,248,0.3);border-radius:12px;padding:14px;box-shadow:0 0 18px rgba(15,118,255,0.35);margin-bottom:18px;";

  wrapper.innerHTML = `
    <h2 style="color:#22d3ee;margin:0 0 6px 0;font-size:1.1rem;">🔔 Solicitações de lição</h2>
    <p style="opacity:0.7;font-size:0.82rem;margin-bottom:12px;">Lições agrupadas por aluno · mais antigas primeiro. Navegue entre lições com as setas ◀ ▶.</p>
    <button id="btnAtualizarSolicitacoes"
      style="width:100%;padding:8px;border-radius:8px;border:none;background:#0ea5e9;color:#fff;font-weight:600;cursor:pointer;margin-bottom:14px;">
      Atualizar lista
    </button>
    <div id="listaSolicitacoesLicao" class="grid-licoes-alunos"></div>
  `;

  destino.appendChild(wrapper);
  document.getElementById("btnAtualizarSolicitacoes").onclick = carregarSolicitacoes;
  carregarSolicitacoes();
}

// ─── CARREGAR SOLICITAÇÕES ────────────────────────────────────────────────────
async function carregarSolicitacoes() {
  const lista = document.getElementById("listaSolicitacoesLicao");
  if (!lista) return;

  lista.innerHTML = "<p style='color:#64748b;font-size:0.85rem;'>⌛ Carregando...</p>";
  _gruposCache.clear();

  const snap = await getDocs(query(collection(db, "licoes"), where("status", "==", "pendente")));

  if (snap.empty) {
    lista.innerHTML = "<p style='color:#64748b;font-size:0.85rem;'>Nenhuma solicitação pendente.</p>";
    return;
  }

  const itens = await Promise.all(
    snap.docs.map(async (docSnap) => {
      const d = { id: docSnap.id, ...docSnap.data() };
      const aSnap = await getDocs(query(collection(db, "alunos"), where("nome", "==", d.alunoNome)));
      if (!aSnap.empty) {
        const a = aSnap.docs[0].data();
        d.instrumento = a.instrumento || "N/A";
        d.solfejoNome = a.leituraNome || a.solfejoNome || "Bona";
        d.metodoNome  = a.metodoNome  || "N/A";
        d.foto        = a.foto        || "";   // ← campo de foto do aluno
      }
      return d;
    })
  );

  itens.forEach(item => {
    if (!_gruposCache.has(item.alunoNome)) {
      _gruposCache.set(item.alunoNome, {
        alunoId:     item.alunoId,
        instrumento: item.instrumento || "N/A",
        solfejoNome: item.solfejoNome || "Bona",
        metodoNome:  item.metodoNome  || "N/A",
        foto:        item.foto        || "",   // ← armazenado no cache
        leitura: [],
        metodo:  []
      });
    }
    const g = _gruposCache.get(item.alunoNome);
    if (item.tipo === "leitura") g.leitura.push(item);
    else                         g.metodo.push(item);
  });

  const nomesOrdenados = [..._gruposCache.keys()].sort((a, b) => a.localeCompare(b, "pt-BR"));

  lista.innerHTML = "";
  nomesOrdenados.forEach(nome => {
    lista.appendChild(criarCardAluno(nome, _gruposCache.get(nome)));
  });
}

// ─── EXPORTAÇÃO ───────────────────────────────────────────────────────────────
export function mostrarPainelLicoes() {
  const destino = document.getElementById("painelLicoesProf");
  if (!destino) { console.error("❌ painelLicoesProf não encontrado."); return; }

  if (!document.getElementById("cardSolicitacoesLicao")) {
    inserirPainel();
    destino.style.display = "block";
    return;
  }

  destino.style.display = (destino.style.display === "none" || destino.style.display === "") ? "block" : "none";
}
