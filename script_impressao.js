import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { INSTRUMENTOS_CATALOGO, normalizarInstrumento, resolverInstrumentoComParte } from './instrumentos-catalogo.js';

const $ = id => document.getElementById(id);
const COLECOES_IMPRESSAO = new Set(['hinos da harpa', 'musicas']);
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
let pdfLib = null;
const state = {
  hinos: [],
  alunos: [],
  pendentes: [],
  configs: [],
  turmaIdsOrquestra: new Set(),
  alunoIdsOrquestra: new Set(),
  rows: [],
  hinoAtual: null,
  revisoes: [],
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
  const resolvido = resolverInstrumentoComParte(nome);
  if (resolvido.instrumento) {
    const remoto = state.configs.find(config => config.key === resolvido.instrumento.key);
    return remoto || { ...resolvido.instrumento, nomeExibicao: resolvido.instrumento.nome, ordem: resolvido.instrumento.ordem };
  }
  const chave = normalizar(nome);
  return state.configs.find(config => [config.key, config.nome, config.nomeExibicao, ...(config.aliases || [])].filter(Boolean).map(normalizar).includes(chave)) || null;
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
  const selecionadas = colecoes.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => COLECOES_IMPRESSAO.has(normalizar(item.nome)));
  if (!selecionadas.length) throw new Error('As coleções “Hinos da Harpa” e “Músicas” não foram encontradas.');
  const listas = await Promise.all(selecionadas.map(async colecao => {
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
      return { id: item.id, colId: colecao.id, colecaoNome: colecao.nome, nome: data.nome || 'Documento sem nome', url: data.url || '', grupos };
    }));
  }));
  return listas.flat().sort((a, b) => a.colecaoNome.localeCompare(b.colecaoNome, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
}
async function carregarAlunos() {
  const snap = await getDocs(collection(db, 'alunos'));
  const pendentes = [];
  const alunos = snap.docs.map(item => ({ id: item.id, ...item.data() })).filter(aluno => aluno.ativo !== false && (state.turmaIdsOrquestra.has(aluno.turmaId) || state.alunoIdsOrquestra.has(aluno.id))).map(aluno => {
    const valor = aluno.instrumentoId || aluno.instrumento || '';
    let resolvido = resolverInstrumentoComParte(valor, aluno.instrumentoParte || '');
    // Em registros migrados, instrumentoId pode já ser o pai enquanto `instrumento`
    // ainda contém o rótulo antigo subdividido (por exemplo, “Trombone 01”).
    if (resolvido.instrumento && !resolvido.parte && aluno.instrumento && aluno.instrumento !== valor) {
      const legado = resolverInstrumentoComParte(aluno.instrumento, aluno.instrumentoParte || '');
      if (legado.instrumento?.key === resolvido.instrumento.key && legado.parte) resolvido = legado;
    }
    const config = resolvido.instrumento ? (state.configs.find(item => item.key === resolvido.instrumento.key) || resolvido.instrumento) : configParaGrupo(valor);
    if (!config) pendentes.push({ nome: aluno.nome || aluno.login || aluno.id, valor: valor || 'não informado' });
    return { ...aluno, instrumentoKey: config?.key || '', instrumentoNome: config?.nomeExibicao || config?.nome || '', instrumentoParte: resolvido.parte || '' };
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
    const resolvido = resolverInstrumentoComParte(grupo.nome);
    const config = resolvido.instrumento ? (state.configs.find(item => item.key === resolvido.instrumento.key) || resolvido.instrumento) : configParaGrupo(grupo.nome);
    const instrumentoKey = config?.key || `desconhecido:${normalizar(grupo.nome)}`;
    const parte = resolvido.instrumento ? resolvido.parte : '';
    const key = parte ? `${instrumentoKey}:parte:${parte}` : instrumentoKey;
    const nomePai = config?.nomeExibicao || config?.nome || grupo.nome;
    const nome = parte ? `${nomePai} ${parte}` : nomePai;
    const atual = porInstrumento.get(key) || { key, instrumentoKey, instrumentoNome: nomePai, parte, nome, paginas: [], grade: false, ordem: config?.ordem ?? 9999, desconhecido: !config };
    atual.paginas = [...new Set([...atual.paginas, ...paginas])].sort((a, b) => a - b);
    porInstrumento.set(key, atual);
  });
  const gruposPorPai = new Map();
  [...porInstrumento.values()].filter(row => !row.grade && row.instrumentoKey).forEach(row => {
    if (!gruposPorPai.has(row.instrumentoKey)) gruposPorPai.set(row.instrumentoKey, { geral: false, partes: new Set() });
    const grupos = gruposPorPai.get(row.instrumentoKey);
    if (row.parte) grupos.partes.add(row.parte); else grupos.geral = true;
  });

  const revisoes = [];
  const alunosSemGrupoNotificados = new Set();
  for (const aluno of state.alunos) {
    if (!aluno.instrumentoKey) continue;
    const grupos = gruposPorPai.get(aluno.instrumentoKey);
    if (!aluno.instrumentoParte && grupos?.partes.size) {
      revisoes.push(`${aluno.nome || aluno.login || aluno.id} — ${aluno.instrumentoNome}: sem parte cadastrada; não foi atribuído automaticamente às partes numeradas.`);
    } else if (aluno.instrumentoParte && (!grupos || (!grupos.geral && !grupos.partes.has(aluno.instrumentoParte))) && !alunosSemGrupoNotificados.has(aluno.id)) {
      revisoes.push(`${aluno.nome || aluno.login || aluno.id} — ${aluno.instrumentoNome} ${aluno.instrumentoParte}: a partitura não tem grupo correspondente.`);
      alunosSemGrupoNotificados.add(aluno.id);
    }
  }

  state.rows = [...porInstrumento.values()].sort((a, b) => a.ordem - b.ordem || a.instrumentoNome?.localeCompare(b.instrumentoNome, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR')).map(row => {
    if (row.grade) return { ...row, alunos: 0, copias: 1, incluir: true, origem: 'padrão: 1 cópia' };
    const correspondentes = state.alunos.filter(aluno => aluno.instrumentoKey === row.instrumentoKey && (row.parte ? aluno.instrumentoParte === row.parte : true));
    const alunos = correspondentes.length;
    const precisaRevisao = Boolean(row.parte && state.alunos.some(aluno => aluno.instrumentoKey === row.instrumentoKey && !aluno.instrumentoParte));
    return {
      ...row,
      alunos,
      copias: alunos,
      incluir: Boolean(row.parte || alunos),
      revisarParte: precisaRevisao,
      origem: precisaRevisao ? 'revisar parte' : alunos ? 'automático' : 'sem aluno'
    };
  });
  state.revisoes = revisoes;
}
function documentosVisiveis() {
  const termo = normalizar($('busca-documento')?.value || '');
  return state.hinos.map((hino, index) => ({ hino, index })).filter(({ hino }) => !termo || normalizar(`${hino.colecaoNome} ${hino.nome}`).includes(termo));
}
function preencherHinos() {
  const visiveis = documentosVisiveis();
  $('hino-select').innerHTML = '<option value="">— Selecione uma música ou hino —</option>' + visiveis.map(({ hino, index }) => `<option value="${index}">${escapar(hino.colecaoNome)} — ${escapar(hino.nome)}</option>`).join('');
  $('hino-select').disabled = false;
  const atualVisivel = visiveis.some(({ hino }) => hino.id === state.hinoAtual?.id && hino.colId === state.hinoAtual?.colId);
  if (atualVisivel) {
    const atual = visiveis.find(({ hino }) => hino.id === state.hinoAtual.id && hino.colId === state.hinoAtual.colId);
    $('hino-select').value = String(atual.index);
  } else if (state.hinoAtual) {
    state.hinoAtual = null;
    state.rows = [];
    state.revisoes = [];
    renderizarRevisoes();
    $('hino-meta').textContent = 'Músicas e hinos são carregados das coleções “Músicas” e “Hinos da Harpa”.';
    $('analysis-body').innerHTML = '<tr><td colspan="6" class="empty-cell">Selecione uma música ou hino para conferir as partes.</td></tr>';
    atualizarResumo();
  }
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
  const botaoGerar = $('generate-btn');
  if (botaoGerar) botaoGerar.disabled = !state.hinoAtual || !incluidas.length;
  if (!state.hinoAtual) { $('summary-lines').innerHTML = '<p>Selecione um hino para montar o resumo.</p>'; return; }
  $('summary-lines').innerHTML = incluidas.length ? incluidas.map(row => `<p><strong>${escapar(row.nome)}:</strong> ${row.copias} cópia${row.copias === 1 ? '' : 's'} × ${row.paginas.length} página${row.paginas.length === 1 ? '' : 's'} = ${row.copias * row.paginas.length} página${row.copias * row.paginas.length === 1 ? '' : 's'}</p>`).join('') : '<p>Nenhuma linha está configurada para inclusão.</p>';
}
function carregarScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca de PDF.'));
    document.head.appendChild(script);
  });
}
async function carregarPdfLib() {
  if (pdfLib) return pdfLib;
  await carregarScript(PDFLIB_CDN);
  pdfLib = window.PDFLib;
  if (!pdfLib?.PDFDocument) throw new Error('A biblioteca de PDF não foi inicializada.');
  return pdfLib;
}
function nomeSeguro(valor = '') {
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'hino';
}
function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function adicionarSeparador(pdf, texto, fonte) {
  const pagina = pdf.addPage([595.28, 841.89]);
  pagina.drawText(texto, { x: 52, y: 420, size: 24, font: fonte, maxWidth: 490 });
}
async function gerarPdfConsolidado() {
  const incluidas = state.rows.filter(row => row.incluir && row.copias > 0);
  if (!state.hinoAtual || !incluidas.length) return;
  const botao = $('generate-btn');
  botao.disabled = true;
  botao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando PDF...';
  try {
    setStatus('Preparando o PDF consolidado...');
    const { PDFDocument, StandardFonts } = await carregarPdfLib();
    const consolidado = await PDFDocument.create();
    consolidado.setTitle(`Impressão — ${state.hinoAtual.nome}`);
    consolidado.setAuthor('Orquestra Filhos de Asafe');
    const fonte = await consolidado.embedFont(StandardFonts.HelveticaBold);
    const fontes = new Map();
    const inserirSeparadores = $('insert-separators').checked;

    for (let i = 0; i < incluidas.length; i += 1) {
      const row = incluidas[i];
      if (inserirSeparadores) adicionarSeparador(consolidado, row.nome, fonte);
      if (!state.hinoAtual.url) throw new Error('Este hino não possui URL de PDF cadastrada.');
      let origem = fontes.get(state.hinoAtual.url);
      if (!origem) {
        const response = await fetch(state.hinoAtual.url);
        if (!response.ok) throw new Error(`Não foi possível baixar o PDF de “${state.hinoAtual.nome}”.`);
        origem = await PDFDocument.load(await response.arrayBuffer());
        fontes.set(state.hinoAtual.url, origem);
      }
      const paginasValidas = row.paginas.filter(pagina => pagina > 0 && pagina <= origem.getPageCount()).map(pagina => pagina - 1);
      if (!paginasValidas.length) continue;
      for (let copia = 0; copia < row.copias; copia += 1) {
        const paginas = await consolidado.copyPages(origem, paginasValidas);
        paginas.forEach(pagina => consolidado.addPage(pagina));
      }
      setStatus(`Instrumento ${i + 1} de ${incluidas.length} processado: ${row.nome}.`);
    }
    if (!consolidado.getPageCount()) throw new Error('Nenhuma página válida foi encontrada para gerar o PDF.');
    const bytes = await consolidado.save();
    baixarBlob(new Blob([bytes], { type: 'application/pdf' }), `Impressao_${nomeSeguro(state.hinoAtual.nome)}.pdf`);
    setStatus(`PDF gerado com ${consolidado.getPageCount()} página${consolidado.getPageCount() === 1 ? '' : 's'}.`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Não foi possível gerar o PDF consolidado.', true);
  } finally {
    botao.disabled = false;
    botao.innerHTML = '<i class="fas fa-file-pdf"></i> Gerar PDF consolidado';
    atualizarResumo();
  }
}
function renderizarTabela() {
  const corpo = $('analysis-body');
  if (!state.rows.length) { corpo.innerHTML = '<tr><td colspan="6" class="empty-cell">Este hino ainda não possui grupos de páginas analisados.</td></tr>'; atualizarResumo(); return; }
  const grade = state.rows.find(row => row.grade);
  $('include-grade').checked = Boolean(grade?.incluir);
  corpo.innerHTML = state.rows.map((row, index) => {
    const detalhes = row.grade ? 'Não depende da quantidade de alunos' : row.desconhecido ? 'Nome não encontrado no catálogo' : row.parte ? `Instrumento-pai: ${row.instrumentoNome} · parte ${row.parte}${row.revisarParte ? ' · revise alunos sem parte cadastrada' : ''}` : '';
    return `<tr class="${row.grade ? 'grade-row' : ''}"><td><input class="include-input" data-index="${index}" type="checkbox" ${row.incluir ? 'checked' : ''} aria-label="Incluir ${escapar(row.nome)}"></td><td><span class="instrument-name">${escapar(row.nome)}</span>${detalhes ? `<span class="instrument-sub">${escapar(detalhes)}</span>` : ''}</td><td>${row.paginas.length}</td><td>${row.grade ? '—' : row.alunos}</td><td><input class="copies-input" data-index="${index}" type="number" min="0" max="999" step="1" value="${row.copias}" aria-label="Cópias de ${escapar(row.nome)}"></td><td><span class="origin ${row.origem === 'manual' || row.origem === 'revisar parte' ? 'manual' : ''}">${escapar(row.origem)}</span></td></tr>`;
  }).join('');
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
  if (!state.hinoAtual) { state.rows = []; state.revisoes = []; renderizarRevisoes(); $('hino-meta').textContent = 'Músicas e hinos são carregados das coleções “Músicas” e “Hinos da Harpa”.'; $('analysis-body').innerHTML = '<tr><td colspan="6" class="empty-cell">Selecione uma música ou hino para conferir as partes.</td></tr>'; atualizarResumo(); return; }
  $('hino-meta').textContent = `${state.hinoAtual.colecaoNome} · ${state.hinoAtual.nome} · ${state.hinoAtual.grupos.filter(grupoUtil).length} grupo${state.hinoAtual.grupos.filter(grupoUtil).length === 1 ? '' : 's'} de páginas analisado${state.hinoAtual.grupos.filter(grupoUtil).length === 1 ? '' : 's'}.`;
  construirLinhas(state.hinoAtual); renderizarTabela(); renderizarRevisoes();
}
function renderizarPendentes() {
  const card = $('pending-card');
  if (!state.pendentes.length) { card.hidden = true; return; }
  card.hidden = false;
  $('pending-description').textContent = `${state.pendentes.length} aluno${state.pendentes.length === 1 ? '' : 's'} ativo${state.pendentes.length === 1 ? '' : 's'} da orquestra não entrou na contagem automática porque não possui instrumento válido.`;
  $('pending-list').innerHTML = state.pendentes.map(item => `<li>${escapar(item.nome)} — ${escapar(item.valor)}</li>`).join('');
}
function renderizarRevisoes() {
  const card = $('part-review-card');
  if (!card) return;
  if (!state.revisoes.length) { card.hidden = true; return; }
  card.hidden = false;
  $('part-review-description').textContent = `${state.revisoes.length} situação${state.revisoes.length === 1 ? '' : 'ões'} exige${state.revisoes.length === 1 ? '' : 'm'} conferência. Alunos sem parte não foram atribuídos a grupos numerados; ajuste as cópias manualmente quando necessário.`;
  $('part-review-list').innerHTML = state.revisoes.map(item => `<li>${escapar(item)}</li>`).join('');
}
async function carregar() {
  if (state.carregando) return;
  const hinoAnteriorId = state.hinoAtual?.id || '';
  state.carregando = true; $('refresh-btn').disabled = true; $('hino-select').disabled = true; setLoading('Carregando dados...', 'Lendo hinos, rótulos, turmas da orquestra e alunos ativos.'); setStatus('');
  try {
    const [remotos, hinos] = await Promise.all([carregarConfiguracoes(), carregarHinos()]);
    configurarCatalogo(remotos); state.hinos = hinos; await carregarTurmasOrquestra(); state.alunos = await carregarAlunos();
    preencherHinos(); renderizarPendentes(); setLoading('', '', false); setStatus(`${hinos.length} documento${hinos.length === 1 ? '' : 's'} disponível${hinos.length === 1 ? '' : 'eis'} nas coleções Músicas e Hinos da Harpa. A contagem considera somente a orquestra.`);
    const indiceAnterior = state.hinos.findIndex(hino => hino.id === hinoAnteriorId);
    if (indiceAnterior >= 0) { $('hino-select').value = String(indiceAnterior); selecionarHino(); }
  } catch (error) { console.error(error); setLoading('Não foi possível carregar a página.', 'Verifique a conexão e tente novamente.'); setStatus(error.message || 'Falha ao carregar os dados.', true); }
  finally { state.carregando = false; $('refresh-btn').disabled = false; }
}

if (exigirProfessor()) {
  $('hino-select').addEventListener('change', selecionarHino);
  $('busca-documento').addEventListener('input', preencherHinos);
  $('refresh-btn').addEventListener('click', carregar);
  $('generate-btn').addEventListener('click', gerarPdfConsolidado);
  $('include-grade').addEventListener('change', event => { const grade = state.rows.find(row => row.grade); if (grade) { grade.incluir = event.target.checked; renderizarTabela(); } });
  carregar();
}
