// exportar-chamada.js
// 📸 Exportar chamada em JPG reorganizada em 3 colunas com aparência original

export async function exportarChamada3Colunas() {
  const painelOriginal = document.getElementById("painelAlunos");
  if (!painelOriginal) {
    alert("Painel não encontrado!");
    return;
  }

  // 1. Criar painel temporário
  const temp = document.createElement("div");
  temp.style.width = "1100px";
  temp.style.padding = "30px";
  temp.style.background = "#ffffff";
  temp.style.display = "grid";
  temp.style.gridTemplateColumns = "repeat(3, 1fr)";
  temp.style.gap = "20px";
  temp.style.fontFamily = "Arial";

  // Título
  const titulo = document.createElement("h2");
  titulo.style.gridColumn = "1 / 4";
  titulo.style.textAlign = "center";
  titulo.style.marginBottom = "10px";
  titulo.innerText = `📋 Chamada do Dia – ${new Date().toLocaleDateString("pt-BR")}`;
  temp.appendChild(titulo);

  // 2. Copiar cards originais exatamente como aparecem
  const cards = painelOriginal.querySelectorAll(".container-aluno");

  cards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.style.transform = "none";
    clone.style.cursor = "default";
    clone.style.margin = "0";
    temp.appendChild(clone);
  });

  // Observações
  const obsInput = document.getElementById("observacoes");
  const obs = document.createElement("div");
  obs.style.gridColumn = "1 / 4";
  obs.style.marginTop = "15px";
  obs.style.paddingTop = "10px";
  obs.style.borderTop = "2px solid #000";
  obs.style.fontSize = "14px";
  obs.innerHTML = `<strong>Observações:</strong><br>${obsInput ? obsInput.value : ""}`;
  temp.appendChild(obs);

  // Adiciona no DOM para captura
  document.body.appendChild(temp);

  // 3. Capturar imagem com html2canvas
  const canvas = await html2canvas(temp, {
    scale: 2,
    useCORS: true,
    allowTaint: true
  });

  // Baixar JPG
  const link = document.createElement("a");
  link.download = `chamada_3colunas_${new Date().toLocaleDateString("pt-BR")}.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();

  // Remover temp
  document.body.removeChild(temp);
}
