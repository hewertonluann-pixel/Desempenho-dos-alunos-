// Catálogo canônico compartilhado pelos cadastros, fichas e edições de alunos.
// `instrumentoId` identifica sempre o instrumento-pai. A divisão do aluno é
// armazenada separadamente em `instrumentoParte` (por exemplo, "1" ou "2").
const CATALOGO = [
  { key: "violino", nome: "Violino", aliases: ["Violino", "Violin"], ordem: 10 },
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
  { key: "trombone-base", nome: "Trombone Base", aliases: ["Trombone Base", "Trombone Baixo", "Bass Trombone"], ordem: 197 },
  { key: "trombone-sib", nome: "Trombone em Sib", aliases: ["Trombone em Sib", "Trombone Sib", "Trombone Bb", "Trombone in Bb", "Trombone in B Flat"], ordem: 200 },
  { key: "trombone-do", nome: "Trombone em Dó", aliases: ["Trombone em Dó", "Trombone em Do", "Trombone C", "Trombone em C", "Trombone in C"], ordem: 210 },
  { key: "tuba", nome: "Tuba", aliases: ["Tuba"], ordem: 220 },
  { key: "bombardino", nome: "Bombardino", aliases: ["Bombardino", "Euphonium"], ordem: 230 },
  { key: "souzafone", nome: "Sousafone", aliases: [
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

const ROMANOS_PARA_NUMERO = new Map([["i", "1"], ["ii", "2"], ["iii", "3"], ["iv", "4"], ["v", "5"], ["vi", "6"], ["vii", "7"], ["viii", "8"], ["ix", "9"], ["x", "10"]]);
function numeroDaParte(valor = "") {
  const token = normalizarInstrumento(valor);
  if (ROMANOS_PARA_NUMERO.has(token)) return ROMANOS_PARA_NUMERO.get(token);
  if (/^\d{1,2}$/.test(token) && Number(token) > 0) return String(Number(token));
  return "";
}
function resolverBase(normalizado) {
  return CHAVES_NORMALIZADAS.get(normalizado) || ALIASES_NORMALIZADOS.get(normalizado) || null;
}

/** Resolve um rótulo de parte em instrumento-pai e número opcional.
 * Aceita, por exemplo, "Trompete 1", "I Trompete", "1º Trompete",
 * "1ª Sax Alto", "Sax Alto I" e os ids legados "trombone-01/02".
 */
export function resolverInstrumentoComParte(valor = "", parteInformada = "") {
  const normalizado = normalizarInstrumento(valor);
  let instrumento = resolverBase(normalizado);
  let parte = numeroDaParte(parteInformada);

  if (!instrumento) {
    const prefixo = normalizado.match(/^(\d{1,2}|i{1,3}|iv|v|vi{0,3}|ix|x)\s+(.+)$/);
    const sufixo = normalizado.match(/^(.+?)\s+(\d{1,2}|i{1,3}|iv|v|vi{0,3}|ix|x)$/);
    const correspondencia = prefixo || sufixo;
    if (correspondencia) {
      const candidatoParte = numeroDaParte(correspondencia[prefixo ? 1 : 2]);
      const nomeBase = prefixo ? correspondencia[2] : correspondencia[1];
      instrumento = resolverBase(nomeBase);
      if (instrumento && !parte) parte = candidatoParte;
    }
  }

  if (!instrumento) return { instrumento: null, parte: "", nomeCompleto: "" };
  return {
    instrumento,
    parte,
    nomeCompleto: parte ? `${instrumento.nome} ${parte}` : instrumento.nome
  };
}

// As funções legadas continuam devolvendo o instrumento-pai. Chamadores que
// precisem preservar a subdivisão devem usar resolverInstrumentoComParte.
export function resolverInstrumento(valor = "") {
  return resolverInstrumentoComParte(valor).instrumento;
}

/** Localiza instrumentos em texto extraído de PDF e conserva a parte como
 * propriedade separada, sem tratar cada número como um instrumento novo. */
export function localizarInstrumentosComParte(texto = "") {
  const normalizado = ` ${normalizarInstrumento(texto)} `;
  if (normalizado.trim() === "") return [];

  const candidatos = [];
  const instrumentos = INSTRUMENTOS_CATALOGO
    .map(instrumento => ({
      instrumento,
      aliases: [...new Set([instrumento.nome, instrumento.key, ...instrumento.aliases]
        .map(normalizarInstrumento).filter(Boolean))]
    }))
    .flatMap(item => item.aliases.map(alias => ({ ...item, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const item of instrumentos) {
    const alvo = ` ${item.alias} `;
    let inicio = 0;
    while ((inicio = normalizado.indexOf(alvo, inicio)) !== -1) {
      const antes = normalizado.slice(0, inicio).trim().split(/\s+/).at(-1) || "";
      const depois = normalizado.slice(inicio + alvo.length).trim().split(/\s+/)[0] || "";
      const parteSufixo = numeroDaParte(depois);
      const partePrefixo = numeroDaParte(antes);
      const prefixoNumerado = /^\d{1,2}$/.test(antes) || ROMANOS_PARA_NUMERO.has(antes);
      const parte = parteSufixo || (prefixoNumerado ? partePrefixo : "");
      const registro = {
        nome: parte ? `${item.instrumento.nome} ${parte}` : item.instrumento.nome,
        instrumento: item.instrumento,
        parte,
        alias: item.alias
      };
      candidatos.push(registro);
      inicio += alvo.length;
    }
  }

  const unicos = new Map();
  candidatos.forEach(item => {
    const chave = `${item.instrumento.key}:${item.parte}`;
    const anterior = unicos.get(chave);
    if (!anterior || item.alias.length > anterior.alias.length) unicos.set(chave, item);
  });
  const resultado = [...unicos.values()];
  const semAliasesSobrepostos = resultado.filter(item => !resultado.some(outro => {
    if (outro === item || outro.alias.length <= item.alias.length || outro.instrumento.key === item.instrumento.key) return false;
    const aliasMaior = ` ${normalizarInstrumento(outro.alias)} `;
    const aliasMenor = ` ${normalizarInstrumento(item.alias)} `;
    return aliasMaior.includes(aliasMenor);
  }));
  return semAliasesSobrepostos.sort((a, b) =>
    a.instrumento.ordem - b.instrumento.ordem || Number(a.parte || 0) - Number(b.parte || 0)
  );
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
export function nomeInstrumentoComParte(valor = "", parte = "") {
  return resolverInstrumentoComParte(valor, parte).nomeCompleto;
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
  const resolvido = resolverInstrumentoComParte(valorAtual);
  const item = resolvido.instrumento;
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
