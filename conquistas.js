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
          [
            `Raridade: ${c.raridade.toUpperCase()}`,
            `Status: Desbloqueada ✅`
          ]
        );
      });
    } else {
      card.addEventListener("click", () => {
        abrirPopupConquista(
          "🔒",
          c.titulo,
          c.descricao || "Continue progredindo para desbloquear esta conquista!",
          [
            `Raridade: ${c.raridade.toUpperCase()}`,
            `Status: Bloqueada 🔒`
          ]
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

export function abrirPopupConquista(icone, titulo, descricao, detalhes) {
  console.log('🔍 Abrindo popup de conquista:', titulo);
  const popup = document.getElementById('popupConquista');
  if (!popup) {
    console.error('❌ Modal de conquista não encontrado!');
    return;
  }

  // Preencher com dados
  safeSet('conquistaIcone', icone || '🏆');
  safeSet('conquistaTitulo', titulo || 'Conquista');
  safeSet('conquistaDescricao', descricao || 'Descrição não disponível.');
  safeHTML('conquistaDetalhes', detalhes ? detalhes.map(item => `<li>${item}</li>`).join('') : '');

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
