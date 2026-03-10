// ======================================================
// grafico-evolucao.js
// Gráfico histórico usando snapshotsMensais
// Tooltip com lição atual + linha contínua + todos os meses
// ======================================================

window.gerarGraficoEvolucao = function (aluno, energia, alvo, snapshots) {
  if (!alvo) return;

  snapshots = Array.isArray(snapshots) ? snapshots : [];

  const nomesMes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const nomesMesFull = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                        "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  // ── Anos disponíveis ───────────────────────────────────────────────────
  const anosSet = new Set();
  snapshots.forEach(s => { if (s.ano) anosSet.add(s.ano); });
  const anoAtual = new Date().getFullYear();
  anosSet.add(anoAtual);
  const ANO_MIN = Math.min(...anosSet);
  const ANO_MAX = anoAtual;

  let anoSelecionado = anoAtual;
  let modoAtual      = "bona";
  let chartAtual     = null;

  // ── HTML ──────────────────────────────────────────────────────────
  alvo.innerHTML = `
    <div class="painel-evolucao">
      <div class="ev-pills">
        <button type="button" data-modo="bona"   class="ev-pill ev-pill-ativo">BONA</button>
        <button type="button" data-modo="metodo" class="ev-pill">MÉTODO</button>
      </div>
      <div class="ev-ano-control">
        <button type="button" class="ev-ano-btn" id="evBtnAnterior">&#8249;</button>
        <span class="ev-ano-label" id="evAnoLabel">${anoSelecionado}</span>
        <button type="button" class="ev-ano-btn" id="evBtnProximo">&#8250;</button>
      </div>
      <div class="ev-grafico-wrap" id="evGraficoWrap">
        <canvas id="evCanvas"></canvas>
      </div>
      <div class="ev-legenda">
        <span class="ev-legenda-dot"></span>
        <span id="evLegendaTexto">Pegada mensal de evolução</span>
      </div>
    </div>
  `;

  // ── CSS injetado uma vez ──────────────────────────────────────────────────
  if (!document.getElementById("ev-styles")) {
    const style = document.createElement("style");
    style.id = "ev-styles";
    style.textContent = `
      .painel-evolucao { width:100%; padding:10px 0; }
      .ev-pills { display:flex; justify-content:center; gap:8px; margin-bottom:14px; }
      .ev-pill {
        padding:6px 18px; border-radius:999px; font-size:0.83rem;
        font-weight:600; cursor:pointer; border:1.5px solid #4b5563;
        background:rgba(15,23,42,0.7); color:#9ca3af; transition:all .2s;
        -webkit-tap-highlight-color:transparent;
      }
      .ev-pill.ev-pill-ativo {
        border-color:#22d3ee; background:rgba(34,211,238,0.12);
        color:#a5f3fc; box-shadow:0 0 0 2px rgba(34,211,238,0.13);
      }
      .ev-ano-control { display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:16px; }
      .ev-ano-btn {
        width:52px; height:52px; border-radius:50%;
        border:1.5px solid rgba(56,189,248,0.3);
        background:rgba(15,23,42,0.8); color:#38bdf8;
        font-size:1.7rem; cursor:pointer; display:flex;
        align-items:center; justify-content:center; transition:all .18s;
        -webkit-tap-highlight-color:transparent; line-height:1;
      }
      .ev-ano-btn:hover  { background:rgba(34,211,238,0.15); border-color:#22d3ee; }
      .ev-ano-btn:active { transform:scale(.90); }
      .ev-ano-btn:disabled { opacity:.28; cursor:not-allowed; transform:none; }
      .ev-ano-label { font-size:1.5rem; font-weight:800; color:#e2e8f0; min-width:80px; text-align:center; letter-spacing:.06em; }
      .ev-grafico-wrap { position:relative; width:100%; height:220px; margin-bottom:12px; }
      @media(min-width:480px){ .ev-grafico-wrap{ height:250px; } }
      .ev-sem-dados {
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        height:220px; color:#4b5563; font-size:0.88rem; gap:8px; text-align:center; line-height:1.6;
      }
      .ev-sem-dados span { font-size:2rem; }
      .ev-legenda { display:flex; align-items:center; gap:7px; font-size:0.76rem; color:#6b7280; }
      .ev-legenda-dot { width:9px; height:9px; border-radius:50%; background:#22c55e; flex-shrink:0; }
    `;
    document.head.appendChild(style);
  }

  // ── Referências DOM ──────────────────────────────────────────────────────
  const btnAnterior  = alvo.querySelector("#evBtnAnterior");
  const btnProximo   = alvo.querySelector("#evBtnProximo");
  const anoLabel     = alvo.querySelector("#evAnoLabel");
  const graficoWrap  = alvo.querySelector("#evGraficoWrap");
  const legendaTexto = alvo.querySelector("#evLegendaTexto");
  const pillBona     = alvo.querySelector('[data-modo="bona"]');
  const pillMetodo   = alvo.querySelector('[data-modo="metodo"]');

  // ── Prepara dados do ano/modo usando snapshotsMensais ───────────────────────
  function prepararDados(modo, ano) {
    const isBona = modo === "bona";

    // Filtrar snapshots do ano
    const doAno = snapshots.filter(s => s.ano === ano);

    // Se não há nenhum snapshot no ano, tenta mostrar valor atual
    if (!doAno.length) {
      const valorAtual = isBona ? (aluno.leitura || 0) : (aluno.metodo || 0);
      if (ano !== anoAtual || valorAtual === 0) return null;
      const maxEscala = escalaMax(valorAtual, isBona);
      return {
        labels:     ["Atual"],
        valores:    [valorAtual],
        tooltips:   [{ licao: "", origem: "atual" }],
        maxEscala
      };
    }

    // Montar mapa mes → snapshot (pega o mais recente se houver mais de 1)
    const porMes = {};
    doAno.forEach(s => {
      const mesInt = Number(s.mes);
      if (!porMes[mesInt] || s.chave > porMes[mesInt].chave) {
        porMes[mesInt] = s;
      }
    });

    const mesInt = Object.keys(porMes).map(Number).sort((a, b) => a - b);

    const labels   = [];
    const valores  = [];
    const tooltips = [];

    mesInt.forEach(m => {
      const s = porMes[m];
      labels.push(nomesMes[m - 1]);
      const val = isBona ? (s.leitura ?? 0) : (s.metodo ?? 0);
      valores.push(val);
      tooltips.push({
        mesNome:  nomesMesFull[m - 1],
        licao:    isBona ? (s.licaoLeitura || "") : (s.licaoMetodo || ""),
        metodo:   isBona ? (s.nomeMetodoLeitura || "Bona") : (s.nomeMetodoInstrumental || "-"),
        origem:   s.origem || "automatico"
      });
    });

    const maxValor  = Math.max(...valores, 1);
    const maxEscala = escalaMax(maxValor, isBona);
    return { labels, valores, tooltips, maxEscala };
  }

  function escalaMax(v, isBona) {
    if (isBona) return v <= 20 ? 30 : v <= 60 ? 80 : v <= 100 ? 120 : 150;
    return v <= 10 ? 20 : v <= 20 ? 30 : v <= 40 ? 50 : 60;
  }

  // ── Plugin badge no último ponto ──────────────────────────────────────────────
  function criarBadgePlugin(modo) {
    return {
      id: "badgePlugin",
      afterDatasetsDraw(c) {
        const meta = c.getDatasetMeta(0);
        if (!meta?.data?.length) return;
        const last  = meta.data[meta.data.length - 1];
        const { x, y } = last.getProps(["x","y"], true);
        const val = c.config.data.datasets[0].data.at(-1);
        const txt = `${modo === "bona" ? "Bona " : "Método "}${val}`;
        const cx  = c.ctx;
        cx.save();
        cx.font = "bold 11px system-ui, sans-serif";
        const tw = cx.measureText(txt).width;
        const pw = 8, bh = 22, bw = tw + pw * 2;
        const bx = Math.max(4, x - bw - 12);
        const by = y - bh / 2;
        const r  = 7;
        cx.fillStyle = "rgba(15,23,42,0.95)";
        cx.strokeStyle = "#22d3ee"; cx.lineWidth = 1.3;
        cx.beginPath();
        cx.moveTo(bx+r,by); cx.lineTo(bx+bw-r,by);
        cx.quadraticCurveTo(bx+bw,by,bx+bw,by+r);
        cx.lineTo(bx+bw,by+bh-r);
        cx.quadraticCurveTo(bx+bw,by+bh,bx+bw-r,by+bh);
        cx.lineTo(bx+r,by+bh);
        cx.quadraticCurveTo(bx,by+bh,bx,by+bh-r);
        cx.lineTo(bx,by+r);
        cx.quadraticCurveTo(bx,by,bx+r,by);
        cx.closePath();
        cx.fill(); cx.stroke();
        cx.fillStyle = "#a5f3fc"; cx.textBaseline = "middle";
        cx.fillText(txt, bx+pw, by+bh/2);
        cx.restore();
      }
    };
  }

  // ── Renderiza ───────────────────────────────────────────────────────────────
  function render() {
    const dados = prepararDados(modoAtual, anoSelecionado);
    legendaTexto.textContent =
      `Pegada mensal · ${modoAtual === "bona" ? "Bona" : "Método"} · ${anoSelecionado}`;

    if (!dados) {
      if (chartAtual) { chartAtual.destroy(); chartAtual = null; }
      graficoWrap.innerHTML = `
        <div class="ev-sem-dados">
          <span>💭</span>
          Nenhum registro em ${anoSelecionado}<br>
          <small style="color:#6b7280">A primeira pegada será criada automaticamente ao abrir o painel.</small>
        </div>`;
      return;
    }

    if (!graficoWrap.querySelector("canvas")) {
      graficoWrap.innerHTML = `<canvas id="evCanvas"></canvas>`;
    }

    const canvas = graficoWrap.querySelector("#evCanvas");
    const ctx    = canvas.getContext("2d");
    if (chartAtual) { chartAtual.destroy(); chartAtual = null; }

    const isMobile  = window.innerWidth < 480;
    const tooltips  = dados.tooltips || [];

    // Detectar pontos sem alteração (valor igual ao anterior)
    const pontosIguais = dados.valores.map((v, i) =>
      i > 0 && v === dados.valores[i - 1]
    );

    chartAtual = new Chart(ctx, {
      type: "line",
      data: {
        labels: dados.labels,
        datasets: [{
          label: modoAtual === "bona" ? "Leitura (Bona)" : "Método",
          data:  dados.valores,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.10)",
          // Pontos sem alteração ficam com borda tracejada (cor diferente)
          pointBackgroundColor: dados.valores.map((v, i) =>
            pontosIguais[i] ? "rgba(34,197,94,0.4)" : "#22c55e"
          ),
          pointBorderColor: dados.valores.map((v, i) =>
            pontosIguais[i] ? "#64748b" : "#052e16"
          ),
          pointBorderWidth: 2,
          pointRadius: isMobile ? 4 : 6,
          pointHoverRadius: isMobile ? 6 : 8,
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          spanGaps: true  // garante linha contínua mesmo com gaps
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", axis: "x", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15,23,42,0.97)",
            borderColor: "#22d3ee",
            borderWidth: 1,
            titleColor: "#a5f3fc",
            bodyColor: "#e2e8f0",
            padding: 12,
            displayColors: false,
            callbacks: {
              title: (items) => {
                const idx  = items[0].dataIndex;
                const info = tooltips[idx];
                return info ? `${info.mesNome || items[0].label} ${anoSelecionado}` : items[0].label;
              },
              label: (c) => {
                const idx  = c.dataIndex;
                const info = tooltips[idx];
                const linhas = [`  Nível: ${c.parsed.y}`];
                if (info?.licao)  linhas.push(`  Lição: ${info.licao}`);
                if (info?.metodo) linhas.push(`  Método: ${info.metodo}`);
                if (pontosIguais[idx]) linhas.push(`  → sem alteração no mês`);
                if (info?.origem === "retroativo") linhas.push(`  ⏰ lançado retroativamente`);
                return linhas;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: dados.maxEscala,
            ticks: { color: "#9ca3af", font: { size: isMobile ? 9 : 11 }, maxTicksLimit: 6 },
            grid:  { color: "rgba(55,65,81,0.4)" }
          },
          x: {
            ticks: {
              color: "#9ca3af",
              font: { size: isMobile ? 9 : 11 },
              maxRotation: 0, autoSkip: true,
              maxTicksLimit: isMobile ? 5 : 12
            },
            grid: { color: "rgba(31,41,55,0.5)" }
          }
        }
      },
      plugins: [criarBadgePlugin(modoAtual)]
    });
  }

  function atualizarBotoesAno() {
    anoLabel.textContent  = anoSelecionado;
    btnAnterior.disabled  = (anoSelecionado <= ANO_MIN);
    btnProximo.disabled   = (anoSelecionado >= ANO_MAX);
  }

  btnAnterior.addEventListener("click", () => {
    if (anoSelecionado > ANO_MIN) { anoSelecionado--; atualizarBotoesAno(); render(); }
  });
  btnProximo.addEventListener("click", () => {
    if (anoSelecionado < ANO_MAX) { anoSelecionado++; atualizarBotoesAno(); render(); }
  });
  pillBona.addEventListener("click", () => {
    modoAtual = "bona";
    pillBona.classList.add("ev-pill-ativo");
    pillMetodo.classList.remove("ev-pill-ativo");
    render();
  });
  pillMetodo.addEventListener("click", () => {
    modoAtual = "metodo";
    pillMetodo.classList.add("ev-pill-ativo");
    pillBona.classList.remove("ev-pill-ativo");
    render();
  });

  let _resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(render, 200);
  });

  atualizarBotoesAno();
  render();
};
