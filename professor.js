// professor.js

// Mostrar nome do professor logado
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  document.getElementById("usuarioLogado").textContent =
    user?.nome ? `Professor logado: ${user.nome}` : "Professor";
});

// Função para carregar MÓDULOS
export async function carregarModulo(nome) {
  const conteudo = document.getElementById("conteudo");

  conteudo.innerHTML = `<p style="opacity:0.8">Carregando módulo...</p>`;

  // Carrega o HTML do módulo
  const html = await fetch(`modules/${nome}.html`).then(r => r.text());
  conteudo.innerHTML = html;

  // Carrega o JS do módulo
  import(`./modules/${nome}.js`)
    .catch(err => console.error("Erro ao carregar módulo:", err));
}

// Exportar PDF (mantém função existente)
window.exportarPDF = function() {
  alert("Função PDF ainda será integrada ao módulo correspondente.");
};
