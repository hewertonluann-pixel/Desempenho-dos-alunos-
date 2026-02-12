// aluno3.js
// ==========================================
// PAINEL DO ALUNO — Sistema Unificado (com alternância de ano)
// ==========================================

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  obterEventosDoAno,
  agruparEventosPorMes,
  calcularFrequenciaMensalParaAluno,
  gerarPainelFrequencia
} from "./frequencia.js";

import { carregarLicoesAluno } from "./licoes.js";
import { gerarPainelConquistas, abrirPopupConquista, fecharPopupConquista } from "./conquistas.js";
import { carregarHistoricoProgressoAluno } from "./evolucao.js";
import { carregarNotificacoes } from "./notificacoes.js";

// Variável global para armazenar o ano atual de visualização
let anoVisualizacao = new Date().getFullYear();

// Array de versículos bíblicos para alternância
const versiculos = [
  { texto: "Tudo que tem fôlego louve ao Senhor. Aleluia!", referencia: "Salmo 150:6" },
  { texto: "Cantai ao Senhor um cântico novo, porque ele tem feito maravilhas.", referencia: "Salmo 98:1" },
  { texto: "Louvai ao Senhor com harpa; cantai a ele com saltério de dez cordas.", referencia: "Salmo 33:2" },
  { texto: "Servi ao Senhor com alegria; e entrai diante dele com canto.", referencia: "Salmo 100:2" },
  { texto: "Cantarei ao Senhor enquanto eu viver; cantarei louvores ao meu Deus enquanto eu existir.", referencia: "Salmo 104:33" },
  { texto: "Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.", referencia: "Filipenses 4:4" },
  { texto: "Falando entre vós em salmos, e hinos, e cânticos espirituais; cantando e salmodiando ao Senhor no vosso coração.", referencia: "Efésios 5:19" },
  { texto: "Seja o Senhor engrandecido, que ama a prosperidade do seu servo.", referencia: "Salmo 35:27" }
];

// Função para exibir versículo aleatório
function exibirVersiculoAleatorio() {
  const indiceAleatorio = Math.floor(Math.random() * versiculos.length);
  const versiculoSelecionado = versiculos[indiceAleatorio];
  
  const quoteElement = document.querySelector('.quote');
  const referenceElement = document.querySelector('.reference');
  
  if (quoteElement && referenceElement) {
    quoteElement.textContent = `"${versiculoSelecionado.texto}"`;
    referenceElement.textContent = versiculoSelecionado.referencia;
  }
}

/* ========================================================
    1. OBTER ALUNO LOGADO (pela URL)
   ======================================================== */

window.abrirPopupConquista = abrirPopupConquista;
window.fecharPopupConquista = fecharPopupConquista;
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
  
  // Preencher nomes dos métodos
  const nomeMetodoLeitura = aluno.metodoLeitura || "-";
  const nomeMetodoInstrumental = aluno.metodoInstrumental || "-";
  document.getElementById("nomeMetodoLeitura").textContent = nomeMetodoLeitura;
  document.getElementById("nomeMetodoInstrumental").textContent = nomeMetodoInstrumental;

  if (aluno.classificado === true) {
    document.getElementById("modoProfessorBtn").style.display = "block";
  }
}

/* ========================================================
    3. ATUALIZAR ENERGIA BARRA (DUAS BARRAS)
   ======================================================== */
export function atualizarEnergiaVisual(valorMensal, valorGeral = 100) {
  const barraMensal = document.getElementById("barraEnergiaMensal");
  const numeroMensal = document.getElementById("valorEnergiaMensal");
  const barraGeral = document.getElementById("barraEnergiaGeral");
  const numeroGeral = document.getElementById("valorEnergiaGeral");

  if (barraMensal && numeroMensal) {
    barraMensal.style.width = valorMensal + "%";
    numeroMensal.textContent = valorMensal + "%";
  }

  if (barraGeral && numeroGeral) {
    barraGeral.style.width = valorGeral + "%";
    numeroGeral.textContent = valorGeral + "%";
  }
}

/* ========================================================
    4. GRÁFICO FREQUÊNCIA ANUAL (COM ALTERNÂNCIA DE ANO)
   ======================================================== */
