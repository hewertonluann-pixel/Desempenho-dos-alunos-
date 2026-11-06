// Catálogo canônico compartilhado pelos cadastros, fichas e edições de alunos.
// O campo `instrumentoId` usa a chave estável; `instrumento` mantém o nome canônico exibível.

const CATALOGO = [
  { key: "violino", nome: "Violino", aliases: ["Violino", "Violino 1", "Violino I"], ordem: 10 },
  { key: "viola", nome: "Viola", aliases: ["Viola"], ordem: 20 },
  { key: "violoncelo", nome: "Violoncelo", aliases: ["Violoncelo", "Violoncello", "Cello"], ordem: 30 },
  { key: "contrabaixo", nome: "Contrabaixo", aliases: ["Contrabaixo", "Contrabasso", "Contrabass", "Double Bass"], ordem: 40 },
  { key: "flauta", nome: "Flauta", aliases: ["Flauta", "Flauta transversal", "Flute"], ordem: 50 },
  { key: "escaleta", nome: "Escaleta", aliases: ["Escaleta", "Melódica", "Melodica", "Melodion"], ordem: 60 },
  { key: "oboe", nome: "Oboé", aliases: ["Oboé", "Oboe"], ordem: 70 },
  { key: "clarinete", nome: "Clarinete", aliases: ["Clarinete", "Clarinet"], ordem: 80 },
  { key: "clarinete-sib", nome: "Clarinete em Sib", aliases: [
    "Clarinete em Sib", "Clarinete Sib", "Clarinete Si Bemol", "Clarinet in Bb", "Clarinet in B Flat"
  ], ordem: 90 },
  { key: "clarinete-do", nome: "Clarinete em Dó", aliases: [
    "Clarinete em Dó", "Clarinete em Do", "Clarinete Dó", "Clarinete C", "Clarinet in C"
  ], ordem: 100 },
  { key: "fagote", nome: "Fagote", aliases: ["Fagote", "Bassoon"], ordem: 110 },
  { key: "saxofone-soprano", nome: "Saxofone Soprano", aliases: [
    "Saxofone Soprano", "Sax Soprano", "Soprano Sax", "Soprano Saxophone", "Saxophone Soprano"
  ], ordem: 120 },
  { key: "saxofone-alto", nome: "Saxofone Alto", aliases: [
    "Saxofone Alto", "Alto Saxofone", "Saxophone Alto", "Alto Saxophone", "Sax Alto", "Alto Sax"
  ], ordem: 130 },
  { key: "saxofone-tenor", nome: "Saxofone Tenor", aliases: [
    "Saxofone Tenor", "Tenor Saxophone", "Saxophone Tenor", "Sax Tenor", "Tenor Sax"
  ], ordem: 140 },
  { key: "saxofone-baritono", nome: "Saxofone Barítono", aliases: [
    "Saxofone Barítono", "Saxofone Baritono", "Baritone Saxophone", "Saxophone Baritone", "Sax Barítono", "Sax Baritono"
  ], ordem: 150 },
  { key: "saxofone", nome: "Saxofone", aliases: ["Saxofone", "Saxophone"], ordem: 160 },
  { key: "trompete", nome: "Trompete", aliases: ["Trompete", "Trumpet", "Cornet"], ordem: 170 },
  { key: "trompa", nome: "Trompa", aliases: ["Trompa", "French Horn"], ordem: 180 },
  { key: "trombone", nome: "Trombone", aliases: ["Trombone"], ordem: 190 },
  { key: "trombone-01", nome: "Trombone 01", aliases: ["Trombone 01", "Trombone 1", "Trombone I"], ordem: 195 },
  { key: "trombone-02", nome: "Trombone 02", aliases: ["Trombone 02", "Trombone 2", "Trombone II"], ordem: 196 },
  { key: "trombone-base", nome: "Trombone Base", aliases: ["Trombone Base", "Trombone Baixo", "Bass Trombone"], ordem: 197 },
  { key: "trombone-sib", nome: "Trombone em Sib", aliases: ["Trombone em Sib", "Trombone Sib", "Trombone Bb", "Trombone in Bb", "Trombone in B Flat"], ordem: 200 },
  { key: "trombone-do", nome: "Trombone em Dó", aliases: ["Trombone em Dó", "Trombone em Do", "Trombone C", "Trombone em C", "Trombone in C"], ordem: 210 },
  { key: "tuba", nome: "Tuba", aliases: ["Tuba"], ordem: 220 },
  { key: "bombardino", nome: "Bombardino", aliases: ["Bombardino", "Euphonium"], ordem: 230 },
  { key: "souzafone", nome: "Souzafone", aliases: [
    "Souzafone", "Sousafone", "Sousaphone", "Souzafone em Sib", "Sousafone em Sib", "Sousaphone em Sib",
    "Souzafone Sib", "Sousafone Sib", "Sousaphone Sib", "Souzafone Bb", "Sousafone Bb", "Sousaphone Bb",
    "Souzafone in Bb", "Sousafone in Bb", "Sousaphone in Bb", "Souzafone B Flat", "Sousafone B Flat",
    "Sousaphone B Flat", "Souzafone in B", "Sousafone in B", "Sousaphone in B"
  ], ordem: 240 },
  { key: "percussao", nome: "Percussão", aliases: ["Percussão", "Percussao", "Bateria", "Tímpano", "Timpani"], ordem: 250 },
  { key: "piano", nome: "Piano", aliases: ["Piano", "Teclado", "Keyboard"], ordem: 260 },
  { key: "orgao", nome: "Órgão", aliases: ["Órgão", "Orgao", "Organ"], ordem: 270 }
];

