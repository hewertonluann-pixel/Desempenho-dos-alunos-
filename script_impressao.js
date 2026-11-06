import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { INSTRUMENTOS_CATALOGO, normalizarInstrumento, resolverInstrumento } from './instrumentos-catalogo.js';

const $ = id => document.getElementById(id);
const COLECAO_HINOS = 'Hinos da Harpa';
const state = {
  hinos: [],
  alunos: [],
  pendentes: [],
  configs: [],
  turmaIdsOrquestra: new Set(),
  alunoIdsOrquestra: new Set(),
  rows: [],
  hinoAtual: null,
  carregando: false
};

function normalizar(valor = '') { return normalizarInstrumento(valor); }
function escapar(valor = '') { return String(valor).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }
function setLoading(title, message, visible = true) { $('loading-card').hidden = !visible; $('loading-title').textContent = title; $('loading-message').textContent = message; }
function setStatus(text = '', error = false) { $('status').textContent = text; $('status').className = error ? 'status error' : 'status'; }
function isTeacher() {
  try {
    const user = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    return user.classificado === true || user.classificado === 'true' || user.role === 'teacher' || user.tipo === 'professor' || user.isTeacher === true;
  } catch { return false; }
}
function exigirProfessor() {
  if (isTeacher()) return true;
  document.body.innerHTML = '<main style="max-width:620px;margin:15vh auto;padding:24px;color:#e2e8f0;background:#0b1220;border:1px solid rgba(248,113,113,.45);border-radius:16px;font-family:Inter,system-ui,sans-serif"><h1 style="color:#f87171">Acesso restrito</h1><p>Esta página está disponível somente para professores.</p><a href="biblioteca.html" style="color:#38bdf8;font-weight:700">Voltar à Biblioteca</a></main>';
  return false;
}
function configurarCatalogo(remotos) {
  const mapa = new Map(INSTRUMENTOS_CATALOGO.map(item => [item.key, { ...item, aliases: [...item.aliases] }]));
  remotos.forEach(item => {
    const key = item.key || item.id || normalizar(item.nomeExibicao || item.nome);
    const base = mapa.get(key);
    mapa.set(key, {
      ...(base || {}), ...item, key,
      nome: item.nomeExibicao || item.nome || base?.nome || key,
      nomeExibicao: item.nomeExibicao || item.nome || base?.nome || key,
      aliases: [...new Set([...(base?.aliases || []), ...(item.aliases || []), item.nomeExibicao, item.nome, key].filter(Boolean))],
      ordem: item.ordem ?? base?.ordem ?? 9999
    });
  });
  state.configs = [...mapa.values()];
}
function configParaGrupo(nome) {
  const chave = normalizar(nome);
  const encontrado = state.configs.find(config => [config.key, config.nome, config.nomeExibicao, ...(config.aliases || [])].filter(Boolean).map(normalizar).includes(chave));
  if (encontrado) return encontrado;
  const canonico = resolverInstrumento(nome);
  return canonico ? state.configs.find(config => config.key === canonico.key) || { ...canonico, nomeExibicao: canonico.nome, ordem: canonico.ordem } : null;
}
function ehGrade(grupo) {
  const nome = normalizar(grupo?.nome || '');
  const tipo = normalizar(grupo?.tipo || '');
  return tipo === 'grade' || nome === 'grade' || nome.includes('partitura geral') || nome === 'full score' || nome === 'orchestral score' || nome === 'conductor score';
}
function grupoUtil(grupo) {
  const nome = String(grupo?.nome || '').trim();
  const paginas = Array.isArray(grupo?.paginas) ? grupo.paginas.map(Number).filter(Number.isFinite).sort((a, b) => a - b) : [];
  return Boolean(nome && paginas.length && (ehGrade(grupo) || (normalizar(grupo.tipo || '') !== 'desconhecido' && !/^pagina\s+\d+\s+revisar$/.test(normalizar(nome)))));
}
function migrarPaginas(paginas) {
  const grupos = new Map();
  Object.entries(paginas || {}).forEach(([pagina, nome]) => {
    const chave = String(nome || '').trim() || `Página ${pagina} — revisar`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(Number(pagina));
  });
  return [...grupos.entries()].map(([nome, paginasDoGrupo]) => ({ nome, tipo: 'instrumento', paginas: paginasDoGrupo }));
}
async function carregarHinos() {
  const colecoes = await getDocs(collection(db, 'biblioteca_colecoes'));
  const colecao = colecoes.docs.map(item => ({ id: item.id, ...item.data() })).find(item => item.nome === COLECAO_HINOS);
  if (!colecao) throw new Error(`Coleção “${COLECAO_HINOS}” não encontrada.`);
  const documentos = await getDocs(collection(db, 'biblioteca_colecoes', colecao.id, 'documentos'));
  return Promise.all(documentos.docs.map(async item => {
    const data = item.data();
    let grupos = [];
    try {
      const rotulo = await getDoc(doc(db, 'biblioteca_rotulos', `${colecao.id}_${item.id}`));
      if (rotulo.exists()) {
        const dados = rotulo.data();
        grupos = Array.isArray(dados.grupos) ? dados.grupos : migrarPaginas(dados.paginas);
      }
    } catch (error) { console.warn('Não foi possível carregar o rótulo de', data.nome, error); }
    return { id: item.id, colId: colecao.id, nome: data.nome || 'Hino sem nome', url: data.url || '', grupos };
  })).then(lista => lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
}
async function carregarAlunos() {
  const snap = await getDocs(collection(db, 'alunos'));
  const pendentes = [];
  const alunos = snap.docs.map(item => ({ id: item.id, ...item.data() })).filter(aluno => aluno.ativo !== false && (state.turmaIdsOrquestra.has(aluno.turmaId) || state.alunoIdsOrquestra.has(aluno.id))).map(aluno => {
    const valor = aluno.instrumentoId || aluno.instrumento || '';
    const config = configParaGrupo(valor);
    if (!config) pendentes.push({ nome: aluno.nome || aluno.login || aluno.id, valor: valor || 'não informado' });
    return { ...aluno, instrumentoKey: config?.key || '', instrumentoNome: config?.nomeExibicao || config?.nome || '' };
  });
  state.pendentes = pendentes;
  return alunos;
}
async function carregarTurmasOrquestra() {
  const snap = await getDocs(collection(db, 'turmas'));
  state.turmaIdsOrquestra = new Set();
  state.alunoIdsOrquestra = new Set();
  snap.docs.forEach(item => {
    const turma = item.data();
    if (String(turma.tipo || '').toLowerCase() === 'coral') return;
    state.turmaIdsOrquestra.add(item.id);
    (Array.isArray(turma.alunos) ? turma.alunos : []).forEach(id => state.alunoIdsOrquestra.add(id));
  });
}
async function carregarConfiguracoes() {
  try {
    const snap = await getDocs(collection(db, 'biblioteca_instrumentos'));
    return snap.docs.map(item => ({ id: item.id, key: item.id, ...item.data() }));
  } catch (error) { console.warn('Configuração compartilhada indisponível; usando catálogo padrão.', error); return []; }
}
function contagemAlunos() {
  const contagem = new Map();
  state.alunos.forEach(aluno => { if (aluno.instrumentoKey) contagem.set(aluno.instrumentoKey, (contagem.get(aluno.instrumentoKey) || 0) + 1); });
  return contagem;
}
function construirLinhas(hino) {
  const porInstrumento = new Map();
  hino.grupos.filter(grupoUtil).forEach(grupo => {
    const paginas = [...new Set(grupo.paginas.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    if (ehGrade(grupo)) {
      const atual = porInstrumento.get('grade') || { key: 'grade', nome: 'Partitura geral', paginas: [], grade: true, ordem: -1 };
      atual.paginas = [...new Set([...atual.paginas, ...paginas])].sort((a, b) => a - b);
      porInstrumento.set('grade', atual);
      return;
    }
    const config = configParaGrupo(grupo.nome);
    const key = config?.key || `desconhecido:${normalizar(grupo.nome)}`;
    const atual = porInstrumento.get(key) || { key, nome: config?.nomeExibicao || config?.nome || grupo.nome, paginas: [], grade: false, ordem: config?.ordem ?? 9999, desconhecido: !config };
    atual.paginas = [...new Set([...atual.paginas, ...paginas])].sort((a, b) => a - b);
    porInstrumento.set(key, atual);
  });
  const contagem = contagemAlunos();
  state.rows = [...porInstrumento.values()].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR')).map(row => ({
    ...row,
    alunos: row.grade ? 0 : (contagem.get(row.key) || 0),
    copias: row.grade ? 1 : (contagem.get(row.key) || 0),
    incluir: row.grade || Boolean(contagem.get(row.key)),
    origem: row.grade ? 'padrão: 1 cópia' : contagem.get(row.key) ? 'automático' : 'sem aluno'
  }));
}
function preencherHinos() {
  $('hino-select').innerHTML = '<option value="">— Selecione um hino —</option>' + state.hinos.map((hino, index) => `<option value="${index}">${escapar(hino.nome)}</option>`).join('');
  $('hino-select').disabled = false;
}
function atualizarResumo() {
  const linhas = state.rows;
  const incluidas = linhas.filter(row => row.incluir && row.copias > 0);
  const paginas = incluidas.reduce((total, row) => total + row.paginas.length * row.copias, 0);
  const copias = incluidas.reduce((total, row) => total + row.copias, 0);
  const alunos = linhas.filter(row => !row.grade).reduce((total, row) => total + row.alunos, 0);
  $('summary-instruments').textContent = linhas.length || '—';
  $('summary-students').textContent = alunos || '0';
  $('summary-pages').textContent = paginas || '0';
  $('summary-copies').textContent = copias || '0';
  if (!state.hinoAtual) { $('summary-lines').innerHTML = '<p>Selecione um hino para montar o resumo.</p>'; return; }
  $('summary-lines').innerHTML = incluidas.length ? incluidas.map(row => `<p><strong>${escapar(row.nome)}:</strong> ${row.copias} cópia${row.copias === 1 ? '' : 's'} × ${row.paginas.length} página${row.paginas.length === 1 ? '' : 's'} = ${row.copias * row.paginas.length} página${row.copias * row.paginas.length === 1 ? '' : 's'}</p>`).join('') : '<p>Nenhuma linha está configurada para inclusão.</p>';
}
function renderizarTabela() {
  const corpo = $('analysis-body');
  if (!state.rows.length) { corpo.innerHTML = '<tr><td colspan="6" class="empty-cell">Este hino ainda não possui grupos de páginas analisados.</td></tr>'; atualizarResumo(); return; }
  const grade = state.rows.find(row => row.grade);
  $('include-grade').checked = Boolean(grade?.incluir);
  corpo.innerHTML = state.rows.map((row, index) => `<tr class="${row.grade ? 'grade-row' : ''}"><td><input class="include-input" data-index="${index}" type="checkbox" ${row.incluir ? 'checked' : ''} aria-label="Incluir ${escapar(row.nome)}"></td><td><span class="instrument-name">${escapar(row.nome)}</span>${row.desconhecido ? '<span class="instrument-sub">Nome não encontrado no catálogo</span>' : row.grade ? '<span class="instrument-sub">Não depende da quantidade de alunos</span>' : ''}</td><td>${row.paginas.length}</td><td>${row.grade ? '—' : row.alunos}</td><td><input class="copies-input" data-index="${index}" type="number" min="0" max="999" step="1" value="${row.copias}" aria-label="Cópias de ${escapar(row.nome)}"></td><td><span class="origin ${row.origem === 'manual' ? 'manual' : ''}">${row.origem}</span></td></tr>`).join('');
  corpo.querySelectorAll('.include-input').forEach(input => input.addEventListener('change', event => { state.rows[Number(event.target.dataset.index)].incluir = event.target.checked; atualizarResumo(); }));
  corpo.querySelectorAll('.copies-input').forEach(input => input.addEventListener('input', event => { const row = state.rows[Number(event.target.dataset.index)]; const valor = Math.max(0, Math.min(999, Number.parseInt(event.target.value, 10) || 0)); row.copias = valor; row.origem = valor === (row.grade ? 1 : row.alunos) ? (row.grade ? 'padrão: 1 cópia' : row.alunos ? 'automático' : 'sem aluno') : 'manual'; event.target.value = valor; renderizarTabelaPreservandoFoco(event.target); atualizarResumo(); }));
  atualizarResumo();
}
function renderizarTabelaPreservandoFoco(input) {
  const row = state.rows[Number(input.dataset.index)];
  const origem = input.closest('tr')?.querySelector('.origin');
  if (origem) { origem.textContent = row.origem; origem.className = `origin ${row.origem === 'manual' ? 'manual' : ''}`; }
}
function selecionarHino() {
  const indice = Number.parseInt($('hino-select').value, 10);
  state.hinoAtual = Number.isFinite(indice) && state.hinos[indice] ? state.hinos[indice] : null;
  if (!state.hinoAtual) { state.rows = []; $('hino-meta').textContent = 'Os hinos são carregados da coleção “Hinos da Harpa”.'; $('analysis-body').innerHTML = '<tr><td colspan="6" class="empty-cell">Selecione um hino para conferir as partes.</td></tr>'; atualizarResumo(); return; }
  $('hino-meta').textContent = `${state.hinoAtual.nome} · ${state.hinoAtual.grupos.filter(grupoUtil).length} grupo${state.hinoAtual.grupos.filter(grupoUtil).length === 1 ? '' : 's'} de páginas analisado${state.hinoAtual.grupos.filter(grupoUtil).length === 1 ? '' : 's'}.`;
  construirLinhas(state.hinoAtual); renderizarTabela();
}
function renderizarPendentes() {
  const card = $('pending-card');
  if (!state.pendentes.length) { card.hidden = true; return; }
  card.hidden = false;
  $('pending-description').textContent = `${state.pendentes.length} aluno${state.pendentes.length === 1 ? '' : 's'} ativo${state.pendentes.length === 1 ? '' : 's'} da orquestra não entrou na contagem automática porque não possui instrumento válido.`;
  $('pending-list').innerHTML = state.pendentes.map(item => `<li>${escapar(item.nome)} — ${escapar(item.valor)}</li>`).join('');
}
async function carregar() {
  if (state.carregando) return;
  const hinoAnteriorId = state.hinoAtual?.id || '';
  state.carregando = true; $('refresh-btn').disabled = true; $('hino-select').disabled = true; setLoading('Carregando dados...', 'Lendo hinos, rótulos, turmas da orquestra e alunos ativos.'); setStatus('');
  try {
    const [remotos, hinos] = await Promise.all([carregarConfiguracoes(), carregarHinos()]);
    configurarCatalogo(remotos); state.hinos = hinos; await carregarTurmasOrquestra(); state.alunos = await carregarAlunos();
    preencherHinos(); renderizarPendentes(); setLoading('', '', false); setStatus(`${hinos.length} hino${hinos.length === 1 ? '' : 's'} disponível${hinos.length === 1 ? '' : 'eis'} para preparação. A contagem considera somente a orquestra.`);
    const indiceAnterior = state.hinos.findIndex(hino => hino.id === hinoAnteriorId);
    if (indiceAnterior >= 0) { $('hino-select').value = String(indiceAnterior); selecionarHino(); }
  } catch (error) { console.error(error); setLoading('Não foi possível carregar a página.', 'Verifique a conexão e tente novamente.'); setStatus(error.message || 'Falha ao carregar os dados.', true); }
  finally { state.carregando = false; $('refresh-btn').disabled = false; }
}

if (exigirProfessor()) {
  $('hino-select').addEventListener('change', selecionarHino);
  $('refresh-btn').addEventListener('click', carregar);
  $('include-grade').addEventListener('change', event => { const grade = state.rows.find(row => row.grade); if (grade) { grade.incluir = event.target.checked; renderizarTabela(); } });
  carregar();
}
