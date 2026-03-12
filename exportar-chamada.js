// exportar-chamada.js
// 📸 Exportar chamada em PNG – 3 colunas + resumo completo + rodapé

export async function exportarChamada3Colunas() {
  const painelOriginal = document.getElementById("painelAlunos");
  if (!painelOriginal) { alert("Painel não encontrado!"); return; }

  const cards = painelOriginal.querySelectorAll(".container-aluno");

  // === Contagem de presenças ===
  let presentes = 0, ausentes = 0, pendentes = 0;
  cards.forEach(c => {
    if      (c.classList.contains("presente")) presentes++;
    else if (c.classList.contains("ausente"))  ausentes++;
    else                                        pendentes++;
  });
  const total      = cards.length;
  const porcentagem = total > 0 ? Math.round((presentes / total) * 100) : 0;

  // === Data: lê do input editável ===
  let dataEnsaio = "--/--/----";
  const inputData = document.getElementById("inputData");
  if (inputData && inputData.value) {
    const [ano, mes, dia] = inputData.value.split("-");
    dataEnsaio = `${dia}/${mes}/${ano}`;
  }

  // === Container principal ===
  const temp = document.createElement("div");
  Object.assign(temp.style, {
    width: "1100px",
    padding: "30px 30px 20px",
    background: "#1e1e2f",
    color: "white",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    fontFamily: "Segoe UI, Arial, sans-serif",
    border: "2px solid #00ffcc55",
    borderRadius: "16px",
  });

  // === Título ===
  const titulo = document.createElement("h2");
  Object.assign(titulo.style, {
    gridColumn: "1 / 4",
    textAlign: "center",
    margin: "0 0 10px",
    color: "#00ffcc",
    fontSize: "26px",
    textShadow: "0 0 8px rgba(0,255,204,0.6)",
  });
  titulo.innerText = `📋 Chamada do Ensaio – ${dataEnsaio}`;
  temp.appendChild(titulo);

  // === Cards com iniciais no lugar de foto (evita erro CORS) ===
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.style.transform = "none";
    clone.style.cursor    = "default";
    clone.style.margin    = "0";
    clone.style.outline   = "none";

    // Substitui <img> por div com inicial estilizada
    const fotoWrap = clone.querySelector(".foto-aluno");
    if (fotoWrap) {
      const nomeEl = clone.querySelector(".nome");
      const inicial = nomeEl ? nomeEl.textContent.trim()[0].toUpperCase() : "?";
      fotoWrap.innerHTML = "";
      const inicialDiv = document.createElement("div");
      Object.assign(inicialDiv.style, {
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0f3460, #0ea5e9)",
        borderRadius: "50%",
        color: "#fff",
        fontWeight: "700",
        fontSize: "1.4rem",
      });
      inicialDiv.textContent = inicial;
      fotoWrap.appendChild(inicialDiv);
    }

    temp.appendChild(clone);
  });

  // === Linha final: Observações + Resumo ===
  const linhaFinal = document.createElement("div");
  Object.assign(linhaFinal.style, {
    gridColumn: "1 / 4",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    gap: "20px",
  });

  // Observações
  const obsInput = document.getElementById("observacoes");
  const obsArea  = document.createElement("div");
  Object.assign(obsArea.style, {
    flex: "1", fontSize: "20px", lineHeight: "1.5",
    color: "#e0fafa", fontWeight: "500", maxWidth: "660px",
  });
  obsArea.innerHTML = `<strong style="font-size:18px;color:#00ffcc;">Observações:</strong><br>${obsInput ? (obsInput.value || "—") : "—"}`;
  linhaFinal.appendChild(obsArea);

  // Resumo completo
  const resumoBox = document.createElement("div");
  Object.assign(resumoBox.style, { width: "340px", textAlign: "right" });

  const labelResumo = document.createElement("div");
  Object.assign(labelResumo.style, { fontSize: "17px", color: "#00ffcc", fontWeight: "600", marginBottom: "6px" });
  labelResumo.innerHTML =
    `✅ ${presentes} presentes &nbsp;·&nbsp; ❌ ${ausentes} ausentes` +
    (pendentes > 0 ? ` &nbsp;·&nbsp; ⏳ ${pendentes} pendentes` : "");
  resumoBox.appendChild(labelResumo);

  // Barra de progresso
  const barraWrap = document.createElement("div");
  Object.assign(barraWrap.style, {
    width: "100%", height: "16px", borderRadius: "10px",
    background: "#333", overflow: "hidden", boxShadow: "inset 0 0 6px rgba(0,0,0,0.7)",
  });
  const barra = document.createElement("div");
  Object.assign(barra.style, {
    height: "100%", width: `${porcentagem}%`,
    background: "linear-gradient(90deg, #00ffcc, #0099aa)",
    boxShadow: "0 0 10px rgba(0,255,204,0.9)",
  });
  barraWrap.appendChild(barra);
  resumoBox.appendChild(barraWrap);

  const txtPct = document.createElement("div");
  Object.assign(txtPct.style, {
    fontSize: "28px", fontWeight: "bold", color: "#00ffcc",
    marginTop: "6px", textShadow: "0 0 6px rgba(0,255,204,0.7)",
  });
  txtPct.innerText = `${porcentagem}% de frequência`;
  resumoBox.appendChild(txtPct);

  linhaFinal.appendChild(resumoBox);
  temp.appendChild(linhaFinal);

  // === Rodapé ===
  const rodape = document.createElement("div");
  Object.assign(rodape.style, {
    gridColumn: "1 / 4",
    textAlign: "center",
    marginTop: "16px",
    fontSize: "13px",
    color: "#4b6080",
    borderTop: "1px solid #1e3a5f",
    paddingTop: "10px",
  });
  const agora = new Date();
  const horaExport = agora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  rodape.innerText = `Orquestra Filhos de Asafe  ·  Exportado em ${horaExport}`;
  temp.appendChild(rodape);

  // === Renderizar e baixar ===
  document.body.appendChild(temp);

  const canvas = await html2canvas(temp, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
  });

  const link = document.createElement("a");
  link.download = `Chamada_Ensaio_${dataEnsaio.replace(/\//g, "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();

  document.body.removeChild(temp);
}