export async function montarGraficoFrequencia(aluno, ano) {
  const destino = document.getElementById("gradeFrequencia");
  const destinoPopup = document.getElementById("popupFrequencia");
  const anoTexto = document.getElementById("anoAtualTexto");

  if (!destino || !anoTexto) return;

  anoTexto.textContent = ano; // Atualiza o ano exibido

  await gerarPainelFrequencia(
    aluno,
    ano,
    destino,
    dadosPopup => abrirPopupFrequencia(dadosPopup, destinoPopup)
  );
}

// Função global para mudar o ano
window.mudarAno = async (delta) => {
  anoVisualizacao += delta;
  const aluno = await carregarAlunoAtual();
  if (aluno) {
    await montarGraficoFrequencia(aluno, anoVisualizacao);
  }
};

/* POPUP FREQUÊNCIA */
export function abrirPopupFrequencia(info, destino) {
  if (!destino) return;

  const meses = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"
  };

  // Buscar conquistas de frequência do mês
  const conquistasFrequencia = [];
  if (info.percentual >= 100) {
    conquistasFrequencia.push({
      icone: '⭐',
      titulo: 'Presença Perfeita',
      raridade: 'ouro'
    });
  }
  if (info.percentual >= 80 && info.percentual < 100) {
    conquistasFrequencia.push({
      icone: '🎯',
      titulo: 'Músico Esforçado',
      raridade: 'prata'
    });
  }

  const conquistasHTML = conquistasFrequencia.length > 0 
    ? `
      <div class="modal-conquistas-section">
        <h4>🏆 Conquistas do Mês</h4>
        <div class="modal-conquistas-list">
          ${conquistasFrequencia.map(c => `
            <div class="mini-achievement ${c.raridade}">
              <span class="mini-achievement-icon">${c.icone}</span>
              <span class="mini-achievement-name">${c.titulo}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  destino.querySelector(".modal-content .modal-body").innerHTML = `
    <div class="modal-header-icon">📅</div>
    <h2 class="modal-title">Frequência de ${meses[info.mes]}</h2>
    
    <div class="modal-stats-grid">
      <div class="stat-box">
        <div class="stat-label">Chamadas</div>
        <div class="stat-value">${info.totalEventos}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Presenças</div>
        <div class="stat-value stat-success">${info.presencasAluno}</div>
      </div>
      <div class="stat-box stat-highlight">
        <div class="stat-label">Frequência</div>
        <div class="stat-value stat-primary">${info.percentual}%</div>
      </div>
    </div>
    
    ${conquistasHTML}
    
    <button onclick="fecharPopupFrequencia()" class="btn-fechar-modal">Fechar</button>
  `;

  destino.style.display = "flex";
}

window.fecharPopupFrequencia = () => {
  document.getElementById("popupFrequencia").style.display = "none";
};

/* ========================================================
    5. CONQUISTAS (MODAL PADRONIZADO)
   ======================================================== */
