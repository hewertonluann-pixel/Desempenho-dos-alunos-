// ========== professor.js ==========

// Exibir professor logado
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
  document.getElementById("usuarioLogado").textContent =
    user?.nome ? `Professor logado: ${user.nome}` : "Professor";
});

// ==========================
// FUNÇÃO PRINCIPAL — CARREGAR MÓDULO
// ==========================
export async function carregarModulo(nome) {
  const conteudo = document.getElementById("conteudo");

  // Mensagem de carregamento
  conteudo.innerHTML = `
    <div style="padding:20px; opacity:0.8;">
      <p>🔄 Carregando módulo "${nome}"...</p>
    </div>
  `;

  try {
    // Carrega o HTML do módulo
    const html = await fetch(`modules/${nome}.html`).then(r => {
      if (!r.ok) throw new Error(`Módulo ${nome}.html não encontrado`);
      return r.text();
    });

    conteudo.innerHTML = html;

    // Carrega o script JS do módulo
    await import(`./modules/${nome}.js`);

  } catch (erro) {
    conteudo.innerHTML = `
      <div style="padding:20px; color:#ff7777;">
        <h3>❌ Erro ao carregar o módulo</h3>
        <p>${erro.message}</p>
      </div>
    `;
    console.error("Erro ao carregar módulo:", erro);
  }
}

// 🔥 Torna a função acessível ao HTML (onclick="carregarModulo()")
window.carregarModulo = carregarModulo;

// ==========================
// Função Exportar PDF
// (você pode substituir depois pelo real)
// ==========================
window.exportarPDF = function () {
  alert("📄 Exportação para PDF será integrada ao módulo correspondente.");
};
