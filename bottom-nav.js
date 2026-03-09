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
    const { getAuth } = await import(
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js'
    );
    const { getFirestore, doc, getDoc } = await import(
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js'
    );

    const auth = getAuth();
    const db = getFirestore();
    const user = auth.currentUser;

    if (user) {
      // Busca a foto do Firestore
      const alunoDoc = await getDoc(doc(db, 'alunos', user.uid));
      
      if (alunoDoc.exists()) {
        const alunoData = alunoDoc.data();
        const fotoURL = alunoData.fotoURL || user.photoURL || 'https://via.placeholder.com/150';
        
        const headerPhoto = document.getElementById('headerUserPhoto');
        if (headerPhoto) {
          headerPhoto.src = fotoURL;
          
          // Adiciona evento de clique para ir ao perfil
          headerPhoto.addEventListener('click', () => {
            window.location.href = 'aluno.html';
          });
        }
      }
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
    const { getAuth, signOut } = await import(
      'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js'
    );

    const auth = getAuth();
    
    // Confirmação antes de sair
    const confirmar = confirm('Tem certeza que deseja sair?');
    
    if (confirmar) {
      await signOut(auth);
      
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
 * Inicializa a navegação
 */
function initBottomNav() {
  setActiveNav();
  carregarNomeGrupo();
  carregarFotoUsuarioHeader();

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
