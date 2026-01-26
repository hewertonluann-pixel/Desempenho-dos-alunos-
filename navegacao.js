// ==========================
//  NAVBAR DINÂMICA MODULAR
//  VERSÃO CORRIGIDA — USA APENAS usuarioAtual DO localStorage
// ==========================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Insere HTML da navbar no topo da página
function inserirNavbar() {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <style>
      .navbar {
        width: 100%;
        background: #0f172a;
        border-bottom: 1px solid rgba(56, 189, 248, 0.2);
        padding: 12px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 999;
      }

      .nav-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .nav-logo {
        font-size: 1.2rem;
        font-weight: 700;
        color: #22d3ee;
      }

      .nav-links {
        display: flex;
        gap: 18px;
      }

      .nav-links a {
        color: #cbd5e1;
        text-decoration: none;
        font-size: 0.95rem;
        transition: 0.2s;
      }

      .nav-links a:hover {
        color: #22d3ee;
      }

      .nav-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        cursor: pointer;
        border: 2px solid #22d3ee66;
      }

      .nav-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .menu-btn {
        display: none;
        font-size: 1.4rem;
        color: #22d3ee;
        cursor: pointer;
      }

      @media (max-width: 760px) {
        .nav-links {
          display: none;
          flex-direction: column;
          background: #0f172a;
          position: absolute;
          top: 60px;
          right: 0;
          width: 180px;
          padding: 14px;
          border-left: 1px solid rgba(34, 211, 238, 0.2);
          border-bottom: 1px solid rgba(34, 211, 238, 0.2);
        }

        .nav-links.active {
          display: flex;
        }

        .menu-btn {
          display: block;
        }
      }
    </style>

    <div class="navbar">
      <div class="nav-left">
        <div class="nav-logo">🎵 Orquestra</div>
        <div id="menuBtn" class="menu-btn">☰</div>

        <div id="navLinks" class="nav-links">
          <a id="navInicio" href="#">Início</a>
          <a href="painel-social.html">Comunidade</a>
          <a href="biblioteca.html">Biblioteca</a>
          <a id="navProfessor" href="professor.html" style="display:none;">Professor</a>
          <a id="navSair" href="#" style="color:#f87171;">Sair</a>
        </div>
      </div>

      <div id="navAvatar" class="nav-avatar"></div>
    </div>
    `
  );
}

inserirNavbar();

// ==========================
// LÓGICA DA NAVBAR
// ==========================
async function configurarNavbar() {
  const menuBtn = document.getElementById("menuBtn");
  const navLinks = document.getElementById("navLinks");
  const navInicio = document.getElementById("navInicio");
  const navProfessor = document.getElementById("navProfessor");
  const navAvatar = document.getElementById("navAvatar");
  const navSair = document.getElementById("navSair");

  // Abrir menu no mobile
  menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });

  // Carregar usuário logado (SEMPRE A PARTIR DO localStorage)
  const usuario = JSON.parse(localStorage.getItem("usuarioAtual"));

  if (!usuario || !usuario.nome) {
    console.warn("Nenhum usuário logado. Navbar exibida em modo visitante.");
    return;
  }

  // INÍCIO → sempre leva ao painel pessoal do usuário logado
  navInicio.href = `aluno.html?nome=${encodeURIComponent(usuario.nome)}`;

  // Carrega informações reais do usuário logado no Firestore
  const q = query(collection(db, "alunos"), where("nome", "==", usuario.nome));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const aluno = snap.docs[0].data();

    // Avatar do usuário logado
    if (aluno.foto) {
      navAvatar.innerHTML = `<img src="${aluno.foto}" />`;
      navAvatar.onclick = () =>
        window.location.href = `aluno.html?nome=${encodeURIComponent(usuario.nome)}`;
    }

    // Professor → só aparece se o usuário logado for classificado
    if (aluno.classificado === true) {
      navProfessor.style.display = "inline-block";
    }
  }

  // SAIR
  navSair.addEventListener("click", () => {
    localStorage.removeItem("usuarioAtual");
    window.location.href = "index.html";
  });
}

configurarNavbar();
