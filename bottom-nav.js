// ============================================
// BOTTOM NAVIGATION - CONTROLE DE NAVEGAÇÃO
// ============================================

/**
 * Define a página ativa na navegação
 */
function setActiveNav() {
  const currentPage = window.location.pathname.split('/').pop().split('.')[0];
  const navItems = document.querySelectorAll('.nav-item');

  const pageMap = {
    'aluno': 'home',
    'aluno3': 'home',
    'painel-social': 'comunidade',
    'biblioteca': 'biblioteca',
    'atividades': 'atividades',
    'professor': 'professor'
  };

  const activePage = pageMap[currentPage] || 'home';

  navItems.forEach(item => {
    const itemPage = item.getAttribute('data-page');
    if (itemPage === activePage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Carrega o nome do grupo do Firestore
 */
async function carregarNomeGrupo() {
  try {
    // Importa o Firestore
    const { getFirestore, collection, getDocs, query, limit } = await import(
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js'
    );

    const db = getFirestore();
    
    // Busca o primeiro grupo (ou você pode fazer lógica específica)
    const gruposRef = collection(db, 'grupos');
    const q = query(gruposRef, limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const grupoData = snapshot.docs[0].data();
      const nomeGrupo = grupoData.nome || 'Orquestra Filhos de Asafe';
      
      const groupNameElement = document.querySelector('.group-name');
      if (groupNameElement) {
        groupNameElement.textContent = nomeGrupo;
      }
    }
  } catch (error) {
    console.log('Usando nome padrão do grupo');
    // Mantém o nome padrão do HTML
  }
}

/**
 * Inicializa a navegação
 */
function initBottomNav() {
  setActiveNav();
  carregarNomeGrupo();

  // Adiciona efeito de clique
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      // Animação de feedback
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
    });
  });
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBottomNav);
} else {
  initBottomNav();
}

// Exporta funções para uso externo
export { setActiveNav, carregarNomeGrupo };
