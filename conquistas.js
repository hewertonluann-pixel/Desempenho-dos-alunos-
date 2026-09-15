// Sistema de conquistas históricas do painel do aluno.
// Cada conquista desbloqueada é persistida em aluno.conquistas na ordem de recebimento.

export const regrasDeConquistas = [
  { id: "primeiro_passo", titulo: "Primeiro Passo", icone: "👣", raridade: "bronze", descricao: "Participou da primeira chamada.", regraLogica: "Ter participação na primeira chamada elegível." },
  { id: "ritmo_inicial", titulo: "Ritmo Inicial", icone: "🎵", raridade: "bronze", descricao: "Esteve presente em cinco chamadas.", regraLogica: "Presença em 5 chamadas elegíveis." },
  { id: "compromisso", titulo: "Compromisso", icone: "🤝", raridade: "prata", descricao: "Alcançou 80% de frequência em um mês.", regraLogica: "Frequência mensal igual ou superior a 80%." },
  { id: "presenca_exemplar", titulo: "Presença Exemplar", icone: "🌟", raridade: "ouro", descricao: "Alcançou 90% de frequência em três meses.", regraLogica: "Frequência mensal igual ou superior a 90% em 3 meses." },
  { id: "presenca_perfeita", titulo: "Presença Perfeita", icone: "🏆", raridade: "ouro", descricao: "Alcançou 100% de frequência no mês.", regraLogica: "Frequência mensal de 100%." },
  { id: "evolucao_leitura", titulo: "Evolução de Leitura", icone: "📘", raridade: "prata", descricao: "Aumentou o nível de leitura em relação ao mês anterior.", regraLogica: "Leitura maior que no mês anterior." },
  { id: "evolucao_instrumental", titulo: "Evolução Instrumental", icone: "🎼", raridade: "prata", descricao: "Aumentou o nível do método instrumental.", regraLogica: "Método maior que no mês anterior." },
  { id: "dupla_evolucao", titulo: "Dupla Evolução", icone: "⚡", raridade: "ouro", descricao: "Evoluiu em leitura e método no mesmo mês.", regraLogica: "Leitura e método maiores no mesmo mês." },
  { id: "constancia", titulo: "Constância", icone: "🔥", raridade: "ouro", descricao: "Evoluiu em três meses consecutivos.", regraLogica: "Combo de evolução em 3 meses seguidos." },
  { id: "superacao", titulo: "Superação", icone: "🚀", raridade: "ouro", descricao: "Melhorou a frequência em relação ao mês anterior.", regraLogica: "Frequência mensal maior que no mês anterior." },
  { id: "retorno_ao_ritmo", titulo: "Retorno ao Ritmo", icone: "🔁", raridade: "prata", descricao: "Voltou a atingir pelo menos 80% depois de um mês abaixo da meta.", regraLogica: "Mês anterior abaixo de 80% e mês atual igual ou superior a 80%." },
  { id: "participacao_coral", titulo: "Participação Coral", icone: "🎶", raridade: "prata", descricao: "Participou de chamadas da turma Coral.", regraLogica: "Presença em uma chamada do Coral." },
  { id: "destaque_professor", titulo: "Destaque do Professor", icone: "🏅", raridade: "ouro", descricao: "Recebeu classificação manual do professor.", regraLogica: "Classificação manual registrada pelo professor." },
  { id: "aniversario_participacao", titulo: "Aniversário de Participação", icone: "🎂", raridade: "ouro", descricao: "Completou um ano desde o cadastro.", regraLogica: "Pelo menos um ano desde criadoEm." },
  { id: "presenca_apresentacao", titulo: "Presença em Apresentação", icone: "🎤", raridade: "lendario", descricao: "Participou de uma apresentação registrada no sistema.", regraLogica: "Presença em uma apresentação." }
];

export const mapaConquistas = Object.fromEntries(regrasDeConquistas.map(c => [c.id, c]));

function normalizarPremios(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.map((item, ordem) => typeof item === "string"
    ? { id: item, desbloqueadaEm: null, ordem }
    : { ...item, ordem: item.ordem ?? ordem }
  ).filter(item => mapaConquistas[item.id]);
}

