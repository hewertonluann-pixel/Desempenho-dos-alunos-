// ===============================
// Salvar usuário logado corretamente
// ===============================

export function salvarUsuarioAtual(nome, tipo = "aluno", classificado = false, docId = "") {
  localStorage.setItem(
    "usuarioAtual",
    JSON.stringify({ nome, tipo, classificado, docId })
  );
}

// Remover versões antigas que salvaram strings simples
export function garantirFormato() {
  const atual = localStorage.getItem("usuarioAtual");

  if (atual && !atual.startsWith("{")) {
    localStorage.removeItem("usuarioAtual");
  }
}
