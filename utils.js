/**
 * Retorna a data atual no fuso horário de Brasília (GMT-3) no formato ISO (YYYY-MM-DD).
 * Esta função garante que, mesmo após as 21:00 UTC, a data correta de Brasília seja mantida.
 */
export function hojeISO() {
  const agora = new Date();
  const brasilia = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(agora);
  
  // O formato retornado por Intl é DD/MM/YYYY, precisamos converter para YYYY-MM-DD
  const [dia, mes, ano] = brasilia.split('/');
  return `${ano}-${mes}-${dia}`;
}
