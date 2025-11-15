// ===============================
// Salvar usuário logado corretamente
// ===============================

export function salvarUsuarioAtual(nome, tipo = "aluno") {
  localStorage.setItem(
    "usuarioAtual",
    JSON.stringify({ nome, tipo })
  );
}

// Remover versões antigas que salvaram strings simples
export function garantirFormato() {
  const atual = localStorage.getItem("usuarioAtual");

  if (atual && !atual.startsWith("{")) {
    localStorage.removeItem("usuarioAtual");
  }
}
