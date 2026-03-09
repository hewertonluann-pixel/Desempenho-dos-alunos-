// ================================================================
// SCRIPT PARA GERENCIAR HEADER E BOTTOM NAVIGATION
// ================================================================

// Função para carregar dados do usuário no header
function carregarDadosUsuario() {
  const usuario = JSON.parse(localStorage.getItem('usuarioAtual'));
  
  if (usuario && usuario.nome) {
    // Atualizar foto do usuário no header
    const headerPhoto = document.getElementById('headerUserPhoto');
    if (headerPhoto && usuario.foto) {
      headerPhoto.src = usuario.foto;
    }
    
    // Click na foto leva ao perfil
    if (headerPhoto) {
      headerPhoto.onclick = () => {
        window.location.href = `aluno.html?nome=${encodeURIComponent(usuario.nome)}`;
      };
    }
    
    // Configurar link do botão Home no bottom nav
    const homeLink = document.querySelector('.bottom-nav a[data-page="home"]');
    if (homeLink) {
      homeLink.href = `aluno.html?nome=${encodeURIComponent(usuario.nome)}`;
    }
    
    // Mostrar botão Professor se for classificado
    const navProfessor = document.getElementById('navProfessor');
    if (navProfessor && usuario.classificado === true) {
      navProfessor.style.display = 'flex';
    }
  }
}

// Função para o botão de logout
function configurarLogout() {
  const logoutBtn = document.getElementById('headerLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('usuarioAtual');
      window.location.href = 'index.html';
    };
  }
}

// Função para marcar item ativo no bottom nav
function marcarItemAtivo() {
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  
  navItems.forEach(item => {
    const page = item.getAttribute('data-page');
    if (
      (currentPage === 'aluno' && page === 'home') ||
      (currentPage === 'painel-social' && page === 'comunidade') ||
      (currentPage === 'biblioteca' && page === 'biblioteca') ||
      (currentPage === 'atividades' && page === 'atividades') ||
      (currentPage === 'professor' && page === 'professor')
    ) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    carregarDadosUsuario();
    configurarLogout();
    marcarItemAtivo();
  });
} else {
  carregarDadosUsuario();
  configurarLogout();
  marcarItemAtivo();
}
