import { db } from './firebase-config.js';
import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { registrosDeIndice, INDICE_PARTITURAS } from './biblioteca-indice.js';

const $ = id => document.getElementById(id);
const COLECOES_ALVO = new Set(['Músicas', 'Hinos da Harpa']);
let registrosDaPrevia = null;
let resumoDaPrevia = null;

function usuarioAtual() { try { return JSON.parse(localStorage.getItem('usuarioAtual') || '{}'); } catch { return {}; } }
function ehProfessor() { const u = usuarioAtual(); return u.classificado === true || u.classificado === 'true' || u.role === 'teacher' || u.tipo === 'professor' || u.isTeacher === true; }
function setStatus(text, tipo = '') { $('status').textContent = text; $('status').className = `status ${tipo}`; }
function log(text) { $('log').hidden = false; $('log').textContent += `${text}\n`; }
function progresso(atual, total) { $('fill').style.width = `${total ? Math.round(atual / total * 100) : 0}%`; }
function celula(valor) { const td = document.createElement('td'); td.textContent = String(valor); return td; }

async function carregarConfiguracoes() {
  const snap = await getDocs(collection(db, 'biblioteca_instrumentos'));
  return snap.docs.map(d => ({ id: d.id, key: d.id, ...d.data() }));
}

async function lerRegistrosAtuaisOtimizado() {
  const [colecoesSnap, configuracoes] = await Promise.all([
    getDocs(collection(db, 'biblioteca_colecoes')),
    carregarConfiguracoes().catch(() => [])
  ]);
  const selecionadas = colecoesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(c => COLECOES_ALVO.has(c.nome));
  const rotulosSnap = await getDocs(collection(db, 'biblioteca_rotulos'));
  const rotulos = new Map(rotulosSnap.docs.map(d => [d.id, d.data()]));
  const registros = [];
  let processados = 0;

  for (const col of selecionadas) {
    setStatus(`Lendo rótulos: coleção ${col.nome}...`);
    const documentos = await getDocs(collection(db, 'biblioteca_colecoes', col.id, 'documentos'));
    for (const item of documentos.docs) {
      const dados = item.data();
      registros.push(...registrosDeIndice({
        colId: col.id,
        colecao: col.nome,
        documentoId: item.id,
        nome: dados.nome || 'Sem nome',
        url: dados.url || '',
        grupos: rotulos.get(`${col.id}_${item.id}`)?.grupos || [],
        configuracoes
      }));
      processados += 1;
      setStatus(`Lendo rótulos: ${processados} documento${processados === 1 ? '' : 's'}...`);
    }
  }
  return registros;
}

function montarResumo(registros) {
  const porInstrumentoParte = new Map();
  const documentos = new Set();
  registros.forEach(registro => {
    documentos.add(`${registro.colecaoId}:${registro.documentoId}`);
    const partes = Array.isArray(registro.partes) && registro.partes.length
      ? registro.partes
      : [{ parte: '', nome: registro.instrumentoNome, paginas: registro.paginas }];
    partes.forEach(parte => {
      const valorParte = String(parte.parte || '');
      const key = `${registro.instrumentoKey}:${valorParte}`;
      const atual = porInstrumentoParte.get(key) || {
        instrumento: registro.instrumentoNome || registro.instrumentoKey,
        parte: valorParte,
        documentos: new Set(),
        paginas: 0
      };
      atual.documentos.add(`${registro.colecaoId}:${registro.documentoId}`);
      atual.paginas += Array.isArray(parte.paginas) ? parte.paginas.length : 0;
      porInstrumentoParte.set(key, atual);
    });
  });
  const linhas = [...porInstrumentoParte.values()]
    .map(item => ({ instrumento: item.instrumento, parte: item.parte || 'Sem subdivisão', documentos: item.documentos.size, paginas: item.paginas }))
    .sort((a, b) => a.instrumento.localeCompare(b.instrumento, 'pt-BR') || a.parte.localeCompare(b.parte, 'pt-BR'));
  return { linhas, quantidadeDocumentos: documentos.size, quantidadeRegistros: registros.length };
}

function mostrarPrevia(registros) {
  resumoDaPrevia = montarResumo(registros);
  registrosDaPrevia = registros;
  $('preview-summary').textContent = `${resumoDaPrevia.quantidadeDocumentos} documentos candidatos · ${resumoDaPrevia.quantidadeRegistros} registros de instrumento-pai · ${resumoDaPrevia.linhas.length} combinações pai/parte. “Sem subdivisão” permanece distinto das partes numeradas.`;
  const corpo = $('preview-rows');
  corpo.replaceChildren();
  if (!resumoDaPrevia.linhas.length) {
    const tr = document.createElement('tr');
    const td = celula('Nenhum registro indexável foi encontrado nos rótulos atuais.');
    td.colSpan = 4;
    tr.appendChild(td);
    corpo.appendChild(tr);
  } else {
    resumoDaPrevia.linhas.forEach(item => {
      const tr = document.createElement('tr');
      tr.append(celula(item.instrumento), celula(item.parte), celula(item.documentos), celula(item.paginas));
      corpo.appendChild(tr);
    });
  }
  $('preview-panel').hidden = false;
  $('sync').disabled = false;
}