window.abrirPopupConquista = function(icone, titulo, descricao, detalhes, raridade = 'bronze') {
  const popup = document.getElementById('popupConquista');
  if (!popup) return;

  // Mapear cores de borda por raridade
  const coresBorda = {
    'ouro': '#fbbf24',
    'prata': '#94a3b8',
    'bronze': '#cd7f32'
  };

  // Detectar se está bloqueada pelo ícone
  const bloqueada = icone === '🔒';

  const modalBody = popup.querySelector('.modal-content .modal-body');
  modalBody.innerHTML = `
    <div class="modal-header-icon">${icone || '🏆'}</div>
    <h2 class="modal-title">${titulo || 'Conquista'}</h2>
    
    <div class="modal-stats-grid">
      <div class="stat-box" style="border-color: ${coresBorda[raridade]}; box-shadow: 0 0 15px ${coresBorda[raridade]}40;">
        <div class="stat-label">Raridade</div>
        <div class="stat-value" style="color: ${coresBorda[raridade]};">${raridade.toUpperCase()}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Status</div>
        <div class="stat-value ${bloqueada ? '' : 'stat-success'}">${bloqueada ? '🔒 BLOQUEADA' : '✅ DESBLOQUEADA'}</div>
      </div>
    </div>
    
    <div class="modal-conquistas-section">
      <h4>📝 Descrição</h4>
      <p style="color: var(--ink); font-size: 0.9rem; line-height: 1.6;">${descricao || 'Descrição não disponível.'}</p>
    </div>
    
    ${detalhes && detalhes.length > 0 ? `
      <div class="modal-conquistas-section">
        <h4>✨ Detalhes</h4>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${detalhes.map(item => `<li style="padding: 8px 12px; background: var(--card-alt); border-radius: 8px; margin-bottom: 8px; font-size: 0.9rem; color: var(--muted); border-left: 3px solid var(--azul);">${item}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    
    <button onclick="fecharPopupConquista()" class="btn-fechar-modal">Fechar</button>
  `;

  popup.style.display = 'flex';
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
    6. CALCULAR ENERGIA (Frequência do mês)
   ======================================================== */
export async function calcularEnergiaDoAluno(aluno) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");

  const snap = await getDocs(collection(db, "eventos"));
  const eventosAno = snap.docs.map(d => d.data());

  const grupos = agruparEventosPorMes(eventosAno);
  const chaveMes = `${ano}-${mes}`;
  const eventosMes = grupos[chaveMes] || [];

  const freq = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);
  const energia = freq.percentual;

  atualizarEnergiaVisual(energia);

  return energia;
}

/* ========================================================
    7. INICIALIZAÇÃO FINAL
   ======================================================== */
export async function iniciarPainelAluno() {
  const aluno = await carregarAlunoAtual();
  if (!aluno) return;

  // =====================================================
  // 🔥 CONTROLE DE PERMISSÃO (mostrar / esconder funções)
  // =====================================================
  const usuario = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  const ehDonoDaPagina = usuario.nome && usuario.nome === aluno.nome;

  // Ocultar botão de alterar senha
  if (!ehDonoDaPagina) {
    const btnSenha = document.querySelector(".btn-change-password");
    if (btnSenha) btnSenha.style.display = "none";
  }

  // Ocultar edição de foto
  if (!ehDonoDaPagina) {
    const labelFoto = document.querySelector('label[for="novaFoto"]');
    const inputFoto = document.getElementById("novaFoto");
    if (labelFoto) labelFoto.style.display = "none";
    if (inputFoto) inputFoto.style.display = "none";
  }

  // 🔥 Ocultar painel de lições inteiramente
  if (!ehDonoDaPagina) {
    const painelLicoes = document.querySelector(".lessons-section");
    if (painelLicoes) painelLicoes.style.display = "none";
  }

  // =====================================================
  // 🔄 REORDENAR PAINÉIS CONFORME PREFERÊNCIA
  // =====================================================
  const ordemPaineis = aluno.ordemPaineis || [
    "comprometimento",
    "notificacoes",
    "frequencia",
    "conquistas",
    "licoes",
    "evolucao"
  ];

  const contentArea = document.querySelector(".content-area");
  if (contentArea) {
    const mapaPaineis = {
      comprometimento: contentArea.querySelector(".energy-section"),
      notificacoes: contentArea.querySelector(".notifications-section"),
      frequencia: contentArea.querySelector(".frequency-section"),
      conquistas: contentArea.querySelector(".achievements-section"),
      licoes: contentArea.querySelector(".lessons-section"),
      evolucao: contentArea.querySelector(".evolucao-section")
    };

    // Reordenar os painéis conforme a ordem salva
    ordemPaineis.forEach(id => {
      const painel = mapaPaineis[id];
      if (painel) {
        contentArea.appendChild(painel);
      }
    });
  }

  // =====================================================

  montarPainelAluno(aluno);
  
  // Carregar notificações em tempo real
  carregarNotificacoes();
  
  await montarGraficoFrequencia(aluno, anoVisualizacao); // Passa o ano de visualização

  const energia = await calcularEnergiaDoAluno(aluno);

  // Histórico real
  const historico = await carregarHistoricoProgressoAluno(aluno);

  // Gráfico histórico
  const destinoGrafico = document.getElementById("painelEvolucao");
  if (window.gerarGraficoEvolucao) {
    gerarGraficoEvolucao(aluno, energia, destinoGrafico, historico);
  }

  gerarPainelConquistas(aluno, document.getElementById("grade-conquistas"));

  // Carregar lições (SOMENTE se dono da página)
  if (ehDonoDaPagina) {
    await carregarLicoesAluno(aluno.nome);
  }
}

/* ========================================================
    8. POPUP SENHA
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
    9. FOTO / MODO PROFESSOR
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

document.addEventListener("DOMContentLoaded", () => {
  exibirVersiculoAleatorio();
  iniciarPainelAluno();
});
