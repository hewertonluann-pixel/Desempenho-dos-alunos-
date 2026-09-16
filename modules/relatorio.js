// modules/relatorio.js
// Módulo de Relatório Mensal — Painel do Professor
// Exibe cards de alunos com comprometimento e botão "Emitir Relatório"

import { db } from "../firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { regrasDeConquistas } from "../conquistas.js";

/* ===== MESES ===== */
const MESES = {
  "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
  "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
  "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"
};

/* ===== INICIALIZAÇÃO ===== */
const painel  = document.getElementById("painelRelatorio");
const loader  = document.getElementById("loaderRelatorio");
const inputMes = document.getElementById("mesSelecionado");
const btnFiltrar = document.getElementById("btnFiltrarMes");

// Definir mês atual como padrão
const agora = new Date();
const mesAtualStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
if (inputMes) inputMes.value = mesAtualStr;

// Carregar ao abrir o módulo
await carregarRelatorio(mesAtualStr);

// Botão filtrar
if (btnFiltrar) {
  btnFiltrar.addEventListener("click", async () => {
    const mes = inputMes?.value || mesAtualStr;
    await carregarRelatorio(mes);
  });
}

/* ===== CARREGAR RELATÓRIO ===== */
async function carregarRelatorio(mesChave) {
  if (!painel || !loader) return;

  loader.style.display = "block";
  painel.innerHTML = "";

  try {
    // 1. Carregar todos os alunos
    const snapAlunos = await getDocs(collection(db, "alunos"));
    const alunos = snapAlunos.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.ativo !== false)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    // 2. Carregar eventos do mês selecionado
    const snapEventos = await getDocs(collection(db, "eventos"));
    const eventosMes = snapEventos.docs
      .map(d => d.data())
      .filter(e => e.data && e.data.startsWith(mesChave));

    // 3. Renderizar cards
    loader.style.display = "none";

    if (alunos.length === 0) {
      painel.innerHTML = `<p style="color:#94a3b8; padding:20px; text-align:center;">Nenhum aluno ativo encontrado.</p>`;
      return;
    }

    painel.innerHTML = alunos.map(aluno => criarCardHTML(aluno, eventosMes, mesChave)).join("");

  } catch (err) {
    console.error("❌ Erro ao carregar relatório:", err);
    loader.style.display = "none";
    painel.innerHTML = `<p style="color:#ef4444; padding:20px;">❌ Erro ao carregar dados. Verifique a conexão.</p>`;
  }
}

/* ===== CALCULAR FREQUÊNCIA ===== */
function calcularFrequencia(eventos, nomeAluno) {
  if (!eventos || eventos.length === 0) return { total: 0, presencas: 0, percentual: 0 };
  const total = eventos.length;
  const presencas = eventos.filter(ev => {
    const p = ev.presencas?.find(x => x.nome === nomeAluno);
    return p?.presenca === "presente";
  }).length;
  return { total, presencas, percentual: Math.round((presencas / total) * 100) };
}

/* ===== COR DA BARRA ===== */
function corBarra(pct) {
  if (pct >= 80) return "barra-verde";
  if (pct >= 50) return "barra-amarelo";
  return "barra-vermelho";
}

/* ===== CONQUISTAS DO ALUNO NO MÊS ===== */
function contarConquistasMes(aluno, freqMes) {
  const id = freqMes.percentual === 100 ? "presenca_perfeita" : freqMes.percentual >= 90 ? "presenca_exemplar" : freqMes.percentual >= 80 ? "compromisso" : null;
  return id && regrasDeConquistas.some(c => c.id === id) ? 1 : 0;
}

/* ===== CRIAR HTML DO CARD ===== */
function criarCardHTML(aluno, eventosMes, mesChave) {
  const freq = calcularFrequencia(eventosMes, aluno.nome);
  const conquistas = contarConquistasMes(aluno, freq);
  const [anoRel, mesRel] = mesChave.split("-");
  const nomeMes = MESES[mesRel] || mesRel;

  const fotoHTML = aluno.foto
    ? `<img src="${aluno.foto}" alt="${aluno.nome}" onerror="this.parentElement.innerHTML='<div class=\\'sem-foto\\'>🎵</div>'">`
    : `<div class="sem-foto">🎵</div>`;

  const metodoLeitura = aluno.leituraNome || "Bona";
  const metodoInstrumental = aluno.metodoNome || "Método";

  const urlRelatorio = `relatorio-mensal.html?id=${aluno.id}&mes=${mesChave}`;

  return `
    <div class="card-relatorio-aluno">

      <div class="card-rel-foto">${fotoHTML}</div>

      <div class="card-rel-nome">${aluno.nome}</div>
      <div class="card-rel-instrumento">🎵 ${aluno.instrumento || "Instrumento"}</div>

      <div class="card-rel-indicadores">
        <div class="card-rel-ind">
          <span class="ind-label">Leitura</span>
          <span class="ind-valor">${aluno.leitura || 1}</span>
        </div>
        <div class="card-rel-ind">
          <span class="ind-label">Método</span>
          <span class="ind-valor">${aluno.metodo || 1}</span>
        </div>
        <div class="card-rel-ind">
          <span class="ind-label">Conquistas</span>
          <span class="ind-valor">${conquistas > 0 ? "🏆 " + conquistas : "—"}</span>
        </div>
      </div>

      <div class="card-rel-comp">
        <div class="card-rel-comp-label">
          <span>Comprometimento — ${nomeMes}</span>
          <span>${freq.percentual}%</span>
        </div>
        <div class="card-rel-barra-wrap">
          <div class="card-rel-barra-fill ${corBarra(freq.percentual)}" style="width:${freq.percentual}%"></div>
        </div>
      </div>

      <div class="card-rel-metodos">
        <span>${metodoLeitura}</span> · <span>${metodoInstrumental}</span>
      </div>

      <button class="btn-emitir-relatorio" onclick="window.open('${urlRelatorio}', '_blank')">
        📄 Emitir Relatório
      </button>

    </div>
  `;
}
