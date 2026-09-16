// Sistema de conquistas históricas do painel do aluno.
// Cada conquista desbloqueada é persistida em aluno.conquistas na ordem de recebimento.
import { chamadaElegivelParaAluno } from "./participacoes.js";

export const regrasDeConquistas = [
  { id: "primeiro_passo", titulo: "Primeiro Passo", icone: "👣", raridade: "bronze", descricao: "Participou da primeira chamada.", regraLogica: "Ter participação na primeira chamada elegível." },
  { id: "ritmo_inicial", titulo: "Ritmo Inicial", icone: "🎵", raridade: "bronze", descricao: "Esteve presente em cinco chamadas.", regraLogica: "Presença em 5 chamadas elegíveis." },
  { id: "compromisso", periodicidade: "mensal", titulo: "Compromisso", icone: "🤝", raridade: "prata", descricao: "Alcançou de 80% a 89% de frequência no mês.", regraLogica: "Frequência mensal entre 80% e 89%." },
  { id: "presenca_exemplar", periodicidade: "mensal", titulo: "Presença Exemplar", icone: "🌟", raridade: "ouro", descricao: "Alcançou de 90% a 99% de frequência no mês.", regraLogica: "Frequência mensal entre 90% e 99%." },
  { id: "presenca_perfeita", periodicidade: "mensal", titulo: "Presença Perfeita", icone: "🏆", raridade: "ouro", descricao: "Alcançou 100% de frequência no mês.", regraLogica: "Frequência mensal de 100%." },
  { id: "evolucao_leitura", periodicidade: "mensal", titulo: "Evolução de Leitura", icone: "📘", raridade: "prata", descricao: "Aumentou o nível de leitura no mês, sem evolução instrumental.", regraLogica: "Leitura maior e método sem evolução no mês." },
  { id: "evolucao_instrumental", periodicidade: "mensal", titulo: "Evolução Instrumental", icone: "🎼", raridade: "prata", descricao: "Aumentou o nível instrumental no mês, sem evolução de leitura.", regraLogica: "Método maior e leitura sem evolução no mês." },
  { id: "dupla_evolucao", periodicidade: "mensal", titulo: "Evolução Dupla", icone: "⚡", raridade: "ouro", descricao: "Evoluiu em leitura e método no mesmo mês.", regraLogica: "Leitura e método maiores no mesmo mês; substitui as duas medalhas individuais." },
  { id: "constancia", titulo: "Constância", icone: "🔥", raridade: "ouro", descricao: "Evoluiu em três meses consecutivos.", regraLogica: "Combo de evolução em 3 meses seguidos." },
  { id: "superacao", titulo: "Superação", icone: "🚀", raridade: "ouro", descricao: "Melhorou a frequência em relação ao mês anterior.", regraLogica: "Frequência mensal maior que no mês anterior." },
  { id: "retorno_ao_ritmo", titulo: "Retorno ao Ritmo", icone: "🔁", raridade: "prata", descricao: "Voltou a atingir pelo menos 80% depois de um mês abaixo da meta.", regraLogica: "Mês anterior abaixo de 80% e mês atual igual ou superior a 80%." },
  { id: "participacao_coral", titulo: "Primeira Participação Coral", icone: "🎶", raridade: "prata", descricao: "Participou pela primeira vez de uma chamada do Coral.", regraLogica: "Primeira presença registrada em chamada do Coral." },
  { id: "destaque_professor", titulo: "Destaque do Professor", icone: "🏅", raridade: "ouro", descricao: "Recebeu classificação manual do professor.", regraLogica: "Classificação manual registrada pelo professor." },
  { id: "aniversario_participacao", titulo: "Aniversário de Participação", icone: "🎂", raridade: "ouro", descricao: "Completou um ano desde o cadastro.", regraLogica: "Pelo menos um ano desde criadoEm." },
  { id: "presenca_apresentacao", titulo: "Presença em Apresentação", icone: "🎤", raridade: "lendario", descricao: "Participou de uma apresentação registrada no sistema.", regraLogica: "Presença em uma apresentação." }
];

export const mapaConquistas = Object.fromEntries(regrasDeConquistas.map(c => [c.id, c]));

