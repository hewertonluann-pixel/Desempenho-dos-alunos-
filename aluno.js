// aluno.js
// ==========================================
// PAINEL DO ALUNO — Sistema Unificado
// Atualiza frequência, energia, conquistas,
// gráfico de evolução histórica (Bona / Método)
// ==========================================

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  obterEventosDoAno,
  agruparEventosPorMes,
  calcularFrequenciaMensalParaAluno,
  gerarPainelFrequencia
} from "./frequencia.js";

import { carregarLicoesAluno } from "./licoes.js";
import { gerarPainelConquistas } from "./conquistas.js";

/* ========================================================
    1. OBTER ALUNO LOGADO (pela URL)
   ======================================================== */
export async function carregarAlunoAtual() {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");

  if (!nomeAluno) {
    window.location.href = "index.html";
    return null;
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

/* ========================================================
    2. EXIBIR DADOS DO ALUNO
   ======================================================== */
export function montarPainelAluno(aluno) {
  document.getElementById("nomeAluno").textContent = aluno.nome;
  document.getElementById("instrumentoAluno").textContent = aluno.instrumento || "Não definido";

  const fotoImg = document.getElementById("fotoAluno");
  if (fotoImg) fotoImg.src = aluno.foto || "https://via.placeholder.com/150";

  const leitura = aluno.leitura ?? 0;
  const metodo = aluno.metodo ?? 0;

  document.getElementById("nivelLeitura").textContent = leitura;
  document.getElementById("nivelMetodo").textContent = metodo;
  document.getElementById("nivelGeral").textContent = leitura + metodo;

  if (aluno.classificado === true) {
    document.getElementById("modoProfessorBtn").style.display = "block";
  }
}

/* ========================================================
    3. ATUALIZAR ENERGIA BARRA
   ======================================================== */
export function atualizarEnergiaVisual(valor, tipo = "mensal") {
  const sufixo = tipo === "geral" ? "Geral" : "Mensal";
  const barra = document.getElementById("barraEnergia" + sufixo);
  const numero = document.getElementById("valorEnergia" + sufixo);

  if (!barra || !numero) return;

  barra.style.width = valor + "%";
  numero.textContent = valor + "%";

  if (valor >= 80) barra.style.backgroundColor = "var(--verde)";
  else if (valor >= 40) barra.style.backgroundColor = "var(--amarelo)";
  else barra.style.backgroundColor = "var(--vermelho)";
}

/* ========================================================
    4. GRÁFICO FREQUÊNCIA ANUAL
   ======================================================== */
export async function montarGraficoFrequencia(aluno) {
  const anoAtual = parseInt(new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric'
  }).format(new Date()), 10);
  const destino = document.getElementById("gradeFrequencia");
  const destinoPopup = document.getElementById("popupFrequencia");

  if (!destino) return;

  await gerarPainelFrequencia(
    aluno,
    anoAtual,
    destino,
    dadosPopup => abrirPopupFrequencia(dadosPopup, destinoPopup)
  );
}

