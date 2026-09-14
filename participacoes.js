// Regras de participação para o fluxo principal da Orquestra.
// O Coral não utiliza este módulo nesta fase.

export function normalizarDataISO(valor) {
  if (!valor) return null;
  const texto = String(valor);
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return null;
  return data.toISOString().slice(0, 10);
}

export function criarParticipacaoPrincipal(turmaId, turmaNome, inicioEm, fimEm = null) {
  return {
    turmaId: turmaId || "",
    tipo: "principal",
    turmaNome: turmaNome || "",
    inicioEm: normalizarDataISO(inicioEm) || normalizarDataISO(new Date()),
    fimEm: normalizarDataISO(fimEm)
  };
}

export function obterParticipacoesAluno(aluno, turmaId) {
  if (!aluno || !turmaId) return [];
  const participacoes = Array.isArray(aluno.participacoes) ? aluno.participacoes : [];
  const atuais = participacoes.filter(p => p && p.turmaId === turmaId);
  if (atuais.length) return atuais;

  // Compatibilidade com alunos antigos ainda sem participacoes[].
  if (aluno.turmaId === turmaId) {
    return [criarParticipacaoPrincipal(
      turmaId,
      aluno.turmaNome,
      aluno.criadoEm || new Date(0).toISOString()
    )];
  }
  return [];
}

export function alunoParticipaNaData(aluno, turmaId, dataISO) {
  const data = normalizarDataISO(dataISO);
  if (!data) return false;
  return obterParticipacoesAluno(aluno, turmaId).some(p => {
    const inicio = normalizarDataISO(p.inicioEm) || "0000-01-01";
    const fim = normalizarDataISO(p.fimEm);
    return data >= inicio && (!fim || data <= fim);
  });
}

export function chamadaElegivelParaAluno(evento, aluno, turmaId) {
  if (!evento || !aluno || !turmaId) return false;
  if (evento.turmaId !== turmaId) return false;
  if (!alunoParticipaNaData(aluno, turmaId, evento.data)) return false;
  return Array.isArray(evento.presencas) && evento.presencas.some(p =>
    p && ((p.alunoId && p.alunoId === aluno.id) || p.nome === aluno.nome)
  );
}

export function obterChamadasElegiveis(eventos, aluno, turmaId) {
  return (eventos || []).filter(evento => chamadaElegivelParaAluno(evento, aluno, turmaId));
}

export function calcularFrequenciaElegivel(eventos, aluno, turmaId) {
  const chamadas = obterChamadasElegiveis(eventos, aluno, turmaId);
  let presencas = 0;
  let ausencias = 0;
  let justificadas = 0;
  chamadas.forEach(evento => {
    const registro = evento.presencas.find(p =>
      (p.alunoId && p.alunoId === aluno.id) || p.nome === aluno.nome
    );
    const status = registro?.presenca;
    if (status === "presente" || status === "P") presencas++;
    else if (status === "justificado" || status === "J") justificadas++;
    else ausencias++;
  });
  const totalAvaliadas = presencas + ausencias;
  return {
    totalEventos: chamadas.length,
    total: chamadas.length,
    totalAvaliadas,
    presencas,
    presencasAluno: presencas,
    ausencias,
    justificadas,
    percentual: totalAvaliadas ? Math.round((presencas / totalAvaliadas) * 100) : null,
    avaliavel: chamadas.length > 0
  };
}

export function mediaFrequenciasValidas(registros) {
  const validas = (registros || []).filter(r => r && r.avaliavel && r.percentual !== null);
  return validas.length
    ? validas.reduce((soma, r) => soma + r.percentual, 0) / validas.length
    : null;
}