export function definirIconesConquistas(itens = {}) {
  regrasDeConquistas.forEach(regra => {
    regra.imagemUrl = itens[regra.id]?.url || "";
  });
}

function normalizarPremios(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((item, ordem) => typeof item === "string"
    ? { id: item, desbloqueadaEm: null, ordem }
    : { ...item, ordem: item.ordem ?? ordem }
  ).filter(item => mapaConquistas[item.id]);
}

export function registrarConquistas(aluno, premios) {
  const atuais = normalizarPremios(aluno.conquistas);
  const chavePremio = premio => {
    const regra = mapaConquistas[premio?.id];
    if (regra?.periodicidade === "mensal") {
      return `${premio.id}:${premio.competencia || String(premio.desbloqueadaEm || "").slice(0, 7)}`;
    }
    return `${premio?.id}:unica`;
  };
  const chaves = new Set(atuais.map(chavePremio));
  const novos = premios.filter(p => p && !chaves.has(chavePremio(p))).map((p, i) => ({
    id: p.id,
    ...(p.competencia ? { competencia: p.competencia } : {}),
    desbloqueadaEm: p.desbloqueadaEm || new Date().toISOString().slice(0, 10),
    detalhe: p.detalhe || "",
    ordem: atuais.length + i
  }));
  return [...atuais, ...novos];
}

function dataEvento(ev) { return String(ev?.data || "9999-12-31").slice(0, 10); }
function dataISO(valor) { if (!valor) return null; if (typeof valor.toDate === "function") valor = valor.toDate(); const s = String(valor); if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const d = new Date(valor); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); }
function presente(ev, aluno) { const p = (ev?.presencas || []).find(x => (x.alunoId && x.alunoId === aluno.id) || x.nome === aluno.nome); return p?.presenca === "presente" || p?.presenca === "P"; }
function registro(ev, aluno) { return (ev?.presencas || []).find(x => (x.alunoId && x.alunoId === aluno.id) || x.nome === aluno.nome); }
function mesFinal(mes) { return `${mes}-28`; }
function mesSeguinte(anterior, atual) { const [a, m] = String(anterior).split("-").map(Number); const [aa, mm] = String(atual).split("-").map(Number); return aa * 12 + mm === a * 12 + m + 1; }

