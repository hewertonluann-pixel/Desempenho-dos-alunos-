// frequencia.js
// --------------------------------------
// Painel de frequência anual com popup flutuante dentro do painel
// Agora usando o histórico `presencas` como fonte principal,
// mas mantendo compatibilidade com freqAnual/freqMensal antigos.
// --------------------------------------

/**
 * Gera os círculos de frequência anual do aluno dentro de elementoAlvo.
 * Espera encontrar:
 *  - aluno.presencas: [{ mes: "2025-10", totalEnsaios, presencasAluno, percentual }, ...]
 *  - aluno.frequenciaAnual: { "OUT": 75, "NOV": { percentual, totalEnsaios, presencasAluno }, ... }
 *  - aluno.frequenciaMensal: { porcentagem, totalEventos, presencas }
 */
export function gerarPainelFrequencia(aluno, elementoAlvo) {
  if (!elementoAlvo) return;

  // === CONFIGURAÇÕES BÁSICAS ===
  const meses = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const indiceMesAtual = new Date().getMonth();
  const mesAtual = meses[indiceMesAtual];
  const anoAtual = new Date().getFullYear();

  const freqMensal = aluno.frequenciaMensal || {};
  const freqAnual = aluno.frequenciaAnual || {};
  const historico = Array.isArray(aluno.presencas) ? aluno.presencas : [];

  // Atualiza texto do ano, se existir
  const spanAno = document.getElementById("anoAtualTexto");
  if (spanAno) spanAno.textContent = anoAtual;

  // Limpa painel antes de gerar
  elementoAlvo.innerHTML = "";

  // === GERA OS CÍRCULOS MENSAIS ===
  meses.forEach((mes, idx) => {
    let valor = 0;
    let presencas = 0;
    let totalEventos = 0;

    // 🔸 1) TENTA BUSCAR PELO HISTÓRICO `presencas` (formato novo)
    const numeroMes = String(idx + 1).padStart(2, "0"); // "01"..."12"
    const chaveMesAno = `${anoAtual}-${numeroMes}`;     // ex: "2025-10"

    const registroHistorico =
      historico.find((item) => item && item.mes === chaveMesAno) || null;

    if (registroHistorico) {
      valor =
        registroHistorico.percentual ??
        registroHistorico.porcentagem ??
        0;

      presencas =
        registroHistorico.presencasAluno ??
        registroHistorico.presencas ??
        0;

      totalEventos =
        registroHistorico.totalEnsaios ??
        registroHistorico.totalEventos ??
        0;
    } else {
      // 🔸 2) SE NÃO TIVER NO HISTÓRICO, CAI PARA OS CAMPOS ANTIGOS (freqAnual/freqMensal)
      const dadosAnuais = freqAnual[mes];

      if (typeof dadosAnuais === "number") {
        // Caso antigo: valor direto ("OUT": 44)
        valor = dadosAnuais;
      } else if (typeof dadosAnuais === "object" && dadosAnuais !== null) {
        // Caso objeto detalhado
        valor =
          dadosAnuais.percentual ??
          dadosAnuais.porcentagem ??
          0;

        presencas =
          dadosAnuais.presencasAluno ??
          dadosAnuais.presencas ??
          0;

        totalEventos =
          dadosAnuais.totalEnsaios ??
          dadosAnuais.totalEventos ??
          0;
      } else if (mes === mesAtual && freqMensal) {
        // Caso mensal: mês atual vindo de frequenciaMensal
        valor =
          freqMensal.percentual ??
          freqMensal.porcentagem ??
          0;

        presencas = freqMensal.presencas ?? 0;
        totalEventos =
          freqMensal.totalEnsaios ??
          freqMensal.totalEventos ??
          0;
      }
    }

    // Normaliza valor entre 0 e 100
    if (typeof valor !== "number" || isNaN(valor)) valor = 0;
    if (valor < 0) valor = 0;
    if (valor > 100) valor = 100;

    // Cor por faixa de frequência
    let cor = "#ff4444";
    if (valor >= 80) cor = "#00ff99";
    else if (valor >= 50) cor = "#ffff66";

    // Cria o círculo do mês
    const grafico = document.createElement("div");
    grafico.classList.add("grafico-mes");
    grafico.setAttribute("data-mes", mes);
    grafico.style.background = `conic-gradient(${cor} ${valor}%, transparent 0)`;

    grafico.onclick = (e) => {
      e.stopPropagation();
      abrirPopupFrequencia(
        mes,
        { totalEventos, presencas, porcentagem: valor },
        elementoAlvo
      );
    };

    elementoAlvo.appendChild(grafico);
  });

  // === GARANTE POPUP ÚNICO DENTRO DO PAINEL ===
  let popup = elementoAlvo.querySelector(".popup-frequencia");
  if (!popup) {
    const popupHTML = document.createElement("div");
    popupHTML.classList.add("popup-frequencia");
    popupHTML.style.cssText = `
      display: none;
      position: absolute;
      inset: 0;
      justify-content: center;
      align-items: center;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      border-radius: 12px;
      z-index: 10;
      transition: opacity 0.3s ease;
    `;

    popupHTML.innerHTML = `
      <div class="popup-frequencia-conteudo" style="
        background: linear-gradient(145deg, #1e1e2f, #2a2a40);
        border: 1px solid rgba(0, 255, 204, 0.3);
        box-shadow: 0 0 20px rgba(0, 255, 204, 0.25);
        border-radius: 14px;
        padding: 18px 25px;
        width: 260px;
        text-align: center;
        color: #fff;
        animation: scaleUp 0.3s ease forwards;
      ">
        <p id="textoResumoFrequencia" style="margin: 6px 0; font-size: 1rem; color: #ddd;"></p>
        <div class="barra-popup" style="
          width: 100%;
          height: 10px;
          background: #222;
          border-radius: 6px;
          margin-top: 10px;
          overflow: hidden;
          box-shadow: inset 0 0 8px rgba(0,0,0,0.6);
        ">
          <div class="barra-popup-preenchimento" id="barraPopupPreenchimento" style="
            height: 100%;
            width: 0%;
            border-radius: 6px;
            background: linear-gradient(90deg, #007bff, #8e2de2);
            box-shadow: 0 0 12px rgba(0, 200, 255, 0.4);
            transition: width 0.6s ease;
          "></div>
        </div>
        <button id="fecharPopupFreq" style="
          margin-top: 12px;
          background-color: #00bfff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 6px 14px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.3s;
        ">Fechar</button>
      </div>
    `;
    elementoAlvo.appendChild(popupHTML);

    popup = popupHTML;

    // Evento de fechamento clicando fora ou no botão
    popup.addEventListener("click", (e) => {
      if (e.target.classList.contains("popup-frequencia")) {
        fecharPopupFrequencia(elementoAlvo);
      }
    });
    popup.querySelector("#fecharPopupFreq").onclick = () =>
      fecharPopupFrequencia(elementoAlvo);
  }
}

// === ABRIR POPUP DE FREQUÊNCIA ===
export function abrirPopupFrequencia(mes, dados, elementoAlvo) {
  const popup = elementoAlvo.querySelector(".popup-frequencia");
  if (!popup) return;

  const texto = popup.querySelector("#textoResumoFrequencia");
  const barra = popup.querySelector("#barraPopupPreenchimento");

  popup.style.display = "flex";
  popup.style.opacity = "1";

  const freq = dados?.porcentagem ?? 0;
  const totalEventos = dados?.totalEventos ?? 0;
  const presencas = dados?.presencas ?? 0;

  texto.innerHTML = `
    <strong>${mes}</strong><br>
    Ensaios: ${totalEventos}<br>
    Presente em: ${presencas}<br>
    Frequência: ${freq}%
  `;
  barra.style.width = freq + "%";
}

// === FECHAR POPUP ===
export function fecharPopupFrequencia(elementoAlvo) {
  const popup = elementoAlvo.querySelector(".popup-frequencia");
  if (!popup) return;
  popup.style.opacity = "0";
  setTimeout(() => (popup.style.display = "none"), 200);
}
