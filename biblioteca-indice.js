import { resolverInstrumento, normalizarInstrumento } from './instrumentos-catalogo.js';

export const INDICE_PARTITURAS = 'biblioteca_partituras_instrumentos';
export const VERSAO_INDICE_PARTITURAS = 1;

function ehGrade(grupo) {
  const nome = normalizarInstrumento(grupo?.nome || '');
  const tipo = normalizarInstrumento(grupo?.tipo || '');
  return tipo === 'grade' || nome === 'grade' || nome.includes('partitura geral') || nome === 'full score' || nome === 'orchestral score' || nome === 'conductor score';
}

function aliasesDaConfiguracao(config = {}) {
  return [config.key, config.nome, config.nomeExibicao, ...(Array.isArray(config.aliases) ? config.aliases : [])].filter(Boolean).map(normalizarInstrumento);
}

function resolverComConfiguracao(nome, configuracoes = []) {
  const alvo = normalizarInstrumento(nome);
  const configuracao = configuracoes.find(item => aliasesDaConfiguracao(item).includes(alvo));
  if (configuracao) return {
    key: configuracao.key || configuracao.id || alvo,
    nome: configuracao.nomeExibicao || configuracao.nome || nome,
    ordem: configuracao.ordem ?? 9999
  };
  const canonico = resolverInstrumento(nome);
  return canonico ? { key: canonico.key, nome: canonico.nome, ordem: canonico.ordem } : null;
}

export function gruposValidosParaIndice(grupos = [], configuracoes = []) {
  return grupos.filter(grupo => {
    const paginas = Array.isArray(grupo?.paginas) ? grupo.paginas.map(Number).filter(Number.isFinite) : [];
    // Uma grade detectada automaticamente pode ser renomeada pelo professor
    // para um instrumento (por exemplo, “GRADE” -> “Souzafone”). Nesse caso,
    // o nome canônico prevalece sobre o tipo antigo salvo no grupo.
    const ehInstrumentoReconhecido = Boolean(resolverComConfiguracao(grupo?.nome, configuracoes));
    return paginas.length > 0 && (!ehGrade(grupo) || ehInstrumentoReconhecido) && normalizarInstrumento(grupo?.tipo || '') !== 'desconhecido' && !/^pagina\s+\d+\s+revisar$/.test(normalizarInstrumento(grupo?.nome || '')) && ehInstrumentoReconhecido;
  });
}

export function registrosDeIndice({ colId, colecao, documentoId, nome, url, grupos = [], configuracoes = [] }) {
  const porInstrumento = new Map();
  gruposValidosParaIndice(grupos, configuracoes).forEach(grupo => {
    const instrumento = resolverComConfiguracao(grupo.nome, configuracoes);
    if (!instrumento) return;
    const paginas = [...new Set(grupo.paginas.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    const atual = porInstrumento.get(instrumento.key) || { instrumento, paginas: [] };
    atual.paginas = [...new Set([...atual.paginas, ...paginas])].sort((a, b) => a - b);
    porInstrumento.set(instrumento.key, atual);
  });
  return [...porInstrumento.values()].map(({ instrumento, paginas }) => ({
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
    tipo: 'instrumento',
    indiceVersao: VERSAO_INDICE_PARTITURAS,
    origem: 'biblioteca_rotulos'
  }));
}
