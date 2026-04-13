// professor-licoes.js – Versão Refinada: Navegação Mobile + Devolução + Player
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

// Estado local para controlar qual lição está sendo visualizada em cada grupo de aluno
const estadoNavegacao = {};

function inserirPainel() {
  const destino = document.getElementById("painelLicoesProf");
  if (!destino) return;

  const estilo = document.createElement("style");
  estilo.textContent = `
    :root {
        --color-accent: #0ea5e9;
        --color-success: #22c55e;
        --color-error: #ef4444;
        --bg-dark: #0f172a;
        --bg-card: #1e293b;
    }

    .grupo-aluno {
      background: var(--bg-dark);
      border: 1px solid rgba(56,189,248,0.2);
      border-radius: 16px;
      margin-bottom: 24px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    }

    .grupo-aluno-header {
      padding: 16px;
      background: rgba(30,41,59,0.8);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .info-aluno h3 { color: #22d3ee; font-size: 1.1rem; margin: 0; }
    .info-aluno span { color: #94a3b8; font-size: 0.8rem; }

    /* ── Navegador de Lições (Setas Grandes) ── */
    .nav-licoes {
      display: flex;
      align-items: stretch;
      background: rgba(255,255,255,0.02);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .btn-nav-grande {
      flex: 0 0 60px;
      background: rgba(56,189,248,0.1);
      border: none;
      color: #38bdf8;
      font-size: 1.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: 0.2s;
    }
    .btn-nav-grande:hover:not(:disabled) { background: rgba(56,189,248,0.2); }
    .btn-nav-grande:disabled { opacity: 0.1; cursor: default; }

    .indicador-posicao {
      flex: 1;
      padding: 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .status-mini { font-size: 0.65rem; text-transform: uppercase; font-weight: 800; color: #fb923c; margin-bottom: 2px; }
    .titulo-licao-nav { font-weight: 700; color: #f1f5f9; font-size: 0.9rem; }

    /* ── Conteúdo da Lição ── */
    .conteudo-licao-corpo { padding: 20px; }

    .box-audio {
      background: #020617;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 16px;
      border: 1px solid rgba(56,189,248,0.1);
    }
    .box-audio audio { width: 100%; height: 35px; }

    .comentario-aluno-box {
      background: rgba(14,165,233,0.1);
      border-left: 4px solid var(--color-accent);
      padding: 12px;
      border-radius: 4px 12px 12px 4px;
      margin-bottom: 16px;
      font-size: 0.9rem;
      color: #cbd5e1;
      font-style: italic;
    }
    .label-msg { font-size: 0.7rem; font-weight: 900; color: var(--color-accent); text-transform: uppercase; display: block; margin-bottom: 4px; }

    .area-feedback-prof textarea {
      width: 100%;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 12px;
      color: #fff;
      font-family: inherit;
      margin-bottom: 12px;
      resize: vertical;
    }

    .acoes-botoes { display: flex; gap: 10px; }
    .btn-acao {
      flex: 1;
      padding: 14px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.8rem;
      text-transform: uppercase;
      cursor: pointer;
      border: none;
      transition: 0.3s;
    }
    .btn-devolver { background: transparent; border: 2px solid var(--color-error); color: var(--color-error); }
    .btn-aprovar { background: var(--color-success); color: #fff; }
    .btn-acao:active { transform: scale(0.96); }

    .processada { opacity: 0.3; pointer-events: none; }
  `;
  document.head.appendChild(estilo);

  const container = document.createElement("div");
  container.innerHTML = `
    <div style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
        <h2 style="color:#22d3ee; font-size:1.2rem; margin:0;">🔔 Lições para Avaliar</h2>
        <button id="btnRefresh" style="background:#0ea5e9; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">Atualizar</button>
    </div>
    <div id="listaGeralLicoes"></div>
  `;
  destino.appendChild(container);

  document.getElementById("btnRefresh").onclick = carregarSolicitacoes;
  carregarSolicitacoes();
}

async function carregarSolicitacoes() {
  const lista = document.getElementById("listaGeralLicoes");
  lista.innerHTML = "<p style='color:#94a3b8;'>Buscando lições...</p>";

  const q = query(collection(db, "licoes"), where("status", "==", "pendente"));
  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = "<p style='color:#64748b;'>Nenhuma lição pendente no momento.</p>";
    return;
  }

  // Agrupamento
  const licoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const porAluno = {};
  
  licoes.forEach(l => {
    if (!porAluno[l.alunoNome]) porAluno[l.alunoNome] = [];
    porAluno[l.alunoNome].push(l);
  });

  renderizarGrupos(porAluno);
}