export const INSTRUMENTOS_CATALOGO = Object.freeze(
  CATALOGO.map(item => Object.freeze({ ...item, aliases: Object.freeze([...item.aliases]) }))
);

export function normalizarInstrumento(valor = "") {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const CHAVES_NORMALIZADAS = new Map(
  INSTRUMENTOS_CATALOGO.map(item => [normalizarInstrumento(item.key), item])
);
const ALIASES_NORMALIZADOS = new Map();
INSTRUMENTOS_CATALOGO.forEach(item => {
  [item.nome, item.key, ...item.aliases].forEach(alias => {
    const normalizado = normalizarInstrumento(alias);
    if (normalizado && !ALIASES_NORMALIZADOS.has(normalizado)) ALIASES_NORMALIZADOS.set(normalizado, item);
  });
});

export function resolverInstrumento(valor = "") {
  const normalizado = normalizarInstrumento(valor);
  return CHAVES_NORMALIZADAS.get(normalizado) || ALIASES_NORMALIZADOS.get(normalizado) || null;
}

export function instrumentoValido(valor = "") {
  return Boolean(resolverInstrumento(valor));
}

export function chaveInstrumento(valor = "") {
  return resolverInstrumento(valor)?.key || "";
}

export function nomeInstrumento(valor = "") {
  return resolverInstrumento(valor)?.nome || "";
}

function escaparHtml(valor = "") {
  return String(valor).replace(/[&<>"']/g, caractere => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[caractere]));
}

export function opcoesInstrumentos(valorAtual = "", { placeholder = "— Selecione o instrumento —", incluirLegado = true } = {}) {
  const atual = resolverInstrumento(valorAtual);
  const opcoes = [`<option value="">${escaparHtml(placeholder)}</option>`];
  if (valorAtual && !atual && incluirLegado) {
    opcoes.push(`<option value="" selected disabled>⚠️ Revisar valor antigo: ${escaparHtml(valorAtual)}</option>`);
  }
  INSTRUMENTOS_CATALOGO
    .slice()
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"))
    .forEach(item => {
      opcoes.push(`<option value="${escaparHtml(item.key)}"${atual?.key === item.key ? " selected" : ""}>${escaparHtml(item.nome)}</option>`);
    });
  return opcoes.join("");
}

export function preencherSelectInstrumentos(select, valorAtual = "", options = {}) {
  if (!select) return null;
  select.innerHTML = opcoesInstrumentos(valorAtual, options);
  const item = resolverInstrumento(valorAtual);
  select.value = item?.key || "";
  if (valorAtual && !item) {
    select.dataset.instrumentoLegado = String(valorAtual);
    select.title = `Valor antigo para revisão: ${valorAtual}`;
  } else {
    delete select.dataset.instrumentoLegado;
    select.removeAttribute("title");
  }
  return item;
}
