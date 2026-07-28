// combos.js
// Módulo de cálculo de combos de presença/falta para o relatório de chamada
// Status possíveis: "P" (presente), "F" (falta não justificada), "FJ" (falta justificada)

/**
 * Calcula métricas de combo (sequência) a partir do histórico cronológico de um aluno.
 * @param {Array<{data: string, status: 'P'|'F'|'FJ'}>} historico - ordenado do mais antigo para o mais recente
 * @returns {Object} métricas calculadas
 */
function calcularMetricasCombo(historico = []) {
    let comboPresencaAtual = 0;
    let comboFaltaAtual = 0;
    let recordePresenca = 0;
    let recordeFalta = 0;
    let faltasNaoJustificadas = 0;
    let totalJustificadas = 0;
    let totalPresencas = 0;

    for (const item of historico) {
        const status = item.status;

        if (status === 'P') {
            comboPresencaAtual += 1;
            comboFaltaAtual = 0;
            recordePresenca = Math.max(recordePresenca, comboPresencaAtual);
            totalPresencas += 1;
        } else if (status === 'F') {
            comboFaltaAtual += 1;
            comboPresencaAtual = 0;
            faltasNaoJustificadas += 1;
            recordeFalta = Math.max(recordeFalta, comboFaltaAtual);
        } else if (status === 'FJ') {
            // Falta justificada: quebra ambos os combos, mas não penaliza
            comboPresencaAtual = 0;
            comboFaltaAtual = 0;
            totalJustificadas += 1;
        }
    }

    return {
        comboPresencaAtual,
        comboFaltaAtual,
        recordePresenca,
        recordeFalta,
        faltasNaoJustificadas,
        totalJustificadas,
        totalPresencas,
        totalEnsaios: historico.length
    };
}

/**
 * Define o nível/badge do combo atual de presença, para exibição gamificada.
 * @param {number} comboPresencaAtual
 * @returns {{nivel: string, cor: string, icone: string}}
 */
function classificarNivelCombo(comboPresencaAtual) {
    if (comboPresencaAtual >= 10) {
        return { nivel: 'Lendário', cor: '#facc15', icone: '🏆' };
    }
    if (comboPresencaAtual >= 5) {
        return { nivel: 'Forte', cor: '#22c55e', icone: '🔥' };
    }
    if (comboPresencaAtual >= 3) {
        return { nivel: 'Em ritmo', cor: '#38bdf8', icone: '🔥' };
    }
    if (comboPresencaAtual >= 1) {
        return { nivel: 'Inicial', cor: '#94a3b8', icone: '🔥' };
    }
    return { nivel: 'Sem sequência', cor: '#64748b', icone: '➖' };
}

/**
 * Gera alerta de risco com base em faltas seguidas não justificadas.
 * @param {number} comboFaltaAtual
 * @returns {{alerta: boolean, mensagem: string, nivel: 'atencao'|'risco'|null}}
 */
function avaliarAlertaFalta(comboFaltaAtual) {
    if (comboFaltaAtual >= 3) {
        return { alerta: true, mensagem: '🚨 Risco: 3+ faltas seguidas sem justificativa', nivel: 'risco' };
    }
    if (comboFaltaAtual >= 2) {
        return { alerta: true, mensagem: '⚠️ Atenção: 2 faltas seguidas sem justificativa', nivel: 'atencao' };
    }
    return { alerta: false, mensagem: '', nivel: null };
}

/**
 * Renderiza os últimos N registros do histórico como ícones, para exibição compacta.
 * @param {Array<{status: string}>} historico
 * @param {number} limite
 * @returns {string}
 */
function renderHistoricoIcones(historico = [], limite = 8) {
    return historico.slice(-limite).map(item => {
        if (item.status === 'P') return '✅';
        if (item.status === 'FJ') return '🟠';
        return '❌';
    }).join('');
}

/**
 * Verifica conquistas desbloqueadas com base nas métricas de combo.
 * Pensado para integrar com conquistas.js.
 * @param {Object} metricas - retorno de calcularMetricasCombo
 * @returns {Array<{id: string, titulo: string, icone: string}>}
 */
