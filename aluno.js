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
  if (fotoImg) {
    fotoImg.src = aluno.foto || "https://via.placeholder.com/150";
  }

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
    4. GRÁFICO FREQUÊNCIA ANUAL
   ======================================================== */
export async function montarGraficoFrequencia(aluno) {
  const anoAtual = new Date().getFullYear();
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
    6. CALCULAR ENERGIA (Frequência do mês)
   ======================================================== */
export async function calcularEnergiaDoAluno(aluno) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");

  const eventosAno = await getDocs(collection(db, "eventos"));
  const grupos = agruparEventosPorMes(
    eventosAno.docs.map(d => d.data())
  );

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

  montarPainelAluno(aluno);

  await montarGraficoFrequencia(aluno);
  const energia = await calcularEnergiaDoAluno(aluno);

  // 🔥 Gráfico avançado (Bona / Método / Presença)
  const destinoGrafico = document.getElementById("painelEvolucao");
  if (window.gerarGraficoEvolucao) {
    gerarGraficoEvolucao(aluno, energia, destinoGrafico);
  }

  gerarPainelConquistas(aluno, document.getElementById("grade-conquistas"));
  await carregarLicoesAluno(aluno.nome);
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

/* ========================================================
    10. POPUP CONQUISTAS
   ======================================================== */
window.abrirPopupConquista = key => console.log("Abrir", key);
window.fecharPopupConquista = () => console.log("Fechar conquista");

/* ========================================================
    11. INICIAR
   ======================================================== */
document.addEventListener("DOMContentLoaded", iniciarPainelAluno);
