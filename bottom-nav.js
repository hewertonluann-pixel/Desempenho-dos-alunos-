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
 * Carrega a foto do usuário logado no header
 */
async function carregarFotoUsuarioHeader() {
  try {
    // Buscar foto do elemento sidebar existente
    const fotoSidebar = document.getElementById('fotoAluno');
    const headerPhoto = document.getElementById('headerUserPhoto');
    
    if (fotoSidebar && headerPhoto) {
      // Copiar a foto da sidebar para o header
      headerPhoto.src = fotoSidebar.src;
      
      // Adiciona evento de clique para ir ao perfil
      headerPhoto.addEventListener('click', () => {
        window.location.href = window.location.href.split('?')[0] + window.location.search;
      });
      
      // Observar mudanças na foto da sidebar e sincronizar
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
            headerPhoto.src = fotoSidebar.src;
          }
        });
      });
      
      observer.observe(fotoSidebar, {
        attributes: true,
        attributeFilter: ['src']
      });
    }
  } catch (error) {
    console.log('Erro ao carregar foto do usuário:', error);
  }
}

/**
 * Função de logout
 */
async function fazerLogout() {
  try {
    // Confirmação antes de sair
    const confirmar = confirm('Tem certeza que deseja sair?');
    
    if (confirmar) {
      // Limpa localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redireciona para login
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    alert('Erro ao sair. Tente novamente.');
  }
}

/**
 * Verifica se usuário é professor para mostrar o item na navegação
 */
function verificarPermissaoProfessor() {
  const modoProfessorBtn = document.getElementById('modoProfessorBtn');
  const navProfessor = document.getElementById('navProfessor');
  
  // Se o botão de modo professor está visível na sidebar, mostrar na navegação
  if (modoProfessorBtn && navProfessor) {
    const isVisible = window.getComputedStyle(modoProfessorBtn).display !== 'none';
    navProfessor.style.display = isVisible ? 'flex' : 'none';
  }
}

/**
 * Inicializa a navegação
 */
function initBottomNav() {
  setActiveNav();
  carregarNomeGrupo();
  carregarFotoUsuarioHeader();
  verificarPermissaoProfessor();

  // Adiciona efeito de clique nos itens de navegação
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

  // Adiciona evento ao botão de logout
  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', fazerLogout);
  }
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBottomNav);
} else {
  initBottomNav();
}

// Exporta funções para uso externo
export { setActiveNav, carregarNomeGrupo, carregarFotoUsuarioHeader, fazerLogout };
