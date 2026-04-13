// professor-licoes.js – Versão Final: Navegação + Devolução + Edição + Firebase
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

const estadoNavegacao = {};

function inserirPainel() {
  const destino = document.getElementById("painelLicoesProf");
  if (!destino) return;

  const estilo = document.createElement("style");
  estilo.textContent = `
    .grupo-aluno {
      background: rgba(15,23,42,0.8);
      border: 1px solid rgba(56,189,248,0.2);
      border-radius: 16px;
      margin-bottom: 24px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    }
    .grupo-aluno-header {
      padding: 16px;
      background: rgba(30,41,59,0.9);
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .info-aluno h3 { color: #22d3ee; font-size: 1.1rem; margin: 0; }
    .info-aluno span { color: #94a3b8; font-size: 0.8rem; }

    /* ── Navegação Mobile Grandes ── */
    .nav-licoes {
      display: flex; align-items: stretch;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .btn-nav-grande {
      flex: 0 0 65px; background: rgba(56,189,248,0.1); border: none;
      color: #38bdf8; font-size: 1.8rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-nav-grande:disabled { opacity: 0.1; }
    .indicador-posicao {
      flex: 1; padding: 12px; text-align: center;
      display: flex; flex-direction: column; justify-content: center;
    }
    .status-mini { font-size: 0.65rem; text-transform: uppercase; font-weight: 800; color: #fb923c; }

    /* ── Painel de Correção de Dados ── */
    .painel-edicao {
      background: rgba(251,146,60,0.1);
      border: 1px solid rgba(251,146,60,0.3);
      border-radius: 12px; padding: 12px; margin-bottom: 16px;
    }
    .edicao-titulo { font-size: 0.75rem; font-weight: 800; color: #fb923c; text-transform: uppercase; margin-bottom: 10px; }
    .edicao-campos { display: flex; gap: 10px; }
    .edicao-grupo { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .edicao-grupo label { font-size: 0.7rem; color: #94a3b8; }
    .edicao-grupo select, .edicao-grupo input {
      background: #0f172a; border: 1px solid #334155; border-radius: 6px;
      color: #fff; padding: 8px; font-size: 0.85rem; outline: none;
    }

    /* ── Player e Comentário ── */
    .box-audio { background: #020617; border-radius: 12px; padding: 10px; margin-bottom: 16px; }
    .box-audio audio { width: 100%; height: 35px; }
    .comentario-aluno {
      background: rgba(14,165,233,0.1); border-left: 4px solid #0ea5e9;
      padding: 12px; border-radius: 4px 12px 12px 4px; margin-bottom: 16px;
      font-size: 0.9rem; color: #cbd5e1; font-style: italic;
    }

    /* ── Ações ── */
    .area-feedback textarea {
      width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #334155;
      border-radius: 12px; padding: 12px; color: #fff; margin-bottom: 12px; resize: none;
    }
    .acoes-botoes { display: flex; gap: 10px; }
    .btn-acao {
      flex: 1; padding: 14px; border-radius: 10px; font-weight: 700;
      text-transform: uppercase; font-size: 0.75rem; cursor: pointer; border: none;
    }
    .btn-devolver { background: transparent; border: 2px solid #ef4444; color: #ef4444; }
    .btn-aprovar { background: #22c55e; color: #fff; }
    .processada { opacity: 0.3; pointer-events: none; }
  `;
  document.head.appendChild(estilo);

  const container = document.createElement("div");
  container.innerHTML = `
    <h2 style="color:#22d3ee; font-size:1.2rem; margin-bottom:15px;">🔔 Avaliação de Lições</h2>
    <div id="listaGeralLicoes"></div>
  `;
  destino.appendChild(container);
  carregarSolicitacoes();
}

async function carregarSolicitacoes() {
  const lista = document.getElementById("listaGeralLicoes");
  lista.innerHTML = "<p style='color:#94a3b8;'>Carregando...</p>";

  const q = query(collection(db, "licoes"), where("status", "==", "pendente"));
  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = "<p style='color:#64748b;'>Nenhuma lição pendente.</p>";
    return;
  }

  const licoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const porAluno = {};
  
  for (const l of licoes) {
    if (!porAluno[l.alunoNome]) {
        const aSnap = await getDocs(query(collection(db, "alunos"), where("nome", "==", l.alunoNome)));
        const aData = aSnap.empty ? {} : aSnap.docs[0].data();
        porAluno[l.alunoNome] = { licoes: [], info: aData };
    }
    porAluno[l.alunoNome].licoes.push(l);
  }

  renderizarGrupos(porAluno);
}

