// aluno.js
// ==========================================
// PAINEL DO ALUNO — Sistema Unificado
// Trabalha com a coleção "eventos" e o aluno
// Atualiza frequência, energia, conquistas e gráficos
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
import { gerarPainelConquistas } from "./conquistas.js";

/* ========================================================
    1. OBTER ALUNO LOGADO (pela URL)
   ======================================================== */
export async function carregarAlunoAtual() {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");

  if (!nomeAluno) {
    // Se não houver nome na URL, redireciona para o login
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
    2. EXIBIR DADOS DO ALUNO (Adaptado para o novo HTML)
   ======================================================== */
export function montarPainelAluno(aluno) {
  // Sidebar
  document.getElementById("nomeAluno").textContent = aluno.nome || "Aluno";
  document.getElementById("instrumentoAluno").textContent = aluno.instrumento || "Não definido";

  // Foto (IMG)
  const fotoImg = document.getElementById("fotoAluno");
  if (fotoImg) {
    fotoImg.src = aluno.foto || "https://via.placeholder.com/150";
    fotoImg.alt = `Foto de ${aluno.nome}`;
  }

  // Leitura e Método
  const leitura = aluno.leitura ?? 0;
  const metodo = aluno.metodo ?? 0;

  document.getElementById("nivelLeitura").textContent = leitura;
  document.getElementById("nivelMetodo").textContent = metodo;

  // NÍVEL TOTAL (soma)
  const nivel = leitura + metodo;
  document.getElementById("nivelGeral").textContent = nivel;

  // Modo Professor
  if (aluno.classificado === true) {
    document.getElementById("modoProfessorBtn").style.display = "block";
  }

  // Energia visual
  // O valor de energia será calculado em calcularEnergiaDoAluno
  // e não mais lido do aluno.
  // atualizarEnergiaVisual(aluno.energia ?? 10);
  
  // Conquistas (simulação)
  // A lógica de carregamento de conquistas será movida para iniciarPainelAluno
  // carregarConquistas(aluno.conquistas || {});
}

/* ========================================================
    3. ATUALIZAR ENERGIA NO PAINEL DO ALUNO (Adaptado para o novo HTML)
   ======================================================== */
export function atualizarEnergiaVisual(valor) {
  const barra = document.getElementById("barraEnergia");
  const numero = document.getElementById("valorEnergia");

  if (!barra || !numero) return;

  barra.style.width = valor + "%";
  numero.textContent = valor + "%";

  // Cores baseadas nas variáveis CSS (verde, amarelo, vermelho)
  if (valor >= 80) barra.style.backgroundColor = "var(--verde)";
  else if (valor >= 40) barra.style.backgroundColor = "var(--amarelo)";
  else barra.style.backgroundColor = "var(--vermelho)";
}

/* ========================================================
    4. CARREGAR GRÁFICO DE FREQUÊNCIA ANUAL
   ======================================================== */
// Mantido o código original, pois a lógica de dados é a mesma.
export async function montarGraficoFrequencia(aluno) {
  const anoAtual = new Date().getFullYear();

  const destinoGrafico = document.getElementById("gradeFrequencia");
  const destinoPopup = document.getElementById("popupFrequencia");

  if (!destinoGrafico) return;

  // O novo HTML usa o ID 'gradeFrequencia'
  await gerarPainelFrequencia(
    aluno,
    anoAtual,
    destinoGrafico,
    dadosPopup => abrirPopupFrequencia(dadosPopup, destinoPopup)
  );
}

/* ========================================================
    5. POPUP (detalhes do mês)
   ======================================================== */
// Mantido o código original, mas o HTML do popup foi simplificado no novo HTML.
export function abrirPopupFrequencia(info, destino) {
  if (!destino) return;

  const meses = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"
  };

  // O novo HTML usa a classe 'popup-content'
  destino.querySelector(".popup-content").innerHTML = `
    <h3>Frequência de ${meses[info.mes] || info.mes}</h3>

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
    6. CALCULAR ENERGIA DO ALUNO (baseado no mês atual)
   ======================================================== */
// Mantido o código original.
export async function calcularEnergiaDoAluno(aluno) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");

  const eventosAno = await obterEventosDoAno(ano);
  const grupos = agruparEventosPorMes(eventosAno);

  const chaveMes = `${ano}-${mesAtual}`;
  const eventosMes = grupos[chaveMes] || [];

  const freq = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);

  const energia = freq.percentual; // Agora a energia é a frequência real

  atualizarEnergiaVisual(energia);

  return energia;
}

/* ========================================================
    7. INICIALIZAÇÃO DA PÁGINA DO ALUNO
   ======================================================== */
export async function iniciarPainelAluno() {
  const aluno = await carregarAlunoAtual();
  if (!aluno) return;

  montarPainelAluno(aluno);
  await montarGraficoFrequencia(aluno);
  await calcularEnergiaDoAluno(aluno);
  // Renderiza o painel de conquistas
  gerarPainelConquistas(aluno, document.getElementById("grade-conquistas"));
  await carregarLicoesAluno(aluno.nome); // preenche a aba de lições
}

/* ========================================================
    8. FUNÇÕES DE POPUP DE SENHA (Simplificado)
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
  const mensagemSenha = document.getElementById("mensagemSenha");
  const aluno = await carregarAlunoAtual(); // Recarrega o aluno para obter o ID

  if (!novaSenha || novaSenha.length < 6) {
    mensagemSenha.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  if (aluno && aluno.id) {
    try {
      const alunoRef = doc(db, "alunos", aluno.id);
      await updateDoc(alunoRef, {
        senha: novaSenha // ATENÇÃO: Isso é inseguro em produção!
      });
      mensagemSenha.textContent = "Senha alterada com sucesso!";
      setTimeout(fecharPopup, 2000);
    } catch (error) {
      console.error("Erro ao salvar a senha:", error);
      mensagemSenha.textContent = "Erro ao salvar a senha. Tente novamente.";
    }
  }
};

/* ========================================================
    9. FUNÇÕES DE FOTO E MODO PROFESSOR
   ======================================================== */
window.enviarNovaFoto = () => {
  alert("Funcionalidade de upload de foto precisa ser implementada.");
  // A lógica de upload de foto precisa ser implementada, pois não estava no código original.
};

window.acessarModoProfessor = () => {
  window.location.href = "professor.html";
};

/* ========================================================
    10. CONQUISTAS (Renderização)
   ======================================================== */
// A lógica de cálculo e renderização foi movida para conquistas.js

window.abrirPopupConquista = (key) => {
  // A lógica de popup será movida para conquistas.js
  // Por enquanto, apenas para evitar erros de referência
  console.log("Abrir popup para: " + key);
};

window.fecharPopupConquista = () => {
  // A lógica de popup será movida para conquistas.js
  // Por enquanto, apenas para evitar erros de referência
  console.log("Fechar popup");
};

/* ========================================================
    11. EXECUTAR AUTOMATICAMENTE AO CARREGAR A PÁGINA
   ======================================================== */
document.addEventListener("DOMContentLoaded", iniciarPainelAluno);

// A função abrirModalEnviarLicao será implementada em licoes.js
// A função carregarLicoesAluno será implementada em licoes.js
// A função de navegação (como logout) será implementada em navegacao.js

gerarGraficoEvolucao(aluno, document.getElementById("painelEvolucao"));

