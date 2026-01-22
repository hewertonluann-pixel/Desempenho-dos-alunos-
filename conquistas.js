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
  console.log(`🔍 Tentando abrir popup de conquista para key: ${key}`); // Debug - remova após testar

  if (!key || typeof key !== 'string') {
    console.error(`🚫 Key undefined ou inválida: ${key}. Verifique renderização dos cards.`);
    alert('Erro: Conquista indefinida. Verifique dados.');
    return;
  }

  const conquista = mapaConquistas[key];
  if (!conquista) {
    console.error(`🚫 Conquista com key "${key}" não encontrada no mapa.`);
    alert(`Erro: Conquista "${key}" não encontrada.`);
    return;
  }

  // Verifica elementos DOM
  const tituloEl = document.getElementById("conquistaTitulo");
  const iconeEl = document.getElementById("conquistaIcone");
  const descEl = document.getElementById("conquistaDescricao");
  const ulEl = document.getElementById("conquistaDetalhes");
  const popupEl = document.getElementById("popupConquista");

  if (!tituloEl || !iconeEl || !descEl || !ulEl || !popupEl) {
    console.error("🚫 Elementos DOM do pop-up não encontrados. Verifique HTML.");
    alert("Erro interno: Pop-up não carregou.");
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

  popupEl.style.display = "flex";
};

export const fecharPopupConquista = () => {
  const popupEl = document.getElementById("popupConquista");
  if (popupEl) popupEl.style.display = "none";
  console.log("✅ Popup de conquista fechado.");
};

// --------------------------------------
// 🔧 Função de Renderização
// --------------------------------------

export function gerarPainelConquistas(aluno, elementoAlvo) {
  console.log("📊 Gerando painel de conquistas para aluno:", aluno); // Debug

  if (!elementoAlvo || !aluno) {
    console.error("🚫 Elemento alvo ou aluno não fornecido.");
    return;
  }
  elementoAlvo.innerHTML = "";

  const conquistasDesbloqueadas = [];
  for (const key in mapaConquistas) {
    const conquista = mapaConquistas[key];
    if (conquista.condicao && conquista.condicao(aluno)) {
      conquistasDesbloqueadas.push({
        key: key,
        ...conquista,
        nivel: 1
      });
    }
  }

  console.log("🏆 Conquistas desbloqueadas:", conquistasDesbloqueadas.map(c => c.titulo));

  conquistasDesbloqueadas.forEach(info => {
    if (!info.key) {
      console.warn("⚠️ Key ausente para conquista:", info);
      return;
    }

    const card = document.createElement("div");
    card.className = `achievement-card ${info.raridade}`;

    // 🔥 Solução: Use addEventListener em vez de onclick inline
    card.addEventListener("click", () => {
      abrirPopupConquista(info.key);
    });

    card.innerHTML = `
      <span class="achievement-icon">${info.icone}</span>
      <span class="achievement-name">${info.titulo}</span>
      ${info.nivel > 1 ? `<span class="achievement-count">x${info.nivel}</span>` : ''}
    `;
    elementoAlvo.appendChild(card);
  });

  if (conquistasDesbloqueadas.length === 0) {
    elementoAlvo.innerHTML = "<p style='text-align: center; color: #aaa;'>Nenhuma conquista desbloqueada ainda. Continue estudando!</p>";
  }
}
