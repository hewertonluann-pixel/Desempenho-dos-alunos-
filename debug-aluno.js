// debug-aluno.js
// Script temporário para identificar problemas de carregamento

(function() {
  console.log("\n\n==== DEBUG PAINEL DO ALUNO ====");
  
  // 1. Verificar URL
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");
  console.log("1. Parâmetro 'nome' na URL:", nomeAluno || "\u274c NÃO ENCONTRADO");
  
  // 2. Verificar elementos HTML
  console.log("\n2. Elementos HTML:");
  const elementos = {
    "nomeAluno": document.getElementById("nomeAluno"),
    "instrumentoAluno": document.getElementById("instrumentoAluno"),
    "fotoAluno": document.getElementById("fotoAluno"),
    "nivelGeral": document.getElementById("nivelGeral"),
    "sidebar": document.querySelector(".sidebar"),
    "profile-card": document.querySelector(".profile-card")
  };
  
  Object.keys(elementos).forEach(key => {
    const el = elementos[key];
    if (el) {
      const display = window.getComputedStyle(el).display;
      console.log(`  ✅ ${key}: existe (display: ${display})`);
    } else {
      console.log(`  ❌ ${key}: NÃO ENCONTRADO`);
    }
  });
  
  // 3. Verificar CSS carregado
  console.log("\n3. CSS carregado:");
  const links = document.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(link => {
    console.log(`  - ${link.href}`);
  });
  
  // 4. Verificar localStorage
  console.log("\n4. LocalStorage:");
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
    console.log("  Usuario atual:", usuario.nome || "Não logado");
  } catch (e) {
    console.log("  ❌ Erro ao ler localStorage:", e);
  }
  
  // 5. Verificar erros no console
  console.log("\n5. Verificar console acima para erros de:");
  console.log("  - Firebase");
  console.log("  - CSS não carregado");
  console.log("  - JavaScript");
  
  // 6. Forçar exibição da sidebar para teste
  console.log("\n6. Tentando forçar exibição da sidebar...");
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    const currentDisplay = window.getComputedStyle(sidebar).display;
    console.log(`  Display atual: ${currentDisplay}`);
    
    if (currentDisplay === "none") {
      console.log("  ⚠️ Sidebar está oculta! Verificar CSS.");
    }
  }
  
  console.log("\n==== FIM DEBUG ====\n\n");
})();
