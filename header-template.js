// ================================================================
// TEMPLATE DO HEADER MOBILE — carrega dados dinâmicos do Firestore
// ================================================================
import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const FALLBACK_NOME = '🎵 Orquestra Filhos de Asafe';
const FALLBACK_LOGO = './logo-fa.jpeg';

export async function inserirHeaderTemplate() {
  if (document.querySelector('.top-header')) return;

  // Cria o header imediatamente com fallback
  const header = document.createElement('header');
  header.className = 'top-header';
  header.innerHTML = _headerHTML(FALLBACK_NOME, FALLBACK_LOGO);
  document.body.insertBefore(header, document.body.firstChild);

  // Atualiza com dados do Firestore se disponíveis
  try {
    const snap = await getDoc(doc(db, 'config', 'grupo'));
    if (snap.exists()) {
      const d = snap.data();
      const nome = d.nome ? `🎵 ${d.nome}` : FALLBACK_NOME;
      const logo = d.logoUrl && d.logoUrl.startsWith('http') ? d.logoUrl : FALLBACK_LOGO;
      const imgEl  = header.querySelector('.header-group-logo');
      const nomeEl = header.querySelector('.group-name');
      if (imgEl)  { imgEl.src = logo; imgEl.alt = nome; imgEl.title = nome; }
      if (nomeEl) { nomeEl.textContent = nome; }
    }
  } catch(e) { /* mantém fallback em caso de erro */ }
}

function _headerHTML(nome, logo) {
  return `
    <img src="${logo}" alt="${nome}" class="header-group-logo" title="${nome}">
    <h1 class="group-name">${nome}</h1>
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
}

// Executa automaticamente
inserirHeaderTemplate();