/* POPUP FREQUÊNCIA */
export async function abrirPopupFrequencia(info, destino) {
  if (!destino) return;

  const meses = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"
  };

  const aluno = await carregarAlunoAtual();
  const { mapaConquistas } = await import("./conquistas.js");

  const alunoSimulado = {
    ...aluno,
    frequenciaMensal: { porcentagem: info.percentual }
  };

  const conquistasMes = [];
  if (mapaConquistas.presenca_perfeita.condicao(alunoSimulado)) conquistasMes.push(mapaConquistas.presenca_perfeita);
  if (mapaConquistas.musico_pontual.condicao(alunoSimulado)) conquistasMes.push(mapaConquistas.musico_pontual);

  destino.querySelector(".modal-content").innerHTML = `
    <span class="close-button" onclick="fecharPopupFrequencia()">&times;</span>
    <h2 style="margin-bottom: 5px;">Frequência</h2>
    <p style="text-align:center; color:var(--muted); margin-bottom:20px;">${meses[info.mes]} / 2026</p>
    
    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-label">Chamadas</span>
        <span class="stat-value">${info.totalEventos}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Presenças</span>
        <span class="stat-value">${info.presencasAluno}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Frequência</span>
        <span class="stat-value">${info.percentual}%</span>
      </div>
    </div>

    <div class="modal-conquistas-section">
      <h4>Medalhas do Mês</h4>
      <div class="modal-conquistas-list">
        ${conquistasMes.length > 0
          ? conquistasMes.map(c => `
              <div class="mini-achievement ${c.raridade}">
                <span>${c.icone}</span>
                <span>${c.titulo}</span>
              </div>
            `).join('')
          : `<p style="font-size:0.8rem; color:var(--muted); text-align:center; width:100%;">Nenhuma medalha conquistada neste mês.</p>`
        }
      </div>
    </div>

    <button class="btn-fechar-modal" onclick="fecharPopupFrequencia()">FECHAR</button>
  `;

  destino.style.display = "flex";
}

window.fecharPopupFrequencia = () => {
  document.getElementById("popupFrequencia").style.display = "none";
};

/* ========================================================
    5. CONQUISTAS
   ======================================================== */
window.abrirPopupConquista = function(icone, titulo, descricao, detalhes) {
  console.log('🔍 Abrindo popup de conquista:', titulo);
  const popup = document.getElementById('popupConquista');
  if (!popup) {
    console.error('❌ Modal de conquista não encontrado!');
    return;
  }

  safeSet('conquistaIcone', icone || '🏆');
  safeSet('conquistaTitulo', titulo || 'Conquista');
  safeSet('conquistaDescricao', descricao || 'Descrição não disponível.');
  safeHTML('conquistaDetalhes', detalhes ? detalhes.map(item => `<li>${item}</li>`).join('') : '');

  popup.style.display = 'flex';
  popup.classList.add('active');
};

window.fecharPopupConquista = function() {
  const popup = document.getElementById('popupConquista');
  if (popup) {
    popup.style.display = 'none';
    popup.classList.remove('active');
    console.log('✅ Popup de conquista fechado.');
  }
};

/* ========================================================
    6. CALCULAR ENERGIA (Frequência do mês e ano)
   ======================================================== */
export async function calcularEnergiaDoAluno(aluno) {
  const brasilia = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit'
  }).format(new Date());
  const [mesAtual, anoAtual] = brasilia.split('/');

  const eventosAno = await obterEventosDoAno(anoAtual);

  const grupos = agruparEventosPorMes(eventosAno);
  const chaveMes = `${anoAtual}-${mesAtual}`;
  const eventosMes = grupos[chaveMes] || [];
  const freqMensal = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);

  atualizarEnergiaVisual(freqMensal.percentual, "mensal");

  const freqGeral = calcularFrequenciaMensalParaAluno(eventosAno, aluno.nome);
  atualizarEnergiaVisual(freqGeral.percentual, "geral");

  return freqMensal.percentual;
}

/* ========================================================
    7. CARREGAR SNAPSHOTS MENSAIS (para o gráfico Evolução Técnica)
   ======================================================== */
async function carregarSnapshotsMensais(alunoId) {
  try {
    const q = query(
      collection(db, "snapshotsMensais"),
      where("alunoId", "==", alunoId)
    );
    const snap = await getDocs(q);
    const lista = [];
    snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
    return lista;
  } catch (e) {
    console.warn("⚠️ Não foi possível carregar snapshotsMensais:", e);
    return [];
  }
}

/* ========================================================
    8. INICIALIZAÇÃO FINAL
   ======================================================== */
