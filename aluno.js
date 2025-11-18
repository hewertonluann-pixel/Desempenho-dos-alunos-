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
  doc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  obterEventosDoAno,
  agruparEventosPorMes,
  calcularFrequenciaMensalParaAluno,
  gerarPainelFrequencia,
  calcularEnergia
} from "./frequencia.js";

import { carregarLicoesAluno } from "./licoes.js";

/* ========================================================
    1. OBTER ALUNO LOGADO (pela URL)
   ======================================================== */
export async function carregarAlunoAtual() {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");

  if (!nomeAluno) {
    alert("Nenhum aluno informado.");
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
    return null;
  }

  return alunoEncontrado;
}

/* ========================================================
    2. EXIBIR DADOS DO ALUNO
   ======================================================== */
export function montarPainelAluno(aluno) {
  const nomeEl = document.getElementById("nomeAluno");
  if (nomeEl) nomeEl.textContent = aluno.nome;

  const instrumentoEl = document.getElementById("instrumentoAluno");
  if (instrumentoEl) instrumentoEl.textContent = aluno.instrumento || "--";

  // Foto (IMG)
  const fotoImg = document.getElementById("fotoAluno");
  if (fotoImg) {
    fotoImg.src = aluno.foto || "https://via.placeholder.com/150";
    fotoImg.alt = `Foto de ${aluno.nome}`;
  }

  // Leitura e Método
  const leitura = aluno.leitura ?? 0;
  const metodo = aluno.metodo ?? 0;

  const leituraEl = document.getElementById("nivelLeitura");
  const metodoEl = document.getElementById("nivelMetodo");
  if (leituraEl) leituraEl.textContent = leitura;
  if (metodoEl) metodoEl.textContent = metodo;

  // 💥 NÍVEL TOTAL (soma)
  const nivel = leitura + metodo;
  const nivelEl = document.getElementById("nivelGeral");
  if (nivelEl) nivelEl.textContent = nivel;

  // Energia visual
  atualizarEnergiaVisual(aluno.energia ?? 10);
}

/* ========================================================
    3. ATUALIZAR ENERGIA NO PAINEL DO ALUNO
   ======================================================== */
export function atualizarEnergiaVisual(valor) {
  const barra = document.getElementById("barraEnergia");
  const numero = document.getElementById("valorEnergia");

  if (!barra || !numero) return;

  barra.style.width = valor + "%";
  numero.textContent = valor;

  if (valor >= 80) barra.style.background = "#00ff99";
  else if (valor >= 50) barra.style.background = "#22d3ee";
  else if (valor >= 30) barra.style.background = "#eab308";
  else barra.style.background = "#ef4444";
}

/* ========================================================
    4. CARREGAR GRÁFICO DE FREQUÊNCIA ANUAL
   ======================================================== */
export async function montarGraficoFrequencia(aluno) {
  const anoAtual = new Date().getFullYear();

  const destinoGrafico = document.getElementById("gradeFrequencia");
  const destinoPopup = document.getElementById("popupFrequencia");

  if (!destinoGrafico) return;

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
export function abrirPopupFrequencia(info, destino) {
  if (!destino) return;

  const meses = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"
  };

  destino.innerHTML = `
    <div class="popup-conteudo">
      <h2>${meses[info.mes] || info.mes}</h2>

      <p><strong>Chamadas no mês:</strong> ${info.totalEventos}</p>
      <p><strong>Presente em:</strong> ${info.presencasAluno}</p>
      <p><strong>Frequência:</strong> ${info.percentual}%</p>

      <button id="fecharPopup" class="fechar-popup">Fechar</button>
    </div>
  `;

  destino.style.display = "flex";

  const btnFechar = document.getElementById("fecharPopup");
  if (btnFechar) {
    btnFechar.onclick = () => {
      destino.style.display = "none";
    };
  }
}

/* ========================================================
    6. CALCULAR ENERGIA DO ALUNO (baseado no mês atual)
   ======================================================== */
export async function calcularEnergiaDoAluno(aluno) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");

  const eventosAno = await obterEventosDoAno(ano);
  const grupos = agruparEventosPorMes(eventosAno);

  const chaveMes = `${ano}-${mesAtual}`;
  const eventosMes = grupos[chaveMes] || [];

  const freq = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);

  const energia = calcularEnergia(freq.percentual);

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
  await carregarLicoesAluno(aluno.nome); // preenche a aba de lições
}

/* ========================================================
    8. EXECUTAR AUTOMATICAMENTE AO CARREGAR A PÁGINA
   ======================================================== */
document.addEventListener("DOMContentLoaded", iniciarPainelAluno);
