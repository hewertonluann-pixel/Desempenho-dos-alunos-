// aluno3.js
// ==========================================
// PAINEL DO ALUNO — Sistema Unificado (com alternância de ano)
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
import { carregarHistoricoProgressoAluno } from "./evolucao.js";
import { carregarNotificacoes } from "./notificacoes.js";

// Variável global para armazenar o ano atual de visualização
let anoVisualizacao = new Date().getFullYear();

// Array de nomes de meses
const mesesNomes = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

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

// Função para atualizar as legendas de comprometimento dinamicamente
function atualizarLegendasComprometimento() {
  const agora = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const dataAtual = new Date(agora);
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = dataAtual.getMonth(); // 0-11

  const legendaGeral = document.getElementById("legendaGeral");
  const legendaMensal = document.getElementById("legendaMensal");

  if (legendaGeral) {
    legendaGeral.textContent = `Geral [${anoAtual}]`;
  }

  if (legendaMensal) {
    legendaMensal.textContent = `Mensal [${mesesNomes[mesAtual]}]`;
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
  const nomeMetodoLeitura = aluno.solfejoNome || "Bona";
  const nomeMetodoInstrumental = aluno.metodoNome || "-";
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

  // Atualizar legendas ao atualizar os valores
  atualizarLegendasComprometimento();
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
  
  // Atualizar legendas após montar o gráfico
  atualizarLegendasComprometimento();
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

  // Buscar conquistas de frequência do mês (alinhado com painel de conquistas)
  const conquistasFrequencia = [];
  
  // Frequência 100% - desbloqueia DUAS conquistas
  if (info.percentual >= 100) {
    conquistasFrequencia.push({
      icone: '🏅',
      titulo: 'Presença Perfeita',
      descricao: 'Concedida a quem comparece a 100% dos ensaios do mês.'
    });
    conquistasFrequencia.push({
      icone: '🎯',
      titulo: 'Músico Esforçado',
      descricao: 'Obtida com frequência mensal acima de 80%.'
    });
  }
  // Frequência entre 80% e 99% - apenas Músico Esforçado
  else if (info.percentual >= 80) {
    conquistasFrequencia.push({
      icone: '🎯',
      titulo: 'Músico Esforçado',
      descricao: 'Obtida com frequência mensal acima de 80%.'
    });
  }
  // Abaixo de 80% - nenhuma conquista

  const conquistasHTML = conquistasFrequencia.length > 0 
    ? `
      <div class="modal-conquistas-section">
        <h4>🏆 Conquistas do Mês</h4>
        <div class="conquistas-mes-list">
          ${conquistasFrequencia.map(c => `
            <div class="conquista-mes-card">
              <div class="conquista-mes-icon">${c.icone}</div>
              <div class="conquista-mes-info">
                <div class="conquista-mes-titulo">${c.titulo}</div>
                <div class="conquista-mes-descricao">${c.descricao}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  destino.querySelector(".modal-content .modal-body").innerHTML = `
    <h2 class="modal-title">📅 Frequência de ${meses[info.mes]}</h2>
    
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
  const snap = await getDocs(collection(db, "eventos"));
  const todosEventos = snap.docs.map(d => d.data());
  
  // Obter ano e mês atual no fuso de Brasília
  const agora = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const dataAtual = new Date(agora);
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, "0");

  // Calcular frequência mensal
  const grupos = agruparEventosPorMes(todosEventos);
  const chaveMes = `${anoAtual}-${mesAtual}`;
  const eventosMes = grupos[chaveMes] || [];
  const freqMensal = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);
  const energiaMensal = freqMensal.percentual;

  // Calcular frequência anual (todos os meses do ano)
  let totalPresencasAno = 0;
  let totalEventosAno = 0;
  
  Object.keys(grupos).forEach(chave => {
    // Verificar se a chave pertence ao ano atual (formato: "YYYY-MM")
    if (chave.startsWith(String(anoAtual))) {
      const eventosDoMes = grupos[chave];
      eventosDoMes.forEach(evento => {
        totalEventosAno++;
        // Usar a mesma lógica da barra mensal (presencas é array de objetos)
        const hit = evento.presencas.find(p => p.nome === aluno.nome);
        if (hit && hit.presenca === "presente") {
          totalPresencasAno++;
        }
      });
    }
  });
  
  const energiaAnual = totalEventosAno > 0 
    ? Math.round((totalPresencasAno / totalEventosAno) * 100) 
    : 0;



  atualizarEnergiaVisual(energiaMensal, energiaAnual);

  return energiaMensal;
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

  // Ocultar botão "Baixar App" se não for o dono da página
  if (!ehDonoDaPagina) {
    const btnBaixarApp = document.querySelector(".btn-download-app");
    if (btnBaixarApp) btnBaixarApp.style.display = "none";
  }

  // =====================================================
  // 👁️ APLICAR PREFERÊNCIAS DE VISIBILIDADE
  // =====================================================
  const preferencias = aluno.preferencias || {
    comprometimento: true,
    frequencia: true,
    conquistas: true,
    evolucao: true,
    notificacoes: true,
    licoes: true
  };

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

    // Aplicar visibilidade baseada nas preferências
    Object.keys(mapaPaineis).forEach(id => {
      const painel = mapaPaineis[id];
      if (painel) {
        // Regra especial para lições: só visível se for dono da página E estiver habilitado
        if (id === "licoes") {
          if (!ehDonoDaPagina || preferencias[id] === false) {
            painel.style.display = "none";
            console.log(`❌ Painel "${id}" ocultado (permissão: ${ehDonoDaPagina}, preferência: ${preferencias[id]})`);
          } else {
            painel.style.display = "";
            console.log(`✅ Painel "${id}" visível`);
          }
        }
        // Demais painéis: apenas verificar preferência
        else {
          if (preferencias[id] === false) {
            painel.style.display = "none";
            console.log(`❌ Painel "${id}" ocultado (preferência desabilitada)`);
          } else {
            painel.style.display = "";
            console.log(`✅ Painel "${id}" visível`);
          }
        }
      }
    });
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

  if (contentArea) {
    const mapaPaineis = {
      comprometimento: contentArea.querySelector(".energy-section"),
      notificacoes: contentArea.querySelector(".notifications-section"),
      frequencia: contentArea.querySelector(".frequency-section"),
      conquistas: contentArea.querySelector(".achievements-section"),
      licoes: contentArea.querySelector(".lessons-section"),
      evolucao: contentArea.querySelector(".evolucao-section")
    };

    // Reordenar os painéis conforme a ordem salva (apenas os visíveis)
    ordemPaineis.forEach(id => {
      const painel = mapaPaineis[id];
      if (painel && painel.style.display !== "none") {
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
  
  // Atualizar legendas após carregar tudo
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
window.enviarNovaFoto = async () => {
  const input = document.getElementById("novaFoto");
  const file = input?.files[0];
  
  if (!file) {
    console.log("⚠️ Nenhum arquivo selecionado");
    return;
  }
  
  // Obter o nome do aluno logado
  let usuario;
  try {
    usuario = JSON.parse(localStorage.getItem("usuarioAtual"));
  } catch {
    usuario = null;
  }
  
  if (!usuario || !usuario.nome) {
    alert("Sessão inválida. Faça login novamente.");
    return;
  }
  
  try {
    // Converter imagem para base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Buscar o documento do aluno
        const q = query(collection(db, "alunos"), where("nome", "==", usuario.nome));
        const snap = await getDocs(q);
        
        if (snap.empty) {
          alert("Aluno não encontrado.");
          return;
        }
        
        const alunoId = snap.docs[0].id;
        
        // Atualizar a foto no Firestore
        await updateDoc(doc(db, "alunos", alunoId), {
          foto: e.target.result
        });
        
        // Atualizar a foto na interface
        const fotoImg = document.getElementById("fotoAluno");
        if (fotoImg) fotoImg.src = e.target.result;
        
        console.log("✅ Foto atualizada com sucesso!");
        
        // Feedback visual temporário
        const label = document.querySelector('label[for="novaFoto"]');
        if (label) {
          const originalHTML = label.innerHTML;
          label.innerHTML = '<span style="color:#22d3ee;font-size:1.2rem;">✓</span>';
          setTimeout(() => {
            label.innerHTML = originalHTML;
          }, 2000);
        }
      } catch (erro) {
        console.error("❌ Erro ao atualizar foto:", erro);
        alert("Erro ao atualizar foto. Tente novamente.");
      }
    };
    
    reader.onerror = () => {
      alert("Erro ao ler o arquivo de imagem.");
    };
    
    reader.readAsDataURL(file);
  } catch (erro) {
    console.error("❌ Erro ao processar foto:", erro);
    alert("Erro ao processar foto. Tente novamente.");
  }
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
