// ===============================
// Salvar usuário logado corretamente
// ===============================

export function salvarUsuarioAtual(usuario) {
  // Garante que o objeto tenha pelo menos o tipo, se não tiver
  if (!usuario.tipo) {
    usuario.tipo = usuario.classificado ? "professor" : "aluno";
  }
  localStorage.setItem(
    "usuarioAtual",
    JSON.stringify(usuario)
  );
}

// Remover versões antigas que salvaram strings simples
export function garantirFormato() {
  const atual = localStorage.getItem("usuarioAtual");

  if (atual && !atual.startsWith("{")) {
    localStorage.removeItem("usuarioAtual");
  }
}