function verificarConquistasCombo(metricas) {
    const conquistas = [];

    if (metricas.recordePresenca >= 3) {
        conquistas.push({ id: 'fiel', titulo: 'Fiel — 3 ensaios seguidos', icone: '🔥' });
    }
    if (metricas.recordePresenca >= 5) {
        conquistas.push({ id: 'dedicado', titulo: 'Dedicado — 5 ensaios seguidos', icone: '🔥🔥' });
    }
    if (metricas.recordePresenca >= 10) {
        conquistas.push({ id: 'inabalavel', titulo: 'Inabalável — 10 ensaios seguidos', icone: '🏆' });
    }
    if (metricas.comboFaltaAtual >= 2) {
        conquistas.push({ id: 'atencao', titulo: 'Atenção — 2 faltas seguidas', icone: '⚠️' });
    }
    if (metricas.comboFaltaAtual >= 3) {
        conquistas.push({ id: 'risco', titulo: 'Risco — 3 faltas seguidas', icone: '🚨' });
    }

    return conquistas;
}

/**
 * Monta o bloco HTML de combo para inserir no card do relatório exportável.
 * Compatível com o container gerado em exportar-chamada.js antes do html2canvas.
 * @param {string} nomeAluno
 * @param {'P'|'F'|'FJ'} statusHoje
 * @param {Array<{status: string}>} historico
 * @returns {string} HTML do card
 */
function renderCardComboHTML(nomeAluno, statusHoje, historico = []) {
    const metricas = calcularMetricasCombo(historico);
    const nivel = classificarNivelCombo(metricas.comboPresencaAtual);
    const alerta = avaliarAlertaFalta(metricas.comboFaltaAtual);

    const badgeHoje =
        statusHoje === 'P' ? '✅ Presente' :
        statusHoje === 'FJ' ? '🟠 Justificada' :
        '❌ Ausente';

    return `
        <div style="background:#111827;border:1px solid #334155;border-radius:24px;padding:24px;margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
                <div>
                    <div style="font-size:26px;font-weight:700;color:#f8fafc;">${nomeAluno}</div>
                    <div style="font-size:15px;color:#94a3b8;margin-top:4px;">Status no ensaio: ${badgeHoje}</div>
                </div>
                <div style="background:${nivel.cor}22;color:${nivel.cor};padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;">
                    ${nivel.icone} ${nivel.nivel}
                </div>
            </div>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px;">
                <div style="background:#0f172a;padding:14px;border-radius:16px;">
                    <div style="font-size:12px;color:#94a3b8;">Combo atual</div>
                    <div style="font-size:26px;font-weight:800;color:#22c55e;">🔥 ${metricas.comboPresencaAtual}</div>
                </div>
                <div style="background:#0f172a;padding:14px;border-radius:16px;">
                    <div style="font-size:12px;color:#94a3b8;">Recorde</div>
                    <div style="font-size:26px;font-weight:800;color:#facc15;">🏆 ${metricas.recordePresenca}</div>
                </div>
                <div style="background:#0f172a;padding:14px;border-radius:16px;">
                    <div style="font-size:12px;color:#94a3b8;">Faltas seguidas</div>
                    <div style="font-size:26px;font-weight:800;color:#ef4444;">${metricas.comboFaltaAtual}</div>
                </div>
                <div style="background:#0f172a;padding:14px;border-radius:16px;">
                    <div style="font-size:12px;color:#94a3b8;">Sem justificativa</div>
                    <div style="font-size:26px;font-weight:800;color:#fb7185;">${metricas.faltasNaoJustificadas}</div>
                </div>
            </div>

            ${alerta.alerta ? `
            <div style="margin-top:14px;background:#7f1d1d22;color:#fca5a5;padding:10px 14px;border-radius:12px;font-size:14px;">
                ${alerta.mensagem}
            </div>` : ''}

            <div style="margin-top:16px;background:#0b1220;padding:12px 14px;border-radius:14px;">
                <div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">Histórico recente</div>
                <div style="font-size:26px;letter-spacing:5px;">${renderHistoricoIcones(historico)}</div>
                <div style="font-size:12px;color:#64748b;margin-top:6px;">
                    ✅ presente &nbsp;·&nbsp; ❌ falta não justificada &nbsp;·&nbsp; 🟠 falta justificada
                </div>
            </div>
        </div>
    `;
}

// Exporta para uso em outros arquivos (exportar-chamada.js, ensaio.html, conquistas.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calcularMetricasCombo,
        classificarNivelCombo,
        avaliarAlertaFalta,
        renderHistoricoIcones,
        verificarConquistasCombo,
        renderCardComboHTML
    };
}