export async function iniciarPainelAluno() {
  const aluno = await carregarAlunoAtual();
  if (!aluno) return;

  // =====================================================
  // 🔥 CONTROLE DE PERMISSÃO
  // =====================================================
  const usuario = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  const ehDonoDaPagina = usuario.nome && usuario.nome === aluno.nome;

  if (!ehDonoDaPagina) {
    const btnSenha = document.querySelector(".btn-change-password");
    if (btnSenha) btnSenha.style.display = "none";
  }

  if (!ehDonoDaPagina) {
    const labelFoto = document.querySelector('label[for="novaFoto"]');
    const inputFoto = document.getElementById("novaFoto");
    if (labelFoto) labelFoto.style.display = "none";
    if (inputFoto) inputFoto.style.display = "none";
  }

  if (!ehDonoDaPagina) {
    const painelLicoes = document.querySelector(".lessons-section");
    if (painelLicoes) painelLicoes.style.display = "none";
  }

  // =====================================================
  // 👁️ PREFERÊNCIAS DE VISUALIZAÇÃO
  // =====================================================
  const preferencias = aluno.preferencias || {};

  if (preferencias.comprometimento === false) {
    const p = document.querySelector(".energy-section");
    if (p) p.style.display = "none";
  }
  if (preferencias.frequencia === false) {
    const p = document.querySelector(".frequency-section");
    if (p) p.style.display = "none";
  }
  if (preferencias.conquistas === false) {
    const p = document.querySelector(".achievements-section");
    if (p) p.style.display = "none";
  }
  if (preferencias.evolucao === false) {
    const p = document.querySelector(".evolution-section");
    if (p) p.style.display = "none";
  }
  if (preferencias.notificacoes === false) {
    const p = document.querySelector(".notifications-section");
    if (p) p.style.display = "none";
  }
  if (preferencias.licoes === false && ehDonoDaPagina) {
    const p = document.querySelector(".lessons-section");
    if (p) p.style.display = "none";
  }

  // =====================================================

  montarPainelAluno(aluno);
  await montarGraficoFrequencia(aluno);

  const energia = await calcularEnergiaDoAluno(aluno);

  // ── GRÁFICO EVOLUÇÃO TÉCNICA ─────────────────────────────────────────
  // Lê snapshotsMensais (formato correto esperado pelo gráfico)
  // em vez de historicoProgresso (formato incompatível)
  const snapshots = await carregarSnapshotsMensais(aluno.id);

  const destinoGrafico = document.getElementById("painelEvolucao");
  if (window.gerarGraficoEvolucao) {
    gerarGraficoEvolucao(aluno, energia, destinoGrafico, snapshots);
  }
  // ──────────────────────────────────────────────────────────────

  gerarPainelConquistas(aluno, document.getElementById("grade-conquistas"));

  if (ehDonoDaPagina) {
    await carregarLicoesAluno(aluno.nome);
  }
}

/* ========================================================
    9. POPUP SENHA
   ======================================================== */
window.abrirPopup = () => {
  document.getElementById("popupSenha").style.display = "flex";
  document.getElementById("mensagemSenha").textContent = "";
  document.getElementById("novaSenha").value = "";
};

window.fecharPopup = () => {
  document.getElementById("popupSenha").style.display = "none";
};

window.salvarSenha = async () => {
  const novaSenha = document.getElementById("novaSenha").value;
  const mensagem = document.getElementById("mensagemSenha");
  const aluno = await carregarAlunoAtual();

  if (novaSenha.length < 6) {
    mensagem.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  try {
    await updateDoc(doc(db, "alunos", aluno.id), { senha: novaSenha });
    mensagem.textContent = "Senha alterada com sucesso!";
    setTimeout(() => fecharPopup(), 2000);
  } catch (e) {
    mensagem.textContent = "Erro ao alterar senha.";
  }
};

/* ========================================================
    10. FOTO / MODO PROFESSOR
   ======================================================== */
window.enviarNovaFoto = () => {
  alert("Upload de foto ainda não implementado.");
};

window.acessarModoProfessor = () => {
  window.location.href = "professor.html";
};

window.abrirConfiguracoes = () => {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");
  if (nomeAluno) {
    window.location.href = `configuracoes.html?nome=${encodeURIComponent(nomeAluno)}`;
  }
};

document.addEventListener("DOMContentLoaded", iniciarPainelAluno);
