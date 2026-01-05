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

// Variável global para armazenar o ano atual de visualização
let anoVisualizacao = new Date().getFullYear();

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

  if (aluno.classificado === true) {
    document.getElementById("modoProfessorBtn").style.display = "block";
  }
}

/* ========================================================
    3. ATUALIZAR ENERGIA BARRA
   ======================================================== */
export function atualizarEnergiaVisual(valor) {
  const barra = document.getElementById("barraEnergia");
  const numero = document.getElementById("valorEnergia");

  if (!barra || !numero) return;

  barra.style.width = valor + "%";
  numero.textContent = valor + "%";

  if (valor >= 80) barra.style.backgroundColor = "var(--verde)";
  else if (valor >= 40) barra.style.backgroundColor = "var(--amarelo)";
  else barra.style.backgroundColor = "var(--vermelho)";
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

  destino.querySelector(".popup-content").innerHTML = `
    <h3>Frequência de ${meses[info.mes]}</h3>
    <p>Chamadas no mês: <strong>${info.totalEventos}</strong></p>
    <p>Presente em: <strong>${info.presencasAluno}</strong></p>
    <p>Frequência: <strong>${info.percentual}%</strong></p>
    <button onclick="fecharPopupFrequencia()">Fechar</button>
  `;

  destino.style.display = "flex";
}

window.fecharPopupFrequencia = () => {
  document.getElementById("popupFrequencia").style.display = "none";
};

/* ========================================================
    5. CONQUISTAS (Mantido o código original)
   ======================================================== */
window.abrirPopupConquista = function(icone, titulo, descricao, detalhes) {
  console.log('🔍 Abrindo popup de conquista:', titulo);
  const popup = document.getElementById('popupConquista');
  if (!popup) {
    console.error('❌ Modal de conquista não encontrado!');
    return;
  }

  // Preencher com dados
   safeSet('conquistaIcone', icone || '🏆'); // Removido para evitar erro de safeSet
   safeSet('conquistaTitulo', titulo || 'Conquista'); // Removido para evitar erro de safeSet
   safeSet('conquistaDescricao', descricao || 'Descrição não disponível.'); // Removido para evitar erro de safeSet
   safeHTML('conquistaDetalhes', detalhes ? detalhes.map(item => `<li>${item}</li>`).join('') : ''); // Removido para evitar erro de safeHTML

  Mostrar modal
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

  montarPainelAluno(aluno);
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

document.addEventListener("DOMContentLoaded", iniciarPainelAluno);