export function registrarConquistas(aluno, premios) {
  const atuais = normalizarPremios(aluno.conquistas);
  const ids = new Set(atuais.map(c => c.id));
  const novos = premios.filter(p => p && !ids.has(p.id)).map((p, i) => ({
    id: p.id,
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
  const adicionar = (id, data, detalhe = "") => premios.push({ id, desbloqueadaEm: data || new Date().toISOString().slice(0, 10), detalhe });
  const chamadas = (eventos || []).filter(ev => ev.turmaId === aluno.turmaId && registro(ev, aluno)).sort((a, b) => dataEvento(a).localeCompare(dataEvento(b)));
  const presencas = chamadas.filter(ev => presente(ev, aluno));
  if (chamadas[0]) adicionar("primeiro_passo", dataEvento(chamadas[0]), "Primeira chamada elegível registrada.");
  if (presencas[4]) adicionar("ritmo_inicial", dataEvento(presencas[4]), "Quinta presença registrada.");

  const frequencias = new Map();
  chamadas.forEach(ev => { const mes = dataEvento(ev).slice(0, 7); const atual = frequencias.get(mes) || { total: 0, presentes: 0 }; if (!(registro(ev, aluno)?.presenca === "justificado" || registro(ev, aluno)?.presenca === "J")) { atual.total++; if (presente(ev, aluno)) atual.presentes++; } frequencias.set(mes, atual); });
  const meses = [...frequencias.entries()].map(([mes, v]) => ({ mes, percentual: v.total ? Math.round(v.presentes / v.total * 100) : null })).filter(v => v.percentual !== null).sort((a, b) => a.mes.localeCompare(b.mes));
  const c80 = meses.find(v => v.percentual >= 80); if (c80) adicionar("compromisso", mesFinal(c80.mes), `${c80.percentual}% no mês ${c80.mes}.`);
  const c90 = meses.filter(v => v.percentual >= 90); if (c90[2]) adicionar("presenca_exemplar", mesFinal(c90[2].mes), "Três meses com pelo menos 90%.");
  const c100 = meses.find(v => v.percentual === 100); if (c100) adicionar("presenca_perfeita", mesFinal(c100.mes), "Frequência mensal de 100%.");
  for (let i = 1; i < meses.length; i++) { if (meses[i].percentual > meses[i - 1].percentual) adicionar("superacao", mesFinal(meses[i].mes), `${meses[i - 1].percentual}% → ${meses[i].percentual}%.`); if (meses[i - 1].percentual < 80 && meses[i].percentual >= 80) adicionar("retorno_ao_ritmo", mesFinal(meses[i].mes), "Retorno à meta de 80%."); }

  const snaps = (snapshots || []).slice().sort((a, b) => String(a.chave).localeCompare(String(b.chave)));
  const evolucoes = [];
  for (let i = 1; i < snaps.length; i++) {
    const ant = snaps[i - 1], atual = snaps[i]; const leitura = Number(atual.leitura || 0) > Number(ant.leitura || 0); const metodo = Number(atual.metodo || 0) > Number(ant.metodo || 0);
    if (leitura) adicionar("evolucao_leitura", mesFinal(atual.chave), `${ant.leitura || 0} → ${atual.leitura || 0}.`);
    if (metodo) adicionar("evolucao_instrumental", mesFinal(atual.chave), `${ant.metodo || 0} → ${atual.metodo || 0}.`);
    if (leitura && metodo) adicionar("dupla_evolucao", mesFinal(atual.chave), "Leitura e método evoluíram no mesmo mês.");
    evolucoes.push({ chave: atual.chave, evoluiu: leitura || metodo });
  }
  for (let i = 2; i < evolucoes.length; i++) if (evolucoes[i - 2].evoluiu && evolucoes[i - 1].evoluiu && evolucoes[i].evoluiu && mesSeguinte(evolucoes[i - 2].chave, evolucoes[i - 1].chave) && mesSeguinte(evolucoes[i - 1].chave, evolucoes[i].chave)) { adicionar("constancia", mesFinal(evolucoes[i].chave), "Combo de evolução em três meses consecutivos."); break; }
  const coral = (eventosCoral || []).find(ev => presente(ev, aluno)); if (coral) adicionar("participacao_coral", dataEvento(coral), "Presença registrada em chamada do Coral.");
  if (aluno.classificado === true) adicionar("destaque_professor", dataISO(aluno.classificadoEm || aluno.criadoEm), "Classificação manual registrada.");
  const inicio = dataISO(aluno.criadoEm); if (inicio) { const aniversario = new Date(`${inicio}T00:00:00`); aniversario.setFullYear(aniversario.getFullYear() + 1); const hoje = new Date().toISOString().slice(0, 10); if (aniversario.toISOString().slice(0, 10) <= hoje) adicionar("aniversario_participacao", aniversario.toISOString().slice(0, 10), "Um ano desde o cadastro."); }
  const apresentacao = (apresentacoes || []).find(ev => presente(ev, aluno)); if (apresentacao) adicionar("presenca_apresentacao", dataEvento(apresentacao), "Presença registrada em apresentação.");
  const ordem = new Map(regrasDeConquistas.map((r, i) => [r.id, i])); const ids = new Set(); const unicos = [];
  premios.sort((a, b) => String(a.desbloqueadaEm).localeCompare(String(b.desbloqueadaEm)) || ordem.get(a.id) - ordem.get(b.id)).forEach(p => { if (!ids.has(p.id) && mapaConquistas[p.id]) { ids.add(p.id); unicos.push(p); } });
  return unicos;
}

export function gerarPainelConquistas(aluno, elementoAlvo) {
  if (!elementoAlvo) return;
  const premios = normalizarPremios(aluno.conquistas);
  elementoAlvo.innerHTML = "";
  if (!premios.length) {
    elementoAlvo.innerHTML = `<div class="conquistas-vazio">Ainda não há troféus desbloqueados. Continue participando!</div>`;
    return;
  }
  premios.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).forEach(premio => {
    const regra = mapaConquistas[premio.id];
    const card = document.createElement("button");
    card.type = "button";
    card.className = `achievement-card desbloqueado raridade-${regra.raridade}`;
    card.innerHTML = `<div class="achievement-icon">${regra.icone}</div><div class="achievement-name">${regra.titulo}</div><div class="achievement-data">${premio.desbloqueadaEm ? formatarData(premio.desbloqueadaEm) : "Desbloqueada"}</div>`;
    card.addEventListener("click", () => abrirPopupConquista(regra.icone, regra.titulo, regra.descricao, premio.detalhe ? [premio.detalhe] : [], regra.raridade, regra.regraLogica));
    elementoAlvo.appendChild(card);
  });
}

function formatarData(valor) {
  if (!valor) return "";
  const [a, m, d] = String(valor).slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : String(valor);
}

function safeSet(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

export function abrirPopupConquista(icone, titulo, descricao, detalhes = [], raridade = "bronze", condicao = null, progresso = null) {
  const popup = document.getElementById("popupConquista");
  if (!popup) return;
  safeSet("conquistaIconeModal", icone || "🏆");
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
