import { db } from './firebase-config.js';
import {
  collection, doc, getDocs, setDoc, Timestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { INDICE_PARTITURAS, registrosDeIndice } from './biblioteca-indice.js';

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
export const ALGORITMO_RECONHECIMENTO_VERSAO = 8;

const CATALOGO = [
  ['Violino I', ['violino i', 'violino 1', 'violin i', 'violin 1']],
  ['Violino II', ['violino ii', 'violino 2', 'violin ii', 'violin 2']],
  ['Violino', ['violino', 'violin']], ['Viola', ['viola']],
  ['Violoncelo', ['violoncelo', 'violoncello', 'cello']],
  ['Contrabaixo', ['contrabaixo', 'contrabasso', 'contrabass', 'double bass']],
  ['Flauta', ['flauta transversal', 'flauta', 'flute']],
  ['Escaleta', ['escaleta', 'melodica', 'melódica', 'melodion']],
  ['Oboé', ['oboé', 'oboe']], ['Clarinete', ['clarinete', 'clarinet']],
  ['Clarinete em Sib', ['clarinet in bb', 'clarinet in b flat', 'clarinete em sib', 'clarinete sib', 'clarinete si bemol']],
  ['Clarinete em Dó', ['clarinet in c', 'clarinete em do', 'clarinete dó', 'clarinete c']],
  ['Fagote', ['fagote', 'bassoon']],
  ['Saxofone Soprano', ['saxofone soprano', 'sax soprano', 'soprano sax', 'soprano saxophone', 'saxophone soprano']],
  ['Saxofone Alto', ['saxofone alto', 'alto saxofone', 'saxophone alto', 'alto saxophone', 'sax alto', 'alto sax']],
  ['Saxofone Tenor', ['saxofone tenor', 'tenor saxophone', 'saxophone tenor', 'sax tenor', 'tenor sax']],
  ['Saxofone Barítono', ['saxofone barítono', 'saxofone baritono', 'baritone saxophone', 'saxophone baritone', 'sax barítono', 'sax baritono']],
  ['Saxofone', ['saxofone', 'saxophone']], ['Trompete', ['trompete', 'trumpet', 'cornet']],
  ['Trompa', ['trompa', 'french horn']],
  ['Sousafone', ['souzafone', 'sousafone', 'sousaphone', 'souzafone sib', 'sousafone sib', 'sousaphone sib', 'souzafone em sib', 'sousafone em sib', 'sousaphone em sib', 'souzafone bb', 'sousafone bb', 'sousaphone bb', 'souzafone in bb', 'sousafone in bb', 'sousaphone in bb', 'souzafone b flat', 'sousafone b flat', 'sousaphone b flat', 'souzafone in b flat', 'sousafone in b flat', 'sousaphone in b flat', 'souzafone in b', 'sousafone in b', 'sousaphone in b']],
  ['Trombone em Sib', ['trombone em sib', 'trombone sib', 'trombone bb', 'trombone in bb', 'trombone in b flat']],
  ['Trombone em Dó', ['trombone em dó', 'trombone em do', 'trombone c', 'trombone em c', 'trombone in c']],
  ['Trombone 01', ['trombone 01', 'trombone 1']], ['Trombone 02', ['trombone 02', 'trombone 2']],
  ['Trombone Base', ['trombone base', 'bass trombone', 'trombone baixo', 'bass trombone']],
  ['Trombone', ['trombone']], ['Tuba', ['tuba']], ['Bombardino', ['bombardino', 'euphonium']],
  ['Percussão', ['percussão', 'percussao', 'bateria', 'tímpano', 'timpani']],
  ['Piano', ['piano', 'teclado', 'keyboard']], ['Órgão', ['órgão', 'orgao', 'organ']]
].map(([nome, aliases]) => ({ nome, aliases }));
const TERMOS_GRADE = ['grade', 'partitura geral', 'full score', 'orchestral score', 'conductor score'];
let pdfjsLib = null;

function normalizar(texto = '') {
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function localizarInstrumentos(texto) {
  const normalizado = ` ${normalizar(texto)} `;
  const encontrados = [];
  CATALOGO.forEach(item => {
    const alias = item.aliases.slice().sort((a, b) => normalizar(b).length - normalizar(a).length).find(valor => normalizado.includes(` ${normalizar(valor)} `));
    if (alias) encontrados.push({ nome: item.nome, alias: normalizar(alias) });
  });
  return encontrados.filter((item, _, lista) => !lista.some(outro => outro !== item && outro.alias.length > item.alias.length && ` ${outro.alias} `.includes(` ${item.alias} `)));
}
function contemGrade(texto) {
  const normalizado = ` ${normalizar(texto)} `;
  return TERMOS_GRADE.some(termo => normalizado.includes(` ${normalizar(termo)} `));
}
async function carregarPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  if (window.pdfjsLib) { pdfjsLib = window.pdfjsLib; pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return pdfjsLib; }
  await new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = PDFJS_CDN;
    script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
  });
  pdfjsLib = window.pdfjsLib; pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return pdfjsLib;
}
function detectar(textoPagina, textoCabecalho) {
  const cabecalho = localizarInstrumentos(textoCabecalho);
  if (contemGrade(textoCabecalho) || cabecalho.length >= 2) return { nome: 'GRADE', tipo: 'grade', instrumentosDetectados: cabecalho.map(x => x.nome), confianca: contemGrade(textoCabecalho) ? .99 : .90, origem: 'automatico', fonte: 'cabecalho' };
  if (cabecalho.length === 1) return { nome: cabecalho[0].nome, tipo: 'instrumento', instrumentosDetectados: [cabecalho[0].nome], confianca: .90, origem: 'automatico', fonte: 'cabecalho' };
  const pagina = localizarInstrumentos(textoPagina);
  if (pagina.length >= 2) return { nome: 'GRADE', tipo: 'grade', instrumentosDetectados: pagina.map(x => x.nome), confianca: .70, origem: 'automatico-ampliado', fonte: 'pagina' };
  if (pagina.length === 1) return { nome: pagina[0].nome, tipo: 'instrumento', instrumentosDetectados: [pagina[0].nome], confianca: .65, origem: 'automatico-ampliado', fonte: 'pagina' };
  return { nome: null, tipo: 'desconhecido', instrumentosDetectados: [], confianca: 0, origem: 'sem-texto-ou-sem-match', fonte: 'desconhecida' };
}
export async function analisarPartitura(url, { onProgress = () => {} } = {}) {
  const pdfjs = await carregarPdfJs();
  const pdf = await pdfjs.getDocument({ url, cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/', cMapPacked: true }).promise;
  const grupos = []; let atual = null;
  for (let pagina = 1; pagina <= pdf.numPages; pagina++) {
    const content = await (await pdf.getPage(pagina)).getTextContent();
    const itens = (content.items || []).map(item => ({ texto: item.str || '', x: Number(item.transform?.[4] || 0), y: Number(item.transform?.[5] || 0) })).filter(item => item.texto.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
    const textoPagina = itens.map(item => item.texto).join(' ');
    const yMax = itens.length ? Math.max(...itens.map(item => item.y)) : 0;
    const textoCabecalho = itens.filter(item => item.y >= yMax - 180).map(item => item.texto).join(' ');
    const deteccao = detectar(textoPagina, textoCabecalho);
    const novoCabecalho = Boolean(deteccao.nome && deteccao.fonte === 'cabecalho');
    const mesmo = Boolean(atual && deteccao.nome === atual.nome);
    if (novoCabecalho && atual && !mesmo) {
      atual = { ...deteccao, paginas: [pagina] }; grupos.push(atual);
    } else if (atual) atual.paginas.push(pagina);
    else {
      atual = deteccao.nome ? { ...deteccao, paginas: [pagina] } : { nome: `Página ${pagina} — revisar`, tipo: 'desconhecido', paginas: [pagina], instrumentosDetectados: [], confianca: 0, origem: deteccao.origem, fonte: deteccao.fonte };
      grupos.push(atual);
    }
    onProgress({ etapa: 'analisando_paginas', pagina, totalPaginas: pdf.numPages, percentual: 30 + Math.round((pagina / pdf.numPages) * 45) });
  }
  return { grupos, totalPaginas: pdf.numPages };
}
export async function salvarRotulosESincronizar({ colId, colecao, documentoId, nome, url, grupos, configuracoes = [], onProgress = () => {} }) {
  await setDoc(doc(db, 'biblioteca_rotulos', `${colId}_${documentoId}`), { grupos, algoritmoVersao: ALGORITMO_RECONHECIMENTO_VERSAO, atualizadoEm: Timestamp.now() });
  onProgress({ etapa: 'salvando_rotulos', percentual: 82 });
  const registros = registrosDeIndice({ colId, colecao, documentoId, nome, url, grupos, configuracoes });
  const indiceSnap = await getDocs(collection(db, INDICE_PARTITURAS));
  const lote = writeBatch(db);
  indiceSnap.docs.filter(item => item.data().colecaoId === colId && item.data().documentoId === documentoId).forEach(item => lote.delete(item.ref));
  registros.forEach(item => lote.set(doc(db, INDICE_PARTITURAS, item.id), { ...item, atualizadoEm: Timestamp.now() }));
  await lote.commit();
  onProgress({ etapa: 'sincronizando_indice', percentual: 96, registros: registros.length });
  return { registros, paginasComRevisao: grupos.filter(g => g.tipo === 'desconhecido' || /^Página \d+ — revisar$/.test(g.nome)).flatMap(g => g.paginas) };
}
export async function carregarConfiguracoesInstrumentos() {
  try { const snap = await getDocs(collection(db, 'biblioteca_instrumentos')); return snap.docs.map(item => ({ id: item.id, key: item.id, ...item.data() })); } catch { return []; }
}
