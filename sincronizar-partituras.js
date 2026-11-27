import { db } from './firebase-config.js';
import { collection, getDocs, doc, writeBatch, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { registrosDeIndice, INDICE_PARTITURAS } from './biblioteca-indice.js';

const $ = id => document.getElementById(id);
function usuarioAtual() { try { return JSON.parse(localStorage.getItem('usuarioAtual') || '{}'); } catch { return {}; } }
function ehProfessor() { const u = usuarioAtual(); return u.classificado === true || u.classificado === 'true' || u.role === 'teacher' || u.tipo === 'professor' || u.isTeacher === true; }
function setStatus(text, tipo = '') { $('status').textContent = text; $('status').className = `status ${tipo}`; }
function log(text) { $('log').hidden = false; $('log').textContent += `${text}\n`; }
function progresso(atual, total) { $('fill').style.width = `${total ? Math.round(atual / total * 100) : 0}%`; }
async function carregarConfiguracoes() { const snap = await getDocs(collection(db, 'biblioteca_instrumentos')); return snap.docs.map(d => ({ id: d.id, key: d.id, ...d.data() })); }
async function lerRegistrosAtuaisOtimizado() {
  const [colecoesSnap, configuracoes] = await Promise.all([getDocs(collection(db, 'biblioteca_colecoes')), carregarConfiguracoes().catch(() => [])]);
  const selecionadas = colecoesSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => ['Músicas', 'Hinos da Harpa'].includes(c.nome));
  const rotulosSnap = await getDocs(collection(db, 'biblioteca_rotulos'));
  const rotulos = new Map(rotulosSnap.docs.map(d => [d.id, d.data()]));
  const registros = [];
  let processados = 0;
  for (const col of selecionadas) {
    const documentos = await getDocs(collection(db, 'biblioteca_colecoes', col.id, 'documentos'));
    for (const item of documentos.docs) {
      const dados = item.data();
      registros.push(...registrosDeIndice({ colId: col.id, colecao: col.nome, documentoId: item.id, nome: dados.nome || 'Sem nome', url: dados.url || '', grupos: rotulos.get(`${col.id}_${item.id}`)?.grupos || [], configuracoes }));
      processados += 1;
      setStatus(`Lendo rótulos: ${processados} documento${processados === 1 ? '' : 's'}...`);
    }
  }
  return registros;
}
async function gravarEmLotes(registros) {
  const antigos = await getDocs(collection(db, INDICE_PARTITURAS));
  const operacoes = [...antigos.docs.map(item => ({ tipo: 'delete', ref: item.ref })), ...registros.map(item => ({ tipo: 'set', ref: doc(db, INDICE_PARTITURAS, item.id), data: { ...item, sincronizadoEm: serverTimestamp() } }))];
  for (let inicio = 0; inicio < operacoes.length; inicio += 450) {
    const lote = writeBatch(db);
    operacoes.slice(inicio, inicio + 450).forEach(op => op.tipo === 'delete' ? lote.delete(op.ref) : lote.set(op.ref, op.data));
    await lote.commit();
    progresso(Math.min(inicio + 450, operacoes.length), operacoes.length);
    setStatus(`Gravando índice: ${Math.min(inicio + 450, operacoes.length)} de ${operacoes.length} operações...`);
  }
}
async function sincronizar() {
  const button = $('sync'); button.disabled = true; $('log').textContent = ''; $('log').hidden = true; progresso(0, 1);
  try {
    const registros = await lerRegistrosAtuaisOtimizado();
    await gravarEmLotes(registros);
    log(`Coleção: ${INDICE_PARTITURAS}`);
    log(`Registros escritos: ${registros.length}`);
    log(`Documentos sem grupo indexável: mantidos somente em biblioteca_rotulos.`);
    setStatus(`Índice atualizado com ${registros.length} registros.`, 'ok');
  } catch (error) { console.error(error); setStatus(`Falha ao sincronizar: ${error.message}`, 'error'); }
  finally { button.disabled = false; }
}
if (!ehProfessor()) { document.querySelector('.card').innerHTML = '<h1>Acesso restrito</h1><p>Esta página está disponível somente para professores.</p><a href="professor.html">Voltar ao painel</a>'; }
else $('sync').addEventListener('click', sincronizar);