export function avaliarConquistasHistoricas(aluno, snapshots = [], eventos = [], eventosCoral = [], apresentacoes = []) {
  const premios = [];
  const adicionar = (id, competencia, data, detalhe = "") => premios.push({ id, competencia: mapaConquistas[id]?.periodicidade === "mensal" ? competencia : undefined, desbloqueadaEm: data || new Date().toISOString().slice(0, 10), detalhe });
  const chamadas = (eventos || []).filter(ev => chamadaElegivelParaAluno(ev, aluno, aluno.turmaId)).sort((a, b) => dataEvento(a).localeCompare(dataEvento(b)));
  const presencas = chamadas.filter(ev => presente(ev, aluno));
  if (chamadas[0]) adicionar("primeiro_passo", null, dataEvento(chamadas[0]), "Primeira chamada elegível registrada.");
  if (presencas[4]) adicionar("ritmo_inicial", null, dataEvento(presencas[4]), "Quinta presença registrada.");

  const frequencias = new Map();
  chamadas.forEach(ev => { const mes = dataEvento(ev).slice(0, 7); const atual = frequencias.get(mes) || { total: 0, presentes: 0 }; const p = registro(ev, aluno); if (p?.presenca !== "justificado" && p?.presenca !== "J") { atual.total++; if (presente(ev, aluno)) atual.presentes++; } frequencias.set(mes, atual); });
  const meses = [...frequencias.entries()].map(([mes, v]) => ({ mes, percentual: v.total ? Math.round(v.presentes / v.total * 100) : null })).filter(v => v.percentual !== null).sort((a, b) => a.mes.localeCompare(b.mes));
  meses.forEach((mes, i) => {
    if (mes.percentual === 100) adicionar("presenca_perfeita", mes.mes, mesFinal(mes.mes), "Frequência mensal de 100%.");
    else if (mes.percentual >= 90) adicionar("presenca_exemplar", mes.mes, mesFinal(mes.mes), `${mes.percentual}% no mês ${mes.mes}.`);
    else if (mes.percentual >= 80) adicionar("compromisso", mes.mes, mesFinal(mes.mes), `${mes.percentual}% no mês ${mes.mes}.`);
    if (i > 0) {
      const anterior = meses[i - 1];
      if (mes.percentual > anterior.percentual) adicionar("superacao", mes.mes, mesFinal(mes.mes), `${anterior.percentual}% → ${mes.percentual}%.`);
      if (anterior.percentual < 80 && mes.percentual >= 80) adicionar("retorno_ao_ritmo", mes.mes, mesFinal(mes.mes), "Retorno à meta de 80%.");
    }
  });

  const snaps = (snapshots || []).slice().sort((a, b) => String(a.chave).localeCompare(String(b.chave)));
  const evolucoes = [];
  for (let i = 1; i < snaps.length; i++) {
    const ant = snaps[i - 1], atual = snaps[i];
    const leitura = Number(atual.leitura || 0) > Number(ant.leitura || 0);
    const metodo = Number(atual.metodo || 0) > Number(ant.metodo || 0);
    if (leitura && metodo) adicionar("dupla_evolucao", atual.chave, mesFinal(atual.chave), `${ant.leitura || 0} → ${atual.leitura || 0}; ${ant.metodo || 0} → ${atual.metodo || 0}.`);
    else if (leitura) adicionar("evolucao_leitura", atual.chave, mesFinal(atual.chave), `${ant.leitura || 0} → ${atual.leitura || 0}.`);
    else if (metodo) adicionar("evolucao_instrumental", atual.chave, mesFinal(atual.chave), `${ant.metodo || 0} → ${atual.metodo || 0}.`);
    evolucoes.push({ chave: atual.chave, evoluiu: leitura || metodo });
  }
  for (let i = 2; i < evolucoes.length; i++) if (evolucoes[i - 2].evoluiu && evolucoes[i - 1].evoluiu && evolucoes[i].evoluiu && mesSeguinte(evolucoes[i - 2].chave, evolucoes[i - 1].chave) && mesSeguinte(evolucoes[i - 1].chave, evolucoes[i].chave)) { adicionar("constancia", null, mesFinal(evolucoes[i].chave), "Combo de evolução em três meses consecutivos."); break; }
  const coral = (eventosCoral || []).filter(ev => presente(ev, aluno)).sort((a, b) => dataEvento(a).localeCompare(dataEvento(b)))[0]; if (coral) adicionar("participacao_coral", null, dataEvento(coral), "Primeira presença registrada em chamada do Coral.");
  if (aluno.classificado === true) adicionar("destaque_professor", null, dataISO(aluno.classificadoEm || aluno.criadoEm), "Classificação manual registrada.");
  const inicio = dataISO(aluno.criadoEm); if (inicio) { const aniversario = new Date(`${inicio}T00:00:00`); aniversario.setFullYear(aniversario.getFullYear() + 1); const hoje = new Date().toISOString().slice(0, 10); if (aniversario.toISOString().slice(0, 10) <= hoje) adicionar("aniversario_participacao", null, aniversario.toISOString().slice(0, 10), "Um ano desde o cadastro."); }
  const apresentacao = (apresentacoes || []).find(ev => presente(ev, aluno)); if (apresentacao) adicionar("presenca_apresentacao", null, dataEvento(apresentacao), "Presença registrada em apresentação.");
  const ordem = new Map(regrasDeConquistas.map((r, i) => [r.id, i]));
  return premios.filter(p => mapaConquistas[p.id]).sort((a, b) => String(a.desbloqueadaEm).localeCompare(String(b.desbloqueadaEm)) || ordem.get(a.id) - ordem.get(b.id));
}

