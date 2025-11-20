// exportar-chamada.js
// 📸 Exportar chamada em JPG reorganizada em 3 colunas com tema escuro idêntico à página

export async function exportarChamada3Colunas() {
  const painelOriginal = document.getElementById("painelAlunos");
  if (!painelOriginal) {
    alert("Painel não encontrado!");
    return;
  }

  // === 1. Criar painel temporário com tema escuro ===
  const temp = document.createElement("div");
  temp.style.width = "1100px";
  temp.style.padding = "30px";
  temp.style.background = "#1e1e2f";  // TEMA ESCURO
  temp.style.color = "white";
  temp.style.display = "grid";
  temp.style.gridTemplateColumns = "repeat(3, 1fr)";
  temp.style.gap = "20px";
  temp.style.fontFamily = "Segoe UI, Arial";
  temp.style.border = "2px solid #00ffcc55";

  // === Título ===
  const titulo = document.createElement("h2");
  titulo.style.gridColumn = "1 / 4";
  titulo.style.textAlign = "center";
  titulo.style.marginBottom = "10px";
  titulo.style.color = "#00ffcc";
  titulo.style.textShadow = "0 0 8px rgba(0,255,204,0.6)";
  titulo.innerText = `📋 Chamada do Dia – ${new Date().toLocaleDateString("pt-BR")}`;
  temp.appendChild(titulo);

  // === 2. Copiar cards originais exatamente como aparecem ===
  const cards = painelOriginal.querySelectorAll(".container-aluno");

  cards.forEach(card => {
    const clone = card.cloneNode(true);

    // Remover efeitos de hover da página
    clone.style.transform = "none";
    clone.style.cursor = "default";
    clone.style.margin = "0";

    // Forçar fundo escuro do container
    clone.style.backgroundColor = getComputedStyle(card).backgroundColor;

    temp.appendChild(clone);
  });

  // === Observações ===
  const obsInput = document.getElementById("observacoes");

  const obs = document.createElement("div");
  obs.style.gridColumn = "1 / 4";
  obs.style.marginTop = "15px";
  obs.style.paddingTop = "10px";
  obs.style.borderTop = "2px solid #00ffcc88";
  obs.style.fontSize = "14px";
  obs.style.color = "#fff";
  obs.innerHTML = `<strong>Observações:</strong><br>${obsInput ? obsInput.value : ""}`;
  temp.appendChild(obs);

  // Adiciona painel temporário no DOM
  document.body.appendChild(temp);

  // === 3. Capturar imagem usando html2canvas ===
  const canvas = await html2canvas(temp, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null // captura o fundo dark corretamente
  });

  // === 4. Baixar JPG ===
  const link = document.createElement("a");
  link.download = `chamada_3colunas_dark_${new Date().toLocaleDateString("pt-BR")}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();

  // Remover painel temporário
  document.body.removeChild(temp);
}
