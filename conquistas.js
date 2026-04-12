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
    icone: "🎖️",
    descricao: "Compareceu a todos os ensaios do mês.",
    regraLogica: "Frequência mensal >= 100%",
    raridade: "ouro",
    condicao: (aluno) => aluno.frequenciaMensal?.percentual >= 100
  },
  {
    id: "leitor_dedicado",
    titulo: "Leitor Dedicado",
    icone: "📘",
    descricao: "Atingiu alto desempenho em leitura musical.",
    regraLogica: "Nível de leitura >= 60",
    raridade: "prata",
    condicao: (aluno) => aluno.leitura >= 50
  },
  {
    id: "musico_pontual",
    titulo: "Músico Pontual",
    icone: "🎯",
    descricao: "Manteve presença consistente nos ensaios.",
    regraLogica: "Frequência mensal >= 80%",
    raridade: "prata",
    condicao: (aluno) => aluno.frequenciaMensal?.percentual >= 80
  },
  {
    id: "evolucao_constante",
    titulo: "Evolução Constante",
    icone: "🔥",
    descricao: "Somou 100 pontos ou mais entre leitura e método.",
    regraLogica: "(Leitura + Método) >= 100",
    raridade: "ouro",
    condicao: (aluno) => (aluno.leitura + aluno.metodo) >= 100
  },
  {
    id: "veterano_palco",
    titulo: "Veterano de Palco",
    icone: "🎤",
    descricao: "Participou de mais de 20 apresentações.",
    regraLogica: "Frequência total >= 20 ensaios",
    raridade: "ouro",
    condicao: (aluno) => aluno.frequenciaTotal >= 20
  },
  {
    id: "lider",
    titulo: "Líder",
    icone: "👔",
    descricao: "Demonstrou liderança e comprometimento exemplar.",
    regraLogica: "Classificado como líder pelo maestro",
    raridade: "lendario",
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
    
    // Criar card de conquista
    const card = document.createElement("div");
    card.classList.add("achievement-card");
    card.classList.add(desbloqueado ? "desbloqueado" : "bloqueado");

    // Ícone
    const icone = document.createElement("div");
    icone.classList.add("achievement-icon");
    icone.textContent = desbloqueado ? c.icone : "🔒";

    // Nome da conquista
    const nome = document.createElement("div");
    nome.classList.add("achievement-name");
    nome.textContent = c.titulo;

    card.appendChild(icone);
    card.appendChild(nome);

    // Adicionar evento de clique para abrir modal
    if (desbloqueado) {
      card.addEventListener("click", () => {
        abrirPopupConquista(
          c.icone,
          c.titulo,
          c.descricao || "Conquista desbloqueada!",
          [], // Detalhes vazios
          c.raridade,
          c.regraLogica || c.descricao // Regra lógica
        );
      });
    } else {
      card.addEventListener("click", () => {
        abrirPopupConquista(
          "🔒",
          c.titulo,
          "Continue progredindo para desbloquear esta conquista!",
          [],
          c.raridade,
          c.regraLogica || "Condição não especificada" // Regra lógica
        );
      });
    }

    elementoAlvo.appendChild(card);
  });
}


// --------------------------------------
// 🔧 Funções auxiliares para uso global
// --------------------------------------

// Função auxiliar para definir texto de forma segura
function safeSet(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Função auxiliar para definir HTML de forma segura
function safeHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Mapa de conquistas para acesso rápido por ID
export const mapaConquistas = {};
regrasDeConquistas.forEach(c => {
  mapaConquistas[c.id] = c;
});

// --------------------------------------
// 📦 Funções de popup de conquistas
// --------------------------------------

export function abrirPopupConquista(icone, titulo, descricao, detalhes, raridade = 'bronze', condicao = null, progresso = null) {
  console.log('🔍 Abrindo popup de conquista:', titulo);
  const popup = document.getElementById('popupConquista');
  if (!popup) {
    console.error('❌ Modal de conquista não encontrado!');
    return;
  }

  // Preencher símbolo
  safeSet('conquistaIconeModal', icone || '🏆');
  
  // Preencher nome
  safeSet('conquistaNomeModal', titulo || 'Conquista');
  
  // Preencher nível (baseado na raridade)
  const niveis = {
    'ouro': 'Ouro 🥇',
    'prata': 'Prata 🥈',
    'bronze': 'Bronze 🥉',
    'lendario': 'Lendário 💎'
  };
  safeSet('conquistaNivelModal', niveis[raridade] || 'Nível 1');
  
  // Preencher descrição
  safeSet('conquistaDescricaoModal', descricao || 'Descrição não disponível.');
  
  // Preencher condição
  if (condicao) {
    safeSet('conquistaCondicaoModal', condicao);
  } else {
    // Usar descrição como condição se não fornecida
    safeSet('conquistaCondicaoModal', descricao || 'Condição não especificada.');
  }
  
  // Mostrar/ocultar seção de progresso
  const progressoSection = document.getElementById('conquistaProgressoSection');
  if (progresso && progressoSection) {
    progressoSection.style.display = 'block';
    
    const progressoFill = document.getElementById('conquistaProgressoFill');
    const progressoText = document.getElementById('conquistaProgressoText');
    
    if (progressoFill) {
      progressoFill.style.width = `${progresso.porcentagem}%`;
    }
    if (progressoText) {
      progressoText.textContent = `${progresso.atual} / ${progresso.total}`;
    }
  } else if (progressoSection) {
    progressoSection.style.display = 'none';
  }

  // Mostrar modal
  popup.style.display = 'flex';
  popup.classList.add('active');
}

export function fecharPopupConquista() {
  const popup = document.getElementById('popupConquista');
  if (popup) {
    popup.style.display = 'none';
    popup.classList.remove('active');
    console.log('✅ Popup de conquista fechado.');
  }
}
