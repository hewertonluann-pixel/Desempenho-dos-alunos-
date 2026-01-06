// conquistas.js
// --------------------------------------
// Sistema modular de conquistas do painel do aluno
// --------------------------------------

// 🏆 Mapa de Conquistas (Regras e Detalhes)
export const mapaConquistas = {
  presenca_perfeita: {
    icone: "🎖️",
    titulo: "Presença Perfeita",
    raridade: "ouro",
    descricao: "Concedida a quem comparece a 100% dos ensaios do mês.",
    detalhes: ["Não faltar nenhum ensaio.", "Compromisso e constância exemplar.", "Atualizada mensalmente."],
    condicao: (aluno) => aluno.frequenciaMensal?.porcentagem >= 100
  },
  leitor_dedicado: {
    icone: "📘",
    titulo: "Leitor Dedicado",
    raridade: "prata",
    descricao: "Atingida por alunos com Leitura ≥ 50 pontos.",
    detalhes: ["Estudo contínuo da leitura musical (BONA).", "Requer evolução técnica constante.", "Indicador de boa leitura rítmica e melódica."],
    condicao: (aluno) => aluno.leitura >= 50
  },
  musico_pontual: {
    icone: "🎯",
    titulo: "Músico Esforçado",
    raridade: "prata",
    descricao: "Obtida com frequência mensal acima de 80%.",
    detalhes: ["Comparecer na maioria dos ensaios.", "Evitar faltas repetidas.", "Reflete disciplina e responsabilidade."],
    condicao: (aluno) => aluno.frequenciaMensal?.porcentagem >= 80
  },
  evolucao_constante: {
    icone: "🔥",
    titulo: "Evolução Constante",
    raridade: "ouro",
    descricao: "Conquistada quando Leitura + Método ≥ 100 pontos.",
    detalhes: ["Avanço equilibrado nas duas áreas.", "Indicador de estudo consistente.", "Mostra domínio progressivo."],
    condicao: (aluno) => (aluno.leitura + aluno.metodo) >= 100
  },
  veterano_palco: {
    icone: "🎤",
    titulo: "Veterano de Palco",
    raridade: "ouro",
    descricao: "Para quem participou de 20 ou mais apresentações.",
    detalhes: ["Experiência em eventos oficiais.", "Presença em oportunidades musicais.", "Confiança no palco."],
    condicao: (aluno) => aluno.frequenciaTotal >= 20
  },
  lider: {
    icone: "🧑‍🏫",
    titulo: "Líder",
    raridade: "lendaria",
    descricao: "Conquista atribuída pelo professor ao aluno que demonstra postura de liderança.",
    detalhes: ["Líder de naipe / monitor / auxiliar.", "Critério: maturidade, cooperação e exemplo.", "Não é automática — depende do professor."],
    condicao: (aluno) => aluno.classificado === true
  },
};

// --------------------------------------
// 🔧 Funções de Pop-up
// --------------------------------------

export const abrirPopupConquista = (key) => {
  const conquista = mapaConquistas[key];
  console.log('🔍 Tentando abrir pop-up para a chave:', key);
  console.log('🔍 Conquista encontrada:', conquista);
  if (!conquista) return;

  document.getElementById("conquistaTitulo").textContent = conquista.titulo;
  document.getElementById("conquistaIcone").textContent = conquista.icone;
  document.getElementById("conquistaDescricao").textContent = conquista.descricao;

  const ul = document.getElementById("conquistaDetalhes");
  ul.innerHTML = "";
  conquista.detalhes.forEach(detalhe => {
    const li = document.createElement("li");
    li.textContent = detalhe;
    ul.appendChild(li);
  });

  document.getElementById("popupConquista").style.display = "flex";
};

export const fecharPopupConquista = () => {
  document.getElementById("popupConquista").style.display = "none";
};

// --------------------------------------
// 🔧 Função de Renderização
// --------------------------------------

export function gerarPainelConquistas(aluno, elementoAlvo) {
  if (!elementoAlvo) return;
  elementoAlvo.innerHTML = "";

  // 1. Calcular as conquistas desbloqueadas
  const conquistasDesbloqueadas = [];
  
  for (const key in mapaConquistas) {
    const conquista = mapaConquistas[key];
    // Simplificação: se a condição for atendida, a conquista é desbloqueada (nível 1)
    if (conquista.condicao(aluno)) {
      conquistasDesbloqueadas.push({
        key: key,
        ...conquista,
        nivel: 1 // Assumindo nível 1 para simplificar
      });
    }
  }

  // 2. Renderizar os cards
  conquistasDesbloqueadas.forEach(info => {
    const card = document.createElement("div");
    card.className = `achievement-card ${info.raridade}`;
    card.setAttribute("onclick", `abrirPopupConquista(\'${info.key}\')`);
    card.innerHTML = `
      <span class="achievement-icon">${info.icone}</span>
      <span class="achievement-name">${info.titulo}</span>
      ${info.nivel > 1 ? `<span class="achievement-count">x${info.nivel}</span>` : ''}
    `;
    elementoAlvo.appendChild(card);
  });
  
  // Se não houver conquistas, exibe uma mensagem
  if (conquistasDesbloqueadas.length === 0) {
    elementoAlvo.innerHTML = "<p style='text-align: center; color: #aaa;'>Nenhuma conquista desbloqueada ainda. Continue estudando!</p>";
  }
}
