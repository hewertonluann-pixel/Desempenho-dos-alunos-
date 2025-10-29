// conquistas.js
// --------------------------------------
// Sistema modular de conquistas do painel do aluno
// --------------------------------------

// 🏆 Cada conquista tem:
// id → identificador único (não muda)
// titulo → nome exibido
// icone → emoji ou ícone visual
// descricao → texto explicativo (opcional, útil para tooltips)
// condicao → função que retorna true/false com base nos dados do aluno
// raridade → nível de dificuldade (para uso futuro)
// --------------------------------------

export const regrasDeConquistas = [
  {
    id: "presenca_perfeita",
    titulo: "Presença Perfeita",
    icone: "⭐",
    descricao: "Compareceu a todos os ensaios do mês.",
    raridade: "ouro",
    condicao: (aluno) => aluno.frequenciaMensal?.porcentagem >= 100
  },
  {
    id: "leitor_dedicado",
    titulo: "Leitor Dedicado",
    icone: "📘",
    descricao: "Atingiu alto desempenho em leitura musical.",
    raridade: "prata",
    condicao: (aluno) => aluno.leitura >= 50
  },
  {
    id: "musico_pontual",
    titulo: "Músico Pontual",
    icone: "🎯",
    descricao: "Manteve presença consistente nos ensaios.",
    raridade: "prata",
    condicao: (aluno) => aluno.frequenciaMensal?.porcentagem >= 80
  },
  {
    id: "evolucao_constante",
    titulo: "Evolução Constante",
    icone: "🔥",
    descricao: "Somou 100 pontos ou mais entre leitura e método.",
    raridade: "ouro",
    condicao: (aluno) => (aluno.leitura + aluno.metodo) >= 100
  },
  {
    id: "veterano_palco",
    titulo: "Veterano de Palco",
    icone: "🎤",
    descricao: "Participou de mais de 20 apresentações.",
    raridade: "ouro",
    condicao: (aluno) => aluno.frequenciaTotal >= 20
  },
  {
    id: "espirito_grupo",
    titulo: "Espírito de Grupo",
    icone: "🤝",
    descricao: "Demonstrou comprometimento e colaboração.",
    raridade: "bronze",
    condicao: (aluno) => aluno.classificado === true
  }
];

// --------------------------------------
// 🔧 Função utilitária (opcional)
// Para uso futuro: gera o painel automaticamente com base na lista acima.
// --------------------------------------

export function gerarPainelConquistas(aluno, elementoAlvo) {
  if (!elementoAlvo) return;

  elementoAlvo.innerHTML = "";

  regrasDeConquistas.forEach((c) => {
    const desbloqueado = c.condicao(aluno);
    const slot = document.createElement("div");
    slot.classList.add("slot");
    if (desbloqueado) slot.classList.add("desbloqueado");

    // Mostra o ícone ou um marcador de bloqueado
    slot.textContent = desbloqueado ? c.icone : "🔒";

    // Tooltip simples com o título
    slot.title = c.titulo + (c.descricao ? " — " + c.descricao : "");
    elementoAlvo.appendChild(slot);
  });
}