export function gerarPainelConquistas(aluno, elementoAlvo) {
  if (!elementoAlvo) return;
  const premios = normalizarPremios(aluno.conquistas);
  const hoje = new Date();
  const chaveHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  let mesSelecionado = elementoAlvo.dataset.mesConquistas || chaveHoje;
  const rotuloMes = chave => {
    const [ano, mes] = chave.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(ano, mes - 1, 1));
  };
  const deslocarMes = (chave, delta) => {
    const [ano, mes] = chave.split("-").map(Number);
    const data = new Date(ano, mes - 1 + delta, 1);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
  };
  const renderizar = () => {
    elementoAlvo.dataset.mesConquistas = mesSelecionado;
    const doMes = premios.filter(premio => {
      const competencia = premio.competencia || String(premio.desbloqueadaEm || "").slice(0, 7);
      return competencia === mesSelecionado;
    });
    elementoAlvo.innerHTML = `<div class="conquistas-navegacao"><button type="button" class="conquistas-mes-btn" data-mes-anterior aria-label="Mês anterior">‹</button><strong>🏆 ${rotuloMes(mesSelecionado)}</strong><button type="button" class="conquistas-mes-btn" data-mes-proximo aria-label="Próximo mês">›</button></div><div class="conquistas-mes-vazio" ${doMes.length ? 'hidden' : ''}>Nenhum troféu desbloqueado neste mês.</div>`;
    const grade = document.createElement("div");
    grade.className = "conquistas-grade-mes";
    doMes.slice().sort((a, b) => String(a.desbloqueadaEm || "9999-12-31").localeCompare(String(b.desbloqueadaEm || "9999-12-31")) || (a.ordem ?? 0) - (b.ordem ?? 0)).forEach(premio => {
      const regra = mapaConquistas[premio.id];
      const card = document.createElement("button");
      card.type = "button";
      card.className = `achievement-card desbloqueado raridade-${regra.raridade}`;
      card.innerHTML = `<div class="achievement-icon">${regra.imagemUrl ? `<img src="${regra.imagemUrl}" alt="" loading="lazy">` : regra.icone}</div><div class="achievement-name">${regra.titulo}</div><div class="achievement-data">${premio.desbloqueadaEm ? formatarData(premio.desbloqueadaEm) : "Desbloqueada"}</div>`;
      card.addEventListener("click", () => abrirPopupConquista(regra.icone, regra.titulo, regra.descricao, premio.detalhe ? [premio.detalhe] : [], regra.raridade, regra.regraLogica, null, regra.imagemUrl));
      grade.appendChild(card);
    });
    elementoAlvo.appendChild(grade);
    elementoAlvo.querySelector("[data-mes-anterior]").addEventListener("click", () => { mesSelecionado = deslocarMes(mesSelecionado, -1); renderizar(); });
    elementoAlvo.querySelector("[data-mes-proximo]").addEventListener("click", () => { mesSelecionado = deslocarMes(mesSelecionado, 1); renderizar(); });
  };
  renderizar();
}

function formatarData(valor) {
  if (!valor) return "";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(valor);
}

function safeSet(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

export function abrirPopupConquista(icone, titulo, descricao, detalhes = [], raridade = "bronze", condicao = null, progresso = null, imagemUrl = "") {
  const popup = document.getElementById("popupConquista");
  if (!popup) return;
  const iconeModal = document.getElementById("conquistaIconeModal");
  if (iconeModal) iconeModal.innerHTML = imagemUrl ? `<img src="${imagemUrl}" alt="${titulo || "Conquista"}">` : (icone || "🏆");
  safeSet("conquistaNomeModal", titulo || "Conquista");
  safeSet("conquistaNivelModal", ({ ouro: "Ouro", prata: "Prata", bronze: "Bronze", lendario: "Lendário" })[raridade] || "Troféu");
  safeSet("conquistaDescricaoModal", descricao || "Conquista desbloqueada.");
  safeSet("conquistaCondicaoModal", condicao || descricao || "Condição registrada.");
  const sec = document.getElementById("conquistaProgressoSection");
  if (sec) sec.style.display = progresso ? "block" : "none";
  if (progresso) {
    const fill = document.getElementById("conquistaProgressoFill");
    const text = document.getElementById("conquistaProgressoText");
    if (fill) fill.style.width = `${progresso.porcentagem}%`;
    if (text) text.textContent = `${progresso.atual} / ${progresso.total}`;
  }
  popup.style.display = "flex";
  popup.classList.add("active");
}

export function fecharPopupConquista() {
  const popup = document.getElementById("popupConquista");
  if (popup) { popup.style.display = "none"; popup.classList.remove("active"); }
}

if (typeof window !== "undefined") window.fecharPopupConquista = fecharPopupConquista;
