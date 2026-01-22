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
    condicao: (aluno) => (aluno.frequenciaMensal && aluno.frequenciaMensal.porcentagem >= 100)
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
    condicao: (aluno) => (aluno.frequenciaMensal && aluno.frequenciaMensal.porcentagem >= 80)
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
  // Debug: Imprime a key e verifica se existe
  console.log(`Tentando abrir pop-up para conquista: "${key}"`);
  
  const conquista = mapaConquistas[key];
  if (!conquista) {
    console.error(`Conquista "${key}" não encontrada no mapa. Verifique o onclick ou dados do aluno.`);
    alert(`Erro: Conquista "${key}" indefinida. Contate administrador.`);
    return;
  }

  // Debug: Confirma que conquista foi encontrada
  console.log(`Conquista encontrada: ${conquista.titulo}`);

  // Verifica se elementos DOM existem
  const tituloEl = document.getElementById("conquistaTitulo");
  const iconeEl = document.getElementById("conquistaIcone");
  const descEl = document.getElementById("conquistaDescricao");
  const ulEl = document.getElementById("conquistaDetalhes");

  if (!tituloEl || !iconeEl || !descEl || !ulEl) {
    console.error("Elementos DOM do pop-up de conquistas não encontrados. Verifique carregamento do HTML.");
    alert("Erro interno: Elementos do pop-up não carregados.");
    return;
  }

  // Preenche os elementos
  tituloEl.textContent = conquista.titulo;
  iconeEl.textContent = conquista.icone;
  descEl.textContent = conquista.descricao;

  ulEl.innerHTML = "";
  conquista.detalhes.forEach(detalhe => {
    const li = document.createElement("li");
    li.textContent = detalhe;
    ulEl.appendChild(li);
  });

  // Abre o modal
  document.getElementById("popupConquista").style.display = "flex";
};

export const fecharPopupConquista = () => {
  document.getElementById("popupConquista").style.display = "none";
};

// --------------------------------------
// 🔧 Função de Renderização
// --------------------------------------

export function gerarPainelConquistas(aluno, elementoAlvo) {
  // Debug: Imprime dados do aluno para verificar
  console.log("Dados do aluno para conquistas:", aluno);
  
  if (!elementoAlvo) {
    console.error("Elemento alvo para conquistas não fornecido.");
    return;
  }
  elementoAlvo.innerHTML = "";

  // 1. Calcular as conquistas desbloqueadas
  const conquistasDesbloqueadas = [];
  
  for (const key in mapaConquistas) {
    const conquista = mapaConquistas[key];
    // Verifica se condição é atendida (com fallback seguro)
    if (conquista.condicao && conquista.condicao(aluno)) {
      conquistasDesbloqueadas.push({
        key: key,
        ...conquista,
        nivel: 1 // Assumindo nível 1
      });
    }
  }

  console.log(`Conquistas desbloqueadas: ${conquistasDesbloqueadas.map(c => c.titulo).join(", ") || "Nenhuma"}`);

  // 2. Renderizar os cards
  conquistasDesbloqueadas.forEach(info => {
    const card = document.createElement("div");
    card.className = `achievement-card ${info.raridade}`;
    card.setAttribute("onclick", `window.abrirPopupConquista('${info.key}')`); // Melhoria: força window. para compatibilidade
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