function renderizarGrupos(porAluno) {
  const lista = document.getElementById("listaGeralLicoes");
  lista.innerHTML = "";

  Object.entries(porAluno).forEach(([nome, dados]) => {
    if (estadoNavegacao[nome] === undefined) estadoNavegacao[nome] = 0;
    const idx = estadoNavegacao[nome];
    const item = dados.licoes[idx];
    const total = dados.licoes.length;

    const div = document.createElement("div");
    div.className = "grupo-aluno";
    div.innerHTML = `
      <div class="grupo-aluno-header">
        <div class="info-aluno"><h3>${nome}</h3><span>${dados.info.instrumento || ''}</span></div>
        <div style="background:#fbbf24; color:#000; padding:2px 8px; border-radius:10px; font-size:0.7rem; font-weight:800">${total} PENDENTES</div>
      </div>

      <div class="nav-licoes">
        <button class="btn-nav-grande" ${idx === 0 ? 'disabled' : ''} onclick="mudarLicao('${nome}', -1)">‹</button>
        <div class="indicador-posicao">
            <span class="status-mini">Lição ${idx + 1} de ${total}</span>
            <span style="font-weight:700; color:#fff">${item.tipo === 'leitura' ? (dados.info.leituraNome || 'Bona') : (dados.info.metodoNome || 'Método')} #${item.numero}</span>
        </div>
        <button class="btn-nav-grande" ${idx === total - 1 ? 'disabled' : ''} onclick="mudarLicao('${nome}', 1)">›</button>
      </div>

      <div class="conteudo-licao-corpo" id="content-${item.id}">
        <div class="painel-edicao">
            <div class="edicao-titulo">✏️ Validar Dados do Aluno</div>
            <div class="edicao-campos">
                <div class="edicao-grupo">
                    abel>Tipo</label>
                    <select id="edit-tipo-${item.id}">
                        <option value="leitura" ${item.tipo === 'leitura' ? 'selected' : ''}>Leitura</option>
                        <option value="metodo" ${item.tipo === 'metodo' ? 'selected' : ''}>Método</option>
                    </select>
                </div>
                <div class="edicao-grupo">
                    abel>Número</label>
                    <input type="number" id="edit-num-${item.id}" value="${item.numero}">
                </div>
            </div>
        </div>

        <div class="box-audio"><audio controls src="${item.audioURL}"></audio></div>

        ${item.texto ? `<div class="comentario-aluno"><small style="display:block; color:#0ea5e9; font-weight:800; font-style:normal; margin-bottom:4px">ALUNO DISSE:</small>"${item.texto}"</div>` : ''}

        <div class="area-feedback">
            <textarea id="fb-${item.id}" rows="3" placeholder="Sua orientação ou parabéns..."></textarea>
            <div class="acoes-botoes">
                <button class="btn-acao btn-devolver" onclick="processar('${item.id}', false, '${item.alunoId}', '${nome}')">Devolver para nova tentativa</button>
                <button class="btn-acao btn-aprovar" onclick="processar('${item.id}', true, '${item.alunoId}', '${nome}')">Aprovar Lição</button>
            </div>
        </div>
      </div>
    `;
    lista.appendChild(div);
  });
}

window.mudarLicao = (nome, dir) => { estadoNavegacao[nome] += dir; carregarSolicitacoes(); };

async function processar(id, aprovado, alunoId, alunoNome) {
    const card = document.getElementById(`content-${id}`);
    const tipoFinal = document.getElementById(`edit-tipo-${id}`).value;
    const numFinal = parseInt(document.getElementById(`edit-num-${id}`).value);
    const feedback = document.getElementById(`fb-${id}`).value;

    card.classList.add("processada");

    try {
        const agora = new Date();
        const licaoRef = doc(db, "licoes", id);

        await updateDoc(licaoRef, {
            status: aprovado ? "aprovado" : "reprovado",
            tipo: tipoFinal,
            numero: numFinal,
            observacaoProfessor: feedback,
            avaliadoEm: Timestamp.fromDate(agora)
        });

        if (aprovado) {
            // Atualiza nível do aluno
            await updateDoc(doc(db, "alunos", alunoId), { [tipoFinal]: numFinal });

            // Snapshot Mensal
            const chave = `${alunoId}_${agora.getFullYear()}_${String(agora.getMonth()+1).padStart(2,"0")}`;
            await setDoc(doc(db, "snapshotsMensais", chave), {
                alunoId, [tipoFinal]: numFinal, atualizadoEm: serverTimestamp()
            }, { merge: true });

            // Notificação
            await addDoc(collection(db, "notificacoes"), {
                tipo: "nivel", icone: "🚀",
                texto: `<strong>${alunoNome}</strong> avançou para o Nível ${numFinal}!`,
                data: serverTimestamp()
            });
        }

        alert(aprovado ? "✅ Aprovada!" : "↺ Devolvida!");
        carregarSolicitacoes();
    } catch (e) {
        console.error(e);
        card.classList.remove("processada");
    }
}

export function mostrarPainelLicoes() {
  const d = document.getElementById("painelLicoesProf");
  if (!d) return;
  if (!document.getElementById("listaGeralLicoes")) inserirPainel();
  d.style.display = d.style.display === "none" ? "block" : "none";
}
