// exportar-chamada.js
// 📸 Exportar chamada em JPG em 3 colunas, tema escuro + gráfico de presenças

export async function exportarChamada3Colunas() {
  const painelOriginal = document.getElementById("painelAlunos");
  if (!painelOriginal) {
    alert("Painel não encontrado!");
    return;
  }

  const cards = painelOriginal.querySelectorAll(".container-aluno");

  // === Cálculo da presença ===
  let total = cards.length;
  let presentes = 0;

  cards.forEach(c => {
    if (c.classList.contains("presente")) presentes++;
  });

  const porcentagem = Math.round((presentes / total) * 100);

  // Barra visual do gráfico (20 blocos)
  const blocosTotais = 20;
  const blocosPreenchidos = Math.round((porcentagem / 100) * blocosTotais);
  const barra =
    "[" +
    "=".repeat(blocosPreenchidos) +
    "-".repeat(blocosTotais - blocosPreenchidos) +
    `] ${porcentagem}% de Presenças`;

  // === 1. Criar painel temporário com tema escuro ===
  const temp = document.createElement("div");
  temp.style.width = "1100px";
  temp.style.padding = "30px";
  temp.style.background = "#1e1e2f";
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
  titulo.style.marginBottom = "5px";
  titulo.style.color = "#00ffcc";
  titulo.style.textShadow = "0 0 8px rgba(0,255,204,0.6)";
  titulo.innerText = `📋 Chamada do Dia – ${new Date().toLocaleDateString("pt-BR")}`;
  temp.appendChild(titulo);

  // === GRÁFICO DE PRESENÇA ===
  const grafico = document.createElement("div");
  grafico.style.gridColumn = "1 / 4";
  grafico.style.textAlign = "center";
  grafico.style.fontSize = "18px";
  grafico.style.marginBottom = "20px";
  grafico.style.fontFamily = "Courier New, monospace";
  grafico.style.color = "#00ffcc";
  grafico.style.textShadow = "0 0 4px rgba(0,255,204,0.5)";
  grafico.innerText = barra;
  temp.appendChild(grafico);

  // === 2. Copiar cards exatamente como aparecem ===
  cards.forEach(card => {
    const clone = card.cloneNode(true);

    // Ajustes para exportação
    clone.style.transform = "none";
    clone.style.cursor = "default";
    clone.style.margin = "0";

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

  // Adicionar ao DOM para captura
  document.body.appendChild(temp);

  // === 3. Capturar imagem ===
  const canvas = await html2canvas(temp, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null
  });

  // === 4. Baixar JPG ===
  const link = document.createElement("a");
  link.download = `chamada_3colunas_${porcentagem}porcento.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();

  // Remover painel temporário
  document.body.removeChild(temp);
}
