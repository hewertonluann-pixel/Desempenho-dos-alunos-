// aluno3.js
// ==========================================
// PAINEL DO ALUNO — Sistema Unificado
// Integrado com sistema de snapshots mensais
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
import { gerarPainelConquistas, abrirPopupConquista, fecharPopupConquista } from "./conquistas.js";
import { carregarNotificacoes } from "./notificacoes.js";

// 📸 Novo sistema de snapshots mensais
import {
  garantirSnapshotDoMes,
  carregarSnapshotsAluno
} from "./snapshots-mensais.js";

let anoVisualizacao = new Date().getFullYear();

const mesesNomes = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const versiculos = [
  { texto: "Tudo que tem fôlego louve ao Senhor. Aleluia!", referencia: "Salmo 150:6" },
  { texto: "Cantai ao Senhor um cântico novo, porque ele tem feito maravilhas.", referencia: "Salmo 98:1" },
  { texto: "Louvai ao Senhor com harpa; cantai a ele com saltério de dez cordas.", referencia: "Salmo 33:2" },
  { texto: "Servi ao Senhor com alegria; e entrai diante dele com canto.", referencia: "Salmo 100:2" },
  { texto: "Cantarei ao Senhor enquanto eu viver; cantarei louvores ao meu Deus enquanto eu existir.", referencia: "Salmo 104:33" },
  { texto: "Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.", referencia: "Filipenses 4:4" },
  { texto: "Falando entre vós em salmos, e hinos, e cânticos espirituais.", referencia: "Efésios 5:19" },
  { texto: "Seja o Senhor engrandecido, que ama a prosperidade do seu servo.", referencia: "Salmo 35:27" }
];

function exibirVersiculoAleatorio() {
  const v = versiculos[Math.floor(Math.random() * versiculos.length)];
  const q = document.querySelector('.quote');
  const r = document.querySelector('.reference');
  if (q) q.textContent = `"${v.texto}"`;
  if (r) r.textContent = v.referencia;
}

function atualizarLegendasComprometimento() {
  const agora    = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const anoAtual = agora.getFullYear();
  const mesAtual = agora.getMonth();
  const lG = document.getElementById("legendaGeral");
  const lM = document.getElementById("legendaMensal");
  if (lG) lG.textContent = `Geral [${anoAtual}]`;
  if (lM) lM.textContent = `Mensal [${mesesNomes[mesAtual]}]`;
}

/* ========================================================
    1. OBTER ALUNO LOGADO
   ======================================================== */
window.abrirPopupConquista  = abrirPopupConquista;
window.fecharPopupConquista = fecharPopupConquista;