function renderizarGrupos(porAluno) {
  const lista = document.getElementById("listaGeralLicoes");
  lista.innerHTML = "";

  Object.entries(porAluno).forEach(([nome, licoesAluno]) => {
    // Inicializa o índice de navegação se não existir
    if (estadoNavegacao[nome] === undefined) estadoNavegacao[nome] = 0;
    
    const idx = estadoNavegacao[nome];
    const item = licoesAluno[idx];
    const total = licoesAluno.length;

    const divGrupo = document.createElement("div");
    divGrupo.className = "grupo-aluno";
    divGrupo.id = `grupo-${nome.replace(/\s/g, '')}`;

    divGrupo.innerHTML = `
      <div class="grupo-aluno-header">
        <div class="info-aluno">
            <h3>${nome}</h3>
            <span>Lições pendentes: ${total}</span>
        </div>
      </div>

      <div class="nav-licoes">
        <button class="btn-nav-grande" ${idx === 0 ? 'disabled' : ''} onclick="mudarLicao('${nome}', -1)">‹</button>
        <div class="indicador-posicao">
            <span class="status-mini">Analisando ${idx + 1} de ${total}</span>
            <span class="titulo-licao-nav">${item.tipo === 'leitura' ? 'Leitura' : 'Método'} #${item.numero}</span>
        </div>
        <button class="btn-nav-grande" ${idx === total - 1 ? 'disabled' : ''} onclick="mudarLicao('${nome}', 1)">›</button>
      </div>

      <div class="conteudo-licao-corpo" id="card-${item.id}">
        <div class="box-audio">
            <audio controls src="${item.audioURL}"></audio>
        </div>

        ${item.texto ? `
            <div class="comentario-aluno-box">
                <span class="label-msg">Mensagem do Aluno</span>
                "${item.texto}"
            </div>
        ` : ''}

        <div class="area-feedback-prof">
            <textarea id="feedback-${item.id}" rows="3" placeholder="Escreva um feedback ou orientação..."></textarea>
            <div class="acoes-botoes">
                <button class="btn-acao btn-devolver" onclick="decisaoLicao('${item.id}', false, '${item.alunoId}', '${nome}')">Devolver lição</button>
                <button class="btn-acao btn-aprovar" onclick="decisaoLicao('${item.id}', true, '${item.alunoId}', '${nome}')">Aprovar Lição</button>
            </div>
        </div>
      </div>
    `;
    lista.appendChild(divGrupo);
  });
}

// Expõe para o escopo global para os onclicks funcionarem
window.mudarLicao = (nome, direcao) => {
    estadoNavegacao[nome] += direcao;
    carregarSolicitacoes(); // Re-renderiza com o novo índice
};

async function decisaoLicao(id, aprovado, alunoId, alunoNome) {
    const feedback = document.getElementById(`feedback-${id}`).value;
    const card = document.getElementById(`card-${id}`);
    card.classList.add("processada");

    try {
        const ref = doc(db, "licoes", id);
        const statusFinal = aprovado ? "aprovado" : "reprovado";
        
        await updateDoc(ref, {
            status: statusFinal,
            observacaoProfessor: feedback,
            avaliadoEm: serverTimestamp()
        });

        if (aprovado) {
            // Atualiza o nível do aluno no cadastro dele
            const licaoDoc = await getDoc(ref);
            const dados = licaoDoc.data();
            await updateDoc(doc(db, "alunos", alunoId), { [dados.tipo]: dados.numero });
            
            // Notificação Global
            await addDoc(collection(db, "notificacoes"), {
                tipo: "nivel",
                texto: `<strong>${alunoNome}</strong> avançou para a lição ${dados.numero}!`,
                data: serverTimestamp()
            });
        }

        // Remove a lição do array local e atualiza a tela
        alert(aprovado ? "Lição aprovada com sucesso!" : "Lição devolvida para o aluno.");
        carregarSolicitacoes();

    } catch (e) {
        console.error(e);
        card.classList.remove("processada");
    }
}

export function mostrarPainelLicoes() {
  const destino = document.getElementById("painelLicoesProf");
  if (!destino) return;

  if (!document.getElementById("listaGeralLicoes")) {
    inserirPainel();
  }
  destino.style.display = destino.style.display === "none" ? "block" : "none";
}
