import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

const COLECOES = ['Músicas', 'Hinos da Harpa'];
const CONFIG_PADRAO = [
  { key: 'clarinete', nomeExibicao: 'Clarinete', aliases: ['Clarinete','Clarinete 1','Clarinete I','Clarinete em Sib','Clarinete Sib','Clarinete Si Bemol','Clarinet in Bb','Clarinet in B Flat'], ordem: 20 },
  { key: 'trombone', nomeExibicao: 'Trombone', aliases: ['Trombone','Trombone 1','Trombone I','Trombone 01'], ordem: 40 },
  { key: 'trompete', nomeExibicao: 'Trompete', aliases: ['Trompete','Trumpet','Cornet'], ordem: 45 },
  { key: 'violino', nomeExibicao: 'Violino', aliases: ['Violino','Violino 1','Violino I'], ordem: 80 }
];
let documentos = [], instrumentos = [], linhas = [], carregando = false;
const $ = id => document.getElementById(id);
const normalizar = (v = '') => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
const escapar = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chave = (col, id) => `${col}:${id}`;
function aliases(config) { return [config.key, config.nomeExibicao, config.chaveCanonica, ...(Array.isArray(config.aliases) ? config.aliases : [])].filter(Boolean).map(normalizar); }
function aplicarConfigs(remotas) {
  const map = new Map(CONFIG_PADRAO.map(c => [c.key, {...c, ativo: true}]));
  remotas.forEach(c => { const key = c.key || c.id || normalizar(c.nomeExibicao || c.nome); const base = map.get(key); map.set(key, {...base, ...c, key, nomeExibicao: c.nomeExibicao || base?.nomeExibicao || c.nome || key, aliases: [...new Set([...(base?.aliases || []), ...(c.aliases || [])])]}); });
  return map;
}
function grupoValido(g) { const nome = String(g?.nome || '').trim(); const paginas = Array.isArray(g?.paginas) ? g.paginas : []; const tipo = normalizar(g?.tipo || ''); return nome && paginas.length && tipo !== 'grade' && tipo !== 'desconhecido' && normalizar(nome) !== 'grade' && !/^pagina \d+ revisar$/.test(normalizar(nome)); }
function criarCatalogo(configMap) {
  const porNome = new Map();
  configMap.forEach((c, key) => { if (c.ativo !== false) porNome.set(key, {...c, key}); });
  documentos.flatMap(d => d.grupos.filter(grupoValido)).forEach(g => {
    const nome = String(g.nome).trim(), n = normalizar(nome);
    let encontrado = [...porNome.values()].find(c => aliases(c).includes(n));
    if (!encontrado) { const key = n.replace(/\s+/g, '_'); encontrado = porNome.get(key) || {key, nomeExibicao: nome, aliases:[nome], ordem:9999, ativo:true}; porNome.set(key, encontrado); }
  });
  instrumentos = [...porNome.values()].filter(c => c.ativo !== false).sort((a,b) => (a.ordem ?? 9999) - (b.ordem ?? 9999) || a.nomeExibicao.localeCompare(b.nomeExibicao, 'pt-BR'));
}
function canonical(nome) { const n = normalizar(nome); const item = instrumentos.find(c => aliases(c).includes(n)); return item || {key:n.replace(/\s+/g,'_'), nomeExibicao:nome}; }
function setLoading(title, message, show = true) { $('loading-card').hidden = !show; $('loading-title').textContent = title; $('loading-message').textContent = message; }
function setStatus(text, error = false) { $('status').textContent = text; $('status').className = error ? 'status error' : 'status'; }
async function carregarDados() {
  setLoading('Carregando cobertura...', 'Lendo as coleções de músicas e hinos.');
  const colSnap = await getDocs(collection(db, 'biblioteca_colecoes'));
  const colecoes = colSnap.docs.map(d => ({id:d.id, ...d.data()})).filter(c => COLECOES.includes(c.nome));
  const resultado = [];
  for (const col of colecoes) {
    setLoading('Carregando cobertura...', `Lendo documentos de ${col.nome}...`);
    const docsSnap = await getDocs(collection(db, 'biblioteca_colecoes', col.id, 'documentos'));
    for (const d of docsSnap.docs) {
      const data = d.data(); let grupos = [], rotuloExiste = false;
      try { const snap = await getDoc(doc(db, 'biblioteca_rotulos', `${col.id}_${d.id}`)); if (snap.exists()) { rotuloExiste = true; const r = snap.data(); grupos = Array.isArray(r.grupos) ? r.grupos : []; if (!grupos.length && r.paginas && typeof r.paginas === 'object') grupos = Object.entries(r.paginas).map(([p,n]) => ({nome:n, tipo:'instrumento', paginas:[Number(p)], confianca:.5, origem:'migrado'})); } } catch (e) { console.warn('Falha ao ler rótulo', d.id, e); }
      resultado.push({id:d.id, colId:col.id, colecao:col.nome, nome:data.nome || 'Sem nome', url:data.url || '', grupos, rotuloExiste});
    }
  }
  documentos = resultado.sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));
  let remotas = [];
  try { const snap = await getDocs(collection(db, 'biblioteca_instrumentos')); remotas = snap.docs.map(d => ({id:d.id,key:d.id,...d.data()})); } catch (e) { console.warn('Configuração remota indisponível', e); }
  const configs = aplicarConfigs(remotas); criarCatalogo(configs); construirLinhas();
}
function construirLinhas() {
  linhas = documentos.map(d => {
    const gruposValidos = d.grupos.filter(grupoValido), desconhecidos = gruposValidos.filter(g => !instrumentos.some(i => aliases(i).includes(normalizar(g.nome))));
    const encontrados = new Map();
    gruposValidos.forEach(g => { const i = canonical(g.nome); if (!encontrados.has(i.key)) encontrados.set(i.key, {paginas:[], grupos:[]}); const item = encontrados.get(i.key); item.paginas.push(...g.paginas); item.grupos.push(g); });
    const analisada = d.rotuloExiste && d.grupos.length > 0;
    const celulas = new Map(instrumentos.map(i => { const encontrado = encontrados.get(i.key); return [i.key, encontrado ? {status:'disponivel', paginas:[...new Set(encontrado.paginas)].sort((a,b)=>a-b), grupos:encontrado.grupos} : {status:analisada ? 'pendente' : 'nao-analisada', paginas:[], grupos:[]}]; }));
    const faltantes = [...celulas.values()].filter(c => c.status === 'pendente').length;
    const status = !analisada ? 'nao-analisada' : desconhecidos.length ? 'revisar' : faltantes ? 'incompleta' : 'completa';
    return {...d, celulas, status, desconhecidos, faltantes};
  });
}
function preencherInstrumentos() { $('instrument-filter').innerHTML = '<option value="all">Todos os instrumentos</option>' + instrumentos.map(i => `<option value="${escapar(i.key)}">${escapar(i.nomeExibicao)}</option>`).join(''); }
function statusTexto(status) { return ({completa:'Completa',incompleta:'Incompleta','nao-analisada':'Não analisada',revisar:'Revisar'})[status] || status; }
function linhasVisiveis() { const busca = normalizar($('search-input').value), col = $('collection-filter').value, st = $('status-filter').value, inst = $('instrument-filter').value; return linhas.filter(l => (!busca || normalizar(l.nome).includes(busca)) && (col === 'all' || l.colecao === col) && (st === 'all' || l.status === st) && (inst === 'all' || l.celulas.get(inst)?.status === 'pendente')); }
function renderizar() {
  const visiveis = linhasVisiveis(), instFiltro = $('instrument-filter').value;
  const completas = linhas.filter(l=>l.status==='completa').length, nao = linhas.filter(l=>l.status==='nao-analisada').length, pendencias = linhas.reduce((n,l)=>n+l.faltantes,0);
  $('summary-songs').textContent = linhas.length; $('summary-complete').textContent = completas; $('summary-incomplete').textContent = linhas.filter(l=>l.status==='incompleta'||l.status==='revisar').length; $('summary-unanalysed').textContent = nao; $('summary-pendencies').textContent = pendencias;
  $('visible-count').textContent = `${visiveis.length} música${visiveis.length===1?'':'s'}`; $('visible-description').textContent = instFiltro === 'all' ? 'Lista filtrada' : `Filtradas pela ausência de ${instrumentos.find(i=>i.key===instFiltro)?.nomeExibicao || instFiltro}`; $('work-summary').hidden = false;
  const head = $('coverage-head'); head.innerHTML = `<tr><th>Música</th>${instrumentos.map(i=>`<th>${escapar(i.nomeExibicao)}</th>`).join('')}<th>Situação</th></tr>`;
  $('coverage-body').innerHTML = visiveis.map(l => `<tr><td><span class="song-title">${escapar(l.nome)}</span><span class="song-collection">${escapar(l.colecao)}</span><span class="song-status ${l.status==='completa'?'complete':l.status==='revisar'?'review':l.status==='nao-analisada'?'unknown':''}">${statusTexto(l.status)}</span></td>${instrumentos.map(i => { const c=l.celulas.get(i.key); const pages=c.paginas.length?`<small>${c.paginas.join(', ')}</small>`:''; const label=c.status==='disponivel'?'✓ Disponível':c.status==='pendente'?'! Pendente':c.status==='revisar'?'? Revisar':'— Não analisada'; return `<td class="cell ${c.status}" title="${escapar(label)}">${label}${pages}</td>`; }).join('')}<td>${l.faltantes ? `<strong>${l.faltantes} pendente${l.faltantes===1?'':'s'}</strong>` : statusTexto(l.status)}</td></tr>`).join('');
  $('table-wrap').hidden = !visiveis.length; $('empty-state').hidden = Boolean(visiveis.length); renderizarPendencias(visiveis);
}
function renderizarPendencias(visiveis) { const instFiltro=$('instrument-filter').value; const itens=[]; visiveis.forEach(l => instrumentos.forEach(i => { const c=l.celulas.get(i.key); if (c?.status==='pendente' && (instFiltro==='all'||instFiltro===i.key)) itens.push({l,i}); })); $('missing-section').hidden=!itens.length; $('missing-count').textContent=itens.length; $('missing-list').innerHTML=itens.map(({l,i})=>`<article class="missing-item"><strong>${escapar(l.nome)}</strong><span>${escapar(l.colecao)} · Instrumento faltante: <b>${escapar(i.nomeExibicao)}</b></span><a href="partes.html?col=${encodeURIComponent(l.colId)}&doc=${encodeURIComponent(l.id)}" target="_blank" rel="noopener">Abrir análise →</a></article>`).join(''); }
function csvCell(v) { return `"${String(v ?? '').replace(/"/g,'""')}"`; }
function exportarCsv() { const visiveis=linhasVisiveis(), rows=[['musica','colecao','instrumento','status','paginas','grupo','confianca','origem','url']]; visiveis.forEach(l=>instrumentos.forEach(i=>{const c=l.celulas.get(i.key); const grupos=c.grupos||[]; if(!grupos.length) rows.push([l.nome,l.colecao,i.nomeExibicao,c.status,'','','','',l.url]); else grupos.forEach(g=>rows.push([l.nome,l.colecao,i.nomeExibicao,c.status,[...new Set(g.paginas||[])].sort((a,b)=>a-b).join('-'),g.nome,g.confianca ?? '',g.origem ?? '',l.url]));})); const blob=new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\n')],{type:'text/csv;charset=utf-8'}), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='cobertura-de-partituras.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
async function carregar() { if (carregando) return; carregando=true; $('refresh-btn').disabled=true; $('export-btn').disabled=true; try { await carregarDados(); preencherInstrumentos(); renderizar(); $('export-btn').disabled=false; setStatus(`${documentos.length} músicas verificadas com ${instrumentos.length} instrumentos ativos no catálogo.`); } catch(e) { console.error(e); setStatus('Não foi possível carregar a cobertura. Tente novamente.',true); } finally { carregando=false; $('refresh-btn').disabled=false; setLoading('', '', false); } }
['search-input','collection-filter','status-filter','instrument-filter'].forEach(id => $(id).addEventListener(id==='search-input'?'input':'change', renderizar)); $('refresh-btn').addEventListener('click', carregar); $('export-btn').addEventListener('click', exportarCsv); carregar();