export async function carregarAlunoAtual() {
  const params    = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");
  if (!nomeAluno) { window.location.href = "index.html"; return null; }

  const snap = await getDocs(collection(db, "alunos"));
  let alunoEncontrado = null;
  snap.forEach(d => {
    if (d.data().nome === nomeAluno) alunoEncontrado = { id: d.id, ...d.data() };
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
  document.getElementById("nomeAluno").textContent       = aluno.nome;
  document.getElementById("instrumentoAluno").textContent = aluno.instrumento || "Não definido";

  const fotoImg = document.getElementById("fotoAluno");
  if (fotoImg) fotoImg.src = aluno.foto || "https://via.placeholder.com/150";

  const leitura = aluno.leitura ?? 0;
  const metodo  = aluno.metodo  ?? 0;

  document.getElementById("nivelLeitura").textContent = leitura;
  document.getElementById("nivelMetodo").textContent  = metodo;
  document.getElementById("nivelGeral").textContent   = leitura + metodo;

  document.getElementById("nomeMetodoLeitura").textContent      = aluno.solfejoNome  || "Bona";
  document.getElementById("nomeMetodoInstrumental").textContent = aluno.metodoNome   || "-";

  if (aluno.classificado === true)
    document.getElementById("modoProfessorBtn").style.display = "block";
}

/* ========================================================
    3. BARRAS DE ENERGIA
   ======================================================== */
export function atualizarEnergiaVisual(valorMensal, valorGeral = 100) {
  const bM = document.getElementById("barraEnergiaMensal");
  const nM = document.getElementById("valorEnergiaMensal");
  const bG = document.getElementById("barraEnergiaGeral");
  const nG = document.getElementById("valorEnergiaGeral");
  if (bM && nM) { bM.style.width = valorMensal + "%"; nM.textContent = valorMensal + "%"; }
  if (bG && nG) { bG.style.width = valorGeral  + "%"; nG.textContent = valorGeral  + "%"; }
  atualizarLegendasComprometimento();
}

/* ========================================================
    4. GRÁFICO FREQUÊNCIA ANUAL
   ======================================================== */
export async function montarGraficoFrequencia(aluno, ano) {
  const destino     = document.getElementById("gradeFrequencia");
  const destinoPopup= document.getElementById("popupFrequencia");
  const anoTexto    = document.getElementById("anoAtualTexto");
  if (!destino || !anoTexto) return;
  anoTexto.textContent = ano;

  // Passa o turmaId do aluno para filtrar apenas os eventos da sua turma
  const turmaId = aluno.turmaId || null;

  await gerarPainelFrequencia(
    aluno, ano, destino,
    dadosPopup => abrirPopupFrequencia(dadosPopup, destinoPopup),
    turmaId
  );
  atualizarLegendasComprometimento();
}

window.mudarAno = async (delta) => {
  anoVisualizacao += delta;
  const aluno = await carregarAlunoAtual();
  if (aluno) await montarGraficoFrequencia(aluno, anoVisualizacao);
};

/* POPUP FREQUÊNCIA */
export function abrirPopupFrequencia(info, destino) {
  if (!destino) return;
  const meses = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"
  };
  const conquistasFrequencia = [];
  if (info.percentual >= 100) {
    conquistasFrequencia.push({ icone: '🎖️', titulo: 'Presença Perfeita', descricao: 'Comparece a 100% dos ensaios.' });
    conquistasFrequencia.push({ icone: '🎯', titulo: 'Músico Esforçado', descricao: 'Frequência mensal acima de 80%.' });
  } else if (info.percentual >= 80) {
    conquistasFrequencia.push({ icone: '🎯', titulo: 'Músico Esforçado', descricao: 'Frequência mensal acima de 80%.' });
  }
  const conquistasHTML = conquistasFrequencia.length
    ? `<div class="modal-conquistas-section"><h4>🏆 Conquistas do Mês</h4><div class="conquistas-mes-list">${conquistasFrequencia.map(c => `<div class="conquista-mes-card"><div class="conquista-mes-icon">${c.icone}</div><div class="conquista-mes-info"><div class="conquista-mes-titulo">${c.titulo}</div><div class="conquista-mes-descricao">${c.descricao}</div></div></div>`).join('')}</div></div>`
    : '';
  destino.querySelector(".modal-content .modal-body").innerHTML = `
    <h2 class="modal-title">📅 Frequência de ${meses[info.mes]}</h2>
    <div class="modal-stats-grid">
      <div class="stat-box"><div class="stat-label">Chamadas</div><div class="stat-value">${info.totalEventos}</div></div>
      <div class="stat-box"><div class="stat-label">Presenças</div><div class="stat-value stat-success">${info.presencasAluno}</div></div>
      <div class="stat-box stat-highlight"><div class="stat-label">Frequência</div><div class="stat-value stat-primary">${info.percentual}%</div></div>
    </div>
    ${conquistasHTML}
    <button onclick="fecharPopupFrequencia()" class="btn-fechar-modal">Fechar</button>`;
  destino.style.display = "flex";
}

window.fecharPopupFrequencia = () => {
  document.getElementById("popupFrequencia").style.display = "none";
};

/* ========================================================
    5. CONQUISTAS
   ======================================================== */
window.abrirPopupConquista = function(icone, titulo, descricao, detalhes, raridade = 'bronze') {
  const popup = document.getElementById('popupConquista');
  if (!popup) return;
  const cores = { ouro: '#fbbf24', prata: '#94a3b8', bronze: '#cd7f32' };
  const bloqueada = icone === '🔒';
  popup.querySelector('.modal-content .modal-body').innerHTML = `
    <div class="modal-header-icon">${icone || '🏆'}</div>
    <h2 class="modal-title">${titulo || 'Conquista'}</h2>
    <div class="modal-stats-grid">
      <div class="stat-box" style="border-color:${cores[raridade]};box-shadow:0 0 15px ${cores[raridade]}40;">
        <div class="stat-label">Raridade</div>
        <div class="stat-value" style="color:${cores[raridade]};">${raridade.toUpperCase()}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Status</div>
        <div class="stat-value ${bloqueada ? '' : 'stat-success'}">${bloqueada ? '🔒 BLOQUEADA' : '✅ DESBLOQUEADA'}</div>
      </div>
    </div>
    <div class="modal-conquistas-section">
      <h4>📝 Descrição</h4>
      <p style="color:var(--ink);font-size:0.9rem;line-height:1.6;">${descricao || 'Descrição não disponível.'}</p>
    </div>
    ${detalhes?.length ? `<div class="modal-conquistas-section"><h4>✨ Detalhes</h4><ul style="list-style:none;padding:0;margin:0;">${detalhes.map(d => `<li style="padding:8px 12px;background:var(--card-alt);border-radius:8px;margin-bottom:8px;font-size:0.9rem;color:var(--muted);border-left:3px solid var(--azul);">${d}</li>`).join('')}</ul></div>` : ''}
    <button onclick="fecharPopupConquista()" class="btn-fechar-modal">Fechar</button>`;
  popup.style.display = 'flex';
};

window.fecharPopupConquista = function() {
  const popup = document.getElementById('popupConquista');
  if (popup) popup.style.display = 'none';
};

/* ========================================================
    6. CALCULAR ENERGIA (filtrada por turma do aluno)
   ======================================================== */
export async function calcularEnergiaDoAluno(aluno) {
  const turmaId = aluno.turmaId || null;

  const agora     = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const anoAtual  = agora.getFullYear();
  const mesAtual  = String(agora.getMonth() + 1).padStart(2, "0");

  // Busca apenas os eventos da turma do aluno
  const todosEventos = await obterEventosDoAno(anoAtual, turmaId);

  const grupos     = agruparEventosPorMes(todosEventos);
  const chaveMes   = `${anoAtual}-${mesAtual}`;
  const eventosMes = grupos[chaveMes] || [];
  const freqMensal = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);
  const energiaMensal = freqMensal.percentual;

  let totalPresencasAno = 0, totalEventosAno = 0;
  Object.keys(grupos).forEach(chave => {
    if (!chave.startsWith(String(anoAtual))) return;
    grupos[chave].forEach(ev => {
      totalEventosAno++;
      const hit = ev.presencas.find(p => p.nome === aluno.nome);
      if (hit && hit.presenca === "presente") totalPresencasAno++;
    });
  });
  const energiaAnual = totalEventosAno > 0
    ? Math.round((totalPresencasAno / totalEventosAno) * 100) : 0;

  atualizarEnergiaVisual(energiaMensal, energiaAnual);
  return energiaMensal;
}