async function prepararPrevia() {
  const button = $('preview');
  button.disabled = true;
  $('sync').disabled = true;
  $('log').textContent = '';
  $('log').hidden = true;
  $('preview-panel').hidden = true;
  registrosDaPrevia = null;
  resumoDaPrevia = null;
  progresso(0, 1);
  setStatus('Gerando prévia sem gravar dados...');
  try {
    const registros = await lerRegistrosAtuaisOtimizado();
    mostrarPrevia(registros);
    setStatus('Prévia pronta. Revise os instrumentos-pai, as partes e as contagens antes de confirmar.', 'ok');
  } catch (error) {
    console.error(error);
    setStatus(`Falha ao gerar a prévia: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

async function gravarEmLotes(registros) {
  const antigos = await getDocs(collection(db, INDICE_PARTITURAS));
  // Atualizar candidatos primeiro e remover apenas entradas obsoletas das coleções recalculadas; demais índices permanecem intactos.
  const idsCandidatos = new Set(registros.map(item => item.id));
  const operacoes = [
    ...registros.map(item => ({
      tipo: 'set',
      ref: doc(db, INDICE_PARTITURAS, item.id),
      data: { ...item, sincronizadoEm: serverTimestamp() }
    })),
    ...antigos.docs
      .filter(item => COLECOES_ALVO.has(item.data().colecaoNome) && !idsCandidatos.has(item.id))
      .map(item => ({ tipo: 'delete', ref: item.ref }))
  ];
  if (!operacoes.length) {
    progresso(1, 1);
    return 0;
  }
  for (let inicio = 0; inicio < operacoes.length; inicio += 450) {
    const lote = writeBatch(db);
    operacoes.slice(inicio, inicio + 450).forEach(op => op.tipo === 'delete' ? lote.delete(op.ref) : lote.set(op.ref, op.data));
    await lote.commit();
    progresso(Math.min(inicio + 450, operacoes.length), operacoes.length);
    setStatus(`Gravando índice: ${Math.min(inicio + 450, operacoes.length)} de ${operacoes.length} operações...`);
  }
  return operacoes.length;
}

async function sincronizar() {
  if (!Array.isArray(registrosDaPrevia) || !resumoDaPrevia) {
    setStatus('Gere e revise uma prévia antes de gravar.', 'error');
    $('sync').disabled = true;
    return;
  }
  const confirmacao = `Confirmar a atualização do índice derivado?\n\nDocumentos com grupos indexáveis: ${resumoDaPrevia.quantidadeDocumentos}\nRegistros pai: ${resumoDaPrevia.quantidadeRegistros}\nCombinações pai/parte: ${resumoDaPrevia.linhas.length}\n\nSerão recalculados apenas Músicas e Hinos da Harpa. PDFs, rótulos e outros registros do índice não serão alterados.`;
  if (!window.confirm(confirmacao)) return;

  const button = $('sync');
  button.disabled = true;
  $('preview').disabled = true;
  $('log').textContent = '';
  $('log').hidden = true;
  progresso(0, 1);
  try {
    const operacoes = await gravarEmLotes(registrosDaPrevia);
    log(`Coleção atualizada: ${INDICE_PARTITURAS}`);
    log(`Documentos candidatos: ${resumoDaPrevia.quantidadeDocumentos}`);
    log(`Registros pai escritos: ${registrosDaPrevia.length}`);
    log(`Operações do lote: ${operacoes}`);
    log('Rótulos, PDFs e registros de outras coleções foram preservados.');
    setStatus(`Índice atualizado com ${registrosDaPrevia.length} registros.`, 'ok');
    registrosDaPrevia = null;
    resumoDaPrevia = null;
    button.disabled = true;
  } catch (error) {
    console.error(error);
    setStatus(`Falha ao sincronizar: ${error.message}`, 'error');
    button.disabled = false;
  } finally {
    $('preview').disabled = false;
  }
}

if (!ehProfessor()) {
  document.querySelector('.card').innerHTML = '<h1>Acesso restrito</h1><p>Esta página está disponível somente para professores.</p><a href="professor.html">Voltar ao painel</a>';
} else {
  $('preview').addEventListener('click', prepararPrevia);
  $('sync').addEventListener('click', sincronizar);
}
