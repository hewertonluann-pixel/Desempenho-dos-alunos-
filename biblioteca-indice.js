import { resolverInstrumento, resolverInstrumentoComParte, normalizarInstrumento } from './instrumentos-catalogo.js';

export const INDICE_PARTITURAS = 'biblioteca_partituras_instrumentos';
export const VERSAO_INDICE_PARTITURAS = 2;

function ehGrade(grupo) {
  const nome = normalizarInstrumento(grupo?.nome || '');
  const tipo = normalizarInstrumento(grupo?.tipo || '');
  return tipo === 'grade' || nome === 'grade' || nome.includes('partitura geral') || nome === 'full score' || nome === 'orchestral score' || nome === 'conductor score';
}

function aliasesDaConfiguracao(config = {}) {
  return [config.key, config.nome, config.nomeExibicao, ...(Array.isArray(config.aliases) ? config.aliases : [])]
    .filter(Boolean).map(normalizarInstrumento);
}

function resolverComConfiguracao(nome, configuracoes = []) {
  const resolvido = resolverInstrumentoComParte(nome);
  if (resolvido.instrumento) {
    return {
      key: resolvido.instrumento.key,
      nome: resolvido.instrumento.nome,
      ordem: resolvido.instrumento.ordem,
      parte: resolvido.parte
    };
  }

  const alvo = normalizarInstrumento(nome);
  let configuracao = configuracoes.find(item => aliasesDaConfiguracao(item).includes(alvo));
  let parte = '';
  if (!configuracao) {
    const correspondencia = alvo.match(/^(\d{1,2}|i{1,3}|iv|v|vi{0,3}|ix|x)\s+(.+)$/)
      || alvo.match(/^(.+?)\s+(\d{1,2}|i{1,3}|iv|v|vi{0,3}|ix|x)$/);
    if (correspondencia) {
      const prefixo = /^\d|^i{1,3}$|^iv$|^v$|^vi{0,3}$|^ix$|^x$/.test(correspondencia[1]);
      const token = correspondencia[prefixo ? 1 : 2];
      const nomeBase = correspondencia[prefixo ? 2 : 1];
      const roman = new Map([['i','1'],['ii','2'],['iii','3'],['iv','4'],['v','5'],['vi','6'],['vii','7'],['viii','8'],['ix','9'],['x','10']]);
      parte = roman.get(token) || (/^\d{1,2}$/.test(token) && Number(token) > 0 ? String(Number(token)) : '');
      configuracao = configuracoes.find(item => aliasesDaConfiguracao(item).includes(nomeBase));
    }
  }
  if (!configuracao) {
    const canonico = resolverInstrumento(nome);
    return canonico ? { key: canonico.key, nome: canonico.nome, ordem: canonico.ordem, parte: '' } : null;
  }
  return {
    key: configuracao.key || configuracao.id || alvo,
    nome: (configuracao.key || configuracao.id) === 'souzafone' ? 'Sousafone' : configuracao.nomeExibicao || configuracao.nome || nome,
    ordem: configuracao.ordem ?? 9999,
    parte
  };
}

export function gruposValidosParaIndice(grupos = [], configuracoes = []) {
  return grupos.filter(grupo => {
    const paginas = Array.isArray(grupo?.paginas) ? grupo.paginas.map(Number).filter(Number.isFinite) : [];
    const ehInstrumentoReconhecido = Boolean(resolverComConfiguracao(grupo?.nome, configuracoes));
    return paginas.length > 0 && (!ehGrade(grupo) || ehInstrumentoReconhecido)
      && normalizarInstrumento(grupo?.tipo || '') !== 'desconhecido'
      && !/^pagina\s+\d+\s+revisar$/.test(normalizarInstrumento(grupo?.nome || ''))
      && ehInstrumentoReconhecido;
  });
}

export function registrosDeIndice({ colId, colecao, documentoId, nome, url, grupos = [], configuracoes = [] }) {
  const porInstrumento = new Map();
  gruposValidosParaIndice(grupos, configuracoes).forEach(grupo => {
    const instrumento = resolverComConfiguracao(grupo.nome, configuracoes);
    if (!instrumento) return;
    const paginas = [...new Set(grupo.paginas.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    const atual = porInstrumento.get(instrumento.key) || { instrumento, paginas: [], partes: new Map() };
    atual.paginas = [...new Set([...atual.paginas, ...paginas])].sort((a, b) => a - b);
    const chaveParte = instrumento.parte || '';
    const atualParte = atual.partes.get(chaveParte) || {
      parte: chaveParte,
      nome: chaveParte ? `${instrumento.nome} ${chaveParte}` : instrumento.nome,
      rotulos: [],
      paginas: []
    };
    atualParte.rotulos = [...new Set([...atualParte.rotulos, String(grupo.nome || '').trim()])];
    atualParte.paginas = [...new Set([...atualParte.paginas, ...paginas])].sort((a, b) => a - b);
    atual.partes.set(chaveParte, atualParte);
    porInstrumento.set(instrumento.key, atual);
  });

  return [...porInstrumento.values()].map(({ instrumento, paginas, partes }) => ({
    id: `${instrumento.key}__${colId}__${documentoId}`,
    instrumentoKey: instrumento.key,
    instrumentoNome: instrumento.nome,
    ordemInstrumento: instrumento.ordem,
    colecaoId: colId,
    colecaoNome: colecao,
    documentoId,
    nome,
    url: url || '',
    paginas,
    partes: [...partes.values()].sort((a, b) => Number(a.parte || 0) - Number(b.parte || 0)),
    tipo: 'instrumento',
    indiceVersao: VERSAO_INDICE_PARTITURAS,
    origem: 'biblioteca_rotulos'
  }));
}
