// ================================================================
// TEMPLATE DO HEADER MOBILE
// Insere estrutura HTML do header em todas as páginas
// ================================================================

export function inserirHeaderTemplate() {
  // Verifica se o header já existe
  if (document.querySelector('.top-header')) return;

  // Cria o header
  const header = document.createElement('header');
  header.className = 'top-header';
  header.innerHTML = `
    <img src="./logo-fa.jpeg" 
         alt="🎵 Orquestra Filhos de Asafe" 
         class="header-group-logo"
         title="Orquestra Filhos de Asafe">
    
    <h1 class="group-name">Filhos de Asafe</h1>
    
    <div class="header-right">
      <button id="headerLogoutBtn" class="header-logout-btn" title="Sair da conta">
        <i class="fas fa-sign-out-alt"></i>
        <span>Sair</span>
      </button>
      
      <img id="headerUserPhoto" 
           src="https://via.placeholder.com/150" 
           alt="Foto do usuário" 
           class="header-user-photo"
           title="Ver meu perfil">
    </div>
  `;

  // Insere no início do body
  document.body.insertBefore(header, document.body.firstChild);
}

// Executa automaticamente quando o script é importado
inserirHeaderTemplate();
