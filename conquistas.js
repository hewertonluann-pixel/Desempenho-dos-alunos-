// conquistas.js
// --------------------------------------
// Sistema modular de conquistas do painel do aluno com contador animado
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
    id: "lider",
    titulo: "Líder",
    icone: "🧑‍🏫",
    descricao: "Reconhecido como professor ou líder de bancada.",
    raridade: "ouro",
    condicao: (aluno) => aluno.classificado === true
  }
];

// --------------------------------------
// 🔧 Gera o painel com contador visual e animação
// --------------------------------------

export function gerarPainelConquistas(aluno, elementoAlvo) {
  if (!elementoAlvo) return;
  elementoAlvo.innerHTML = "";

  regrasDeConquistas.forEach((c) => {
    const desbloqueado = c.condicao(aluno);
    const vezes = aluno.conquistas?.[c.id] || 0;

    // Contêiner principal
    const slot = document.createElement("div");
    slot.classList.add("slot");
    if (desbloqueado) slot.classList.add("desbloqueado");

    // Ícone visual
    const icone = document.createElement("span");
    icone.classList.add("icone");
    icone.textContent = desbloqueado ? c.icone : "🔒";
    slot.appendChild(icone);

    // Contador (se > 1)
    if (desbloqueado && vezes > 1) {
      const contador = document.createElement("span");
      contador.classList.add("contador");

      // Se o contador é novo ou aumentou, adiciona classe de animação
      if (aluno.novosNiveis && aluno.novosNiveis.includes(c.id)) {
        contador.classList.add("animar");
      }

      contador.textContent = `x${vezes}`;
      slot.appendChild(contador);
    }

    // Tooltip
    slot.title = c.titulo + (c.descricao ? " — " + c.descricao : "");
    elementoAlvo.appendChild(slot);
  });
}
