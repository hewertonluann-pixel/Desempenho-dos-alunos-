// ======================================
// gráfico-evolucao.js
// Gráfico histórico: BONA / MÉTODO
// Linha contínua mês a mês com último ponto destacado
// ======================================

window.gerarGraficoEvolucao = function (aluno, energia, alvo, historico) {
  if (!alvo) return;

  // Garante array
  historico = Array.isArray(historico) ? historico : [];

  // Presença do mês atual (apenas texto informativo aqui)
  const presencaPercentual = Math.max(0, Math.min(100, energia || 0));

  // Monta o painel dentro do card (botões + canvas + legenda)
  alvo.innerHTML = `
    <div class="painel-evolucao" style="
      width: 100%;
      padding: 10px 0;
    ">
      <div class="modos-evolucao" style="
        display:flex;
        justify-content:center;
        gap:8px;
        margin-bottom:10px;
      ">
        <button type="button" data-modo="bona" class="btn-modo-ativo" style="
          padding:6px 14px;
          border-radius:999px;
          border:1px solid #10b981;
          background:rgba(16,185,129,0.15);
          color:#a7f3d0;
          font-size:0.9rem;
          cursor:pointer;
        ">BONA</button>
        <button type="button" data-modo="metodo" class="btn-modo" style="
          padding:6px 14px;
          border-radius:999px;
          border:1px solid #4b5563;
          background:rgba(15,23,42,0.7);
          color:#9ca3af;
          font-size:0.9rem;
          cursor:pointer;
        ">MÉTODO</button>
      </div>

      <div class="wrapper-grafico" style="
        position:relative;
        width:100%;
        min-height:220px;
        height:220px;
      ">
        <canvas id="canvasEvolucao"></canvas>
      </div>

      <div id="textoPresenca" style="
        margin-top:8px;
        font-size:0.85rem;
        color:#9ca3af;
      ">
        Presença no mês: <strong>${presencaPercentual}%</strong>
      </div>
    </div>
  `;

  const canvas = alvo.querySelector("#canvasEvolucao");
  const ctx = canvas.getContext("2d");

  // Plugin para desenhar o "badge" com o valor no ponto final
  const badgePlugin = {
    id: "badgePlugin",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const meta = chart.getDatasetMeta(0); // dataset da linha principal
      if (!meta || !meta.data || !meta.data.length) return;

      const ultimoPonto = meta.data[meta.data.length - 1];
      const props = ultimoPonto.getProps(["x", "y"], true);
      const x = props.x;
      const y = props.y;

      const dataset = chart.config.data.datasets[0];
      const valor = dataset.data[dataset.data.length - 1] || 0;
      const prefixo = chart.options.plugins.badgePlugin?.labelPrefix || "";
      const texto = `${prefixo}${valor}`;

      ctx.save();
      ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      const paddingX = 8;
      const paddingY = 4;
      const larguraTexto = ctx.measureText(texto).width;
      const larguraCaixa = larguraTexto + paddingX * 2;
      const alturaCaixa = 22;

      // Caixa à ESQUERDA do ponto para não cortar na borda
      const boxX = x - larguraCaixa - 12;
      const boxY = y - alturaCaixa / 2;

      const raio = 8;

      ctx.fillStyle = "rgba(15,23,42,0.95)";
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1.2;

      // Desenha retângulo arredondado
      ctx.beginPath();
      ctx.moveTo(boxX + raio, boxY);
      ctx.lineTo(boxX + larguraCaixa - raio, boxY);
      ctx.quadraticCurveTo(boxX + larguraCaixa, boxY, boxX + larguraCaixa, boxY + raio);
      ctx.lineTo(boxX + larguraCaixa, boxY + alturaCaixa - raio);
      ctx.quadraticCurveTo(boxX + larguraCaixa, boxY + alturaCaixa, boxX + larguraCaixa - raio, boxY + alturaCaixa);
      ctx.lineTo(boxX + raio, boxY + alturaCaixa);
      ctx.quadraticCurveTo(boxX, boxY + alturaCaixa, boxX, boxY + alturaCaixa - raio);
      ctx.lineTo(boxX, boxY + raio);
      ctx.quadraticCurveTo(boxX, boxY, boxX + raio, boxY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Texto
      ctx.fillStyle = "#a7f3d0";
      ctx.textBaseline = "middle";
      ctx.fillText(texto, boxX + paddingX, boxY + alturaCaixa / 2);

      ctx.restore();
    }
  };

  const nomesMes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  function prepararDadosHistorico(modo) {
    const isBona = modo === "bona";
    const tipoFiltro = isBona ? "bona" : "metodo";

    const historicoFiltrado = historico.filter(h => h.tipo === tipoFiltro && h.valor != null);

    // Se ainda não há histórico, volta para gráfico simples (0 → valor atual)
    if (!historicoFiltrado.length) {
      const valorAtual = isBona ? (aluno.leitura || 0) : (aluno.metodo || 0);
      const labelModo = isBona ? "Leitura (Bona)" : "Método";

      const maxEscala = isBona
        ? (valorAtual <= 20 ? 30 : valorAtual <= 60 ? 80 : valorAtual <= 100 ? 120 : 150)
        : (valorAtual <= 10 ? 20 : valorAtual <= 20 ? 30 : valorAtual <= 40 ? 50 : 60);

      return {
        labels: ["Início", labelModo],
        valores: [0, valorAtual],
        maxEscala
      };
    }

    // Agrupar por mês (YYYY-MM) pegando o MAIOR valor daquele mês
    const porMes = {}; // { "2025-01": 12, ... }

    historicoFiltrado.forEach(h => {
      let dt;
      if (h.data && typeof h.data.toDate === "function") {
        dt = h.data.toDate();
      } else if (h.data instanceof Date) {
        dt = h.data;
      } else if (typeof h.data === "string") {
        dt = new Date(h.data);
      } else {
        dt = new Date();
      }

      const ano = dt.getFullYear();
      const mes = dt.getMonth() + 1; // 0-11
      const chave = `${ano}-${String(mes).padStart(2, "0")}`;

      const valor = Number(h.valor) || 0;

      if (!porMes[chave] || valor > porMes[chave]) {
        porMes[chave] = valor;
      }
    });

    const chavesOrdenadas = Object.keys(porMes).sort(); // "2025-01", "2025-02", ...

    const labels = [];
    const valores = [];

    chavesOrdenadas.forEach(chave => {
      const [anoStr, mesStr] = chave.split("-");
      const ano = Number(anoStr);
      const mesIndex = Number(mesStr) - 1;

      const labelMes = `${nomesMes[mesIndex]} ${String(ano).slice(2)}`;
      labels.push(labelMes);
      valores.push(porMes[chave]);
    });

    const maxValor = valores.length ? Math.max(...valores) : 0;

    const maxEscala = isBona
      ? (maxValor <= 20 ? 30 : maxValor <= 60 ? 80 : maxValor <= 100 ? 120 : 150)
      : (maxValor <= 10 ? 20 : maxValor <= 20 ? 30 : maxValor <= 40 ? 50 : 60);

    return { labels, valores, maxEscala };
  }

  let chartAtual = null;

  function criarGrafico(modo) {
    if (chartAtual) {
      chartAtual.destroy();
      chartAtual = null;
    }

    const isBona = modo === "bona";
    const { labels, valores, maxEscala } = prepararDadosHistorico(modo);

    chartAtual = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: isBona ? "Leitura (Bona)" : "Método",
            data: valores,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.20)",
            pointBorderColor: "#052e16",
            borderWidth: 3,
            pointBackgroundColor: "#22c55e",
            pointRadius: 6,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          badgePlugin: {
            labelPrefix: isBona ? "Bona " : "Método "
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: maxEscala,
            ticks: { color: "#e5e7eb" },
            grid: { color: "rgba(55,65,81,0.5)" }
          },
          x: {
            ticks: { color: "#9ca3af" },
            grid: { color: "rgba(31,41,55,0.6)" }
          }
        }
      },
      plugins: [badgePlugin]
    });
  }

  // Inicial: modo BONA
  criarGrafico("bona");

  // Botões de modo
  const btnBona = alvo.querySelector('button[data-modo="bona"]');
  const btnMetodo = alvo.querySelector('button[data-modo="metodo"]');

  function ativarBotao(modo) {
    if (!btnBona || !btnMetodo) return;
    if (modo === "bona") {
      btnBona.className = "btn-modo-ativo";
      btnBona.style.borderColor = "#10b981";
      btnBona.style.background = "rgba(16,185,129,0.15)";
      btnBona.style.color = "#a7f3d0";

      btnMetodo.className = "btn-modo";
      btnMetodo.style.borderColor = "#4b5563";
      btnMetodo.style.background = "rgba(15,23,42,0.7)";
      btnMetodo.style.color = "#9ca3af";
    } else {
      btnMetodo.className = "btn-modo-ativo";
      btnMetodo.style.borderColor = "#10b981";
      btnMetodo.style.background = "rgba(16,185,129,0.15)";
      btnMetodo.style.color = "#a7f3d0";

      btnBona.className = "btn-modo";
      btnBona.style.borderColor = "#4b5563";
      btnBona.style.background = "rgba(15,23,42,0.7)";
      btnBona.style.color = "#9ca3af";
    }
  }

  if (btnBona) {
    btnBona.addEventListener("click", () => {
      ativarBotao("bona");
      criarGrafico("bona");
    });
  }

  if (btnMetodo) {
    btnMetodo.addEventListener("click", () => {
      ativarBotao("metodo");
      criarGrafico("metodo");
    });
  }
};
