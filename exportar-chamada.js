// exportar-chamada.js
// 📸 Exportar chamada em JPG em 3 colunas + gráfico moderno posicionado no final

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

  // === 1. Criar painel temporário ===
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

  // === Copiar cards ===
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.style.transform = "none";
    clone.style.cursor = "default";
    clone.style.margin = "0";
    temp.appendChild(clone);
  });

  // === Linha final (Observações + Gráfico) ===

  const linhaFinal = document.createElement("div");
  linhaFinal.style.gridColumn = "1 / 4";
  linhaFinal.style.display = "flex";
  linhaFinal.style.justifyContent = "space-between";
  linhaFinal.style.alignItems = "center";
  linhaFinal.style.marginTop = "20px";
  linhaFinal.style.gap = "20px";

    // --- Observações  ---
const obsInput = document.getElementById("observacoes");

const obsArea = document.createElement("div");
obsArea.style.flex = "1";
obsArea.style.fontSize = "18px";           // 🔥 AUMENTO REAL DA FONTE
obsArea.style.lineHeight = "1.45";         // 🔥 Mais espaçamento
obsArea.style.color = "#e0fafa";           // 🔥 Texto mais claro p/ leitura
obsArea.style.fontWeight = "500";          // 🔥 Leve destaque
obsArea.style.maxWidth = "700px";          // 🔥 Mantém bloco organizado
obsArea.innerHTML = `<strong style="font-size:20px; color:#00ffcc;">Observações:</strong><br>${obsInput ? obsInput.value : ""}`;

  linhaFinal.appendChild(obsArea);

  // --- Gráfico moderno ---
  const graficoBox = document.createElement("div");
  graficoBox.style.width = "320px";
  graficoBox.style.textAlign = "right";

  // Título do gráfico
  const labelGrafico = document.createElement("div");
  labelGrafico.style.fontSize = "14px";
  labelGrafico.style.color = "#00ffcc";
  labelGrafico.style.fontWeight = "600";
  labelGrafico.style.marginBottom = "5px";
  labelGrafico.innerText = `Presenças: ${presentes}/${total}`;
  graficoBox.appendChild(labelGrafico);

  // Contêiner da barra
  const barraContainer = document.createElement("div");
  barraContainer.style.width = "100%";
  barraContainer.style.height = "18px";
  barraContainer.style.borderRadius = "10px";
  barraContainer.style.background = "#333";
  barraContainer.style.boxShadow = "inset 0 0 6px rgba(0,0,0,0.7)";
  barraContainer.style.overflow = "hidden";

  // Barra preenchida
  const barra = document.createElement("div");
  barra.style.height = "100%";
  barra.style.width = `${porcentagem}%`;
  barra.style.background = "linear-gradient(90deg, #00ffcc, #0099aa)";
  barra.style.boxShadow = "0 0 10px rgba(0,255,204,0.9)";
  barra.style.transition = "width 0.3s ease";

  barraContainer.appendChild(barra);

  graficoBox.appendChild(barraContainer);

  // Porcentagem grande
  const txtPercent = document.createElement("div");
  txtPercent.style.fontSize = "22px";
  txtPercent.style.fontWeight = "bold";
  txtPercent.style.color = "#00ffcc";
  txtPercent.style.marginTop = "6px";
  txtPercent.style.textShadow = "0 0 6px rgba(0,255,204,0.7)";
  txtPercent.innerText = `${porcentagem}%`;
  graficoBox.appendChild(txtPercent);

  linhaFinal.appendChild(graficoBox);

  temp.appendChild(linhaFinal);

  // === Adicionar ao DOM e capturar ===
  document.body.appendChild(temp);

  const canvas = await html2canvas(temp, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null
  });

  const link = document.createElement("a");
  link.download = `chamada_3colunas_${porcentagem}porcento.jpg`;
  link.href = canvas.toDataURL("image/jpeg", 0.95);
  link.click();

  document.body.removeChild(temp);
}