/* ========================================================
    7. INICIALIZAÇÃO FINAL
   ======================================================== */
export async function iniciarPainelAluno() {
  const aluno = await carregarAlunoAtual();
  if (!aluno) return;

  const usuario       = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  const ehDonoDaPagina= usuario.nome && usuario.nome === aluno.nome;

  // Ocultar elementos se não for o dono
  if (!ehDonoDaPagina) {
    const btnSenha  = document.querySelector(".btn-change-password");
    const labelFoto = document.querySelector('label[for="novaFoto"]');
    const inputFoto = document.getElementById("novaFoto");
    const btnApp    = document.querySelector(".btn-download-app");
    if (btnSenha)  btnSenha.style.display  = "none";
    if (labelFoto) labelFoto.style.display = "none";
    if (inputFoto) inputFoto.style.display = "none";
    if (btnApp)    btnApp.style.display    = "none";
  }

  // Preferências de visibilidade
  const preferencias = aluno.preferencias || {
    comprometimento: true, frequencia: true, conquistas: true,
    evolucao: true, notificacoes: true, licoes: true
  };

  const contentArea = document.querySelector(".content-area");
  if (contentArea) {
    const mapa = {
      comprometimento: contentArea.querySelector(".energy-section"),
      notificacoes:    contentArea.querySelector(".notifications-section"),
      frequencia:      contentArea.querySelector(".frequency-section"),
      conquistas:      contentArea.querySelector(".achievements-section"),
      licoes:          contentArea.querySelector(".lessons-section"),
      evolucao:        contentArea.querySelector(".evolucao-section")
    };
    Object.keys(mapa).forEach(id => {
      const painel = mapa[id];
      if (!painel) return;
      const visivel = id === "licoes"
        ? ehDonoDaPagina && preferencias[id] !== false
        : preferencias[id] !== false;
      painel.style.display = visivel ? "" : "none";
    });

    // Reordenar paineis
    const ordem = aluno.ordemPaineis || [
      "comprometimento","notificacoes","frequencia","conquistas","licoes","evolucao"
    ];
    const mapa2 = {
      comprometimento: contentArea.querySelector(".energy-section"),
      notificacoes:    contentArea.querySelector(".notifications-section"),
      frequencia:      contentArea.querySelector(".frequency-section"),
      conquistas:      contentArea.querySelector(".achievements-section"),
      licoes:          contentArea.querySelector(".lessons-section"),
      evolucao:        contentArea.querySelector(".evolucao-section")
    };
    ordem.forEach(id => {
      const p = mapa2[id];
      if (p && p.style.display !== "none") contentArea.appendChild(p);
    });
  }

  montarPainelAluno(aluno);
  carregarNotificacoes();
  await montarGraficoFrequencia(aluno, anoVisualizacao);
  const energia = await calcularEnergiaDoAluno(aluno);

  // 📸 Garantir snapshot do mês atual (cria automaticamente se não existir)
  await garantirSnapshotDoMes(aluno);

  // 📊 Carregar todos os snapshots para o gráfico
  const snapshots = await carregarSnapshotsAluno(aluno);

  const destinoGrafico = document.getElementById("painelEvolucao");
  if (window.gerarGraficoEvolucao) {
    gerarGraficoEvolucao(aluno, energia, destinoGrafico, snapshots);
  }

  gerarPainelConquistas(aluno, document.getElementById("grade-conquistas"));

  if (ehDonoDaPagina) await carregarLicoesAluno(aluno.nome);

  atualizarLegendasComprometimento();
}

/* ========================================================
    8. POPUP SENHA
   ======================================================== */
window.abrirPopup = () => {
  document.getElementById("popupSenha").style.display = "flex";
  document.getElementById("mensagemSenha").textContent = "";
  document.getElementById("novaSenha").value = "";
};
window.fecharPopup = () => { document.getElementById("popupSenha").style.display = "none"; };
window.salvarSenha = async () => {
  const novaSenha = document.getElementById("novaSenha").value;
  const mensagem  = document.getElementById("mensagemSenha");
  const aluno     = await carregarAlunoAtual();
  if (novaSenha.length < 6) { mensagem.textContent = "A senha deve ter pelo menos 6 caracteres."; return; }
  try {
    await updateDoc(doc(db, "alunos", aluno.id), { senha: novaSenha });
    mensagem.textContent = "Senha alterada com sucesso!";
    setTimeout(() => fecharPopup(), 2000);
  } catch { mensagem.textContent = "Erro ao alterar senha."; }
};

/* ========================================================
    9. FOTO / MODO PROFESSOR
   ======================================================== */
window.enviarNovaFoto = async () => {
  const input = document.getElementById("novaFoto");
  const file  = input?.files[0];
  if (!file) return;
  let usuario;
  try { usuario = JSON.parse(localStorage.getItem("usuarioAtual")); } catch { usuario = null; }
  if (!usuario?.nome) { alert("Sessão inválida. Faça login novamente."); return; }
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const q    = query(collection(db, "alunos"), where("nome", "==", usuario.nome));
      const snap = await getDocs(q);
      if (snap.empty) { alert("Aluno não encontrado."); return; }
      await updateDoc(doc(db, "alunos", snap.docs[0].id), { foto: e.target.result });
      const fotoImg = document.getElementById("fotoAluno");
      if (fotoImg) fotoImg.src = e.target.result;
      const label = document.querySelector('label[for="novaFoto"]');
      if (label) {
        const orig = label.innerHTML;
        label.innerHTML = '<span style="color:#22d3ee;font-size:1.2rem;">✓</span>';
        setTimeout(() => { label.innerHTML = orig; }, 2000);
      }
    } catch { alert("Erro ao atualizar foto. Tente novamente."); }
  };
  reader.readAsDataURL(file);
};

window.acessarModoProfessor = () => { window.location.href = "professor.html"; };
window.abrirConfiguracoes   = () => {
  const params    = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");
  if (nomeAluno) window.location.href = `configuracoes.html?nome=${encodeURIComponent(nomeAluno)}`;
};

document.addEventListener("DOMContentLoaded", () => {
  exibirVersiculoAleatorio();
  iniciarPainelAluno();
});
