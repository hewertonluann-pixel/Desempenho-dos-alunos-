// ============================================================
//  Controle de Materiais – Filhos de Asafe
//  Firebase Firestore  |  Coleção: "materiais"
// ============================================================

import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query,
  orderBy, where, Timestamp, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import {
  getAuth, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ── Estado global ──────────────────────────────────────────
let todosRegistros = [];
let quantidade = 1;
let materialSelecionado = '';

// ── Inicialização ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setDataHoje();
  await carregarAlunos();
  await carregarHistorico();
});

function setDataHoje() {
  const inp = document.getElementById('inp-data');
  inp.value = new Date().toISOString().split('T')[0];
}

// ── Alunos ─────────────────────────────────────────────────
async function carregarAlunos() {
  try {
    const snap = await getDocs(query(collection(db, 'alunos'), orderBy('nome')));
    const sel = document.getElementById('sel-aluno');
    const relSel = document.getElementById('rel-aluno');
    sel.innerHTML = '<option value="">Selecione um aluno...</option>';
    relSel.innerHTML = '<option value="">Todos os alunos</option>';

    snap.forEach(doc => {
      const d = doc.data();
      const nome = d.nome || d.nomeCompleto || 'Sem nome';
      const opt = `<option value="${doc.id}" data-nome="${nome}">${nome}</option>`;
      sel.innerHTML += opt;
      relSel.innerHTML += `<option value="${doc.id}">${nome}</option>`;
    });
  } catch (e) {
    console.error('Erro ao carregar alunos:', e);
    document.getElementById('sel-aluno').innerHTML =
      '<option value="">Erro ao carregar alunos</option>';
  }
}

// ── Chips de material ──────────────────────────────────────
window.selectMaterial = function(chip) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  chip.classList.add('selected');
  materialSelecionado = chip.dataset.value;

  const grpQtd = document.getElementById('grp-quantidade');
  const grpOutro = document.getElementById('grp-outro');

  grpQtd.style.display = materialSelecionado === 'Palheta' ? 'block' : 'none';
  grpOutro.style.display = materialSelecionado === 'Outro' ? 'block' : 'none';
};

// ── Quantidade ─────────────────────────────────────────────
window.changeQty = function(delta) {
  quantidade = Math.max(1, Math.min(50, quantidade + delta));
  document.getElementById('qty-display').textContent = quantidade;
};

// ── Salvar Registro ────────────────────────────────────────
window.salvarRegistro = async function() {
  const alunoSel = document.getElementById('sel-aluno');
  const alunoId = alunoSel.value;
  const alunoNome = alunoSel.options[alunoSel.selectedIndex]?.dataset.nome || '';
  const data = document.getElementById('inp-data').value;
  const obs = document.getElementById('inp-obs').value.trim();

  if (!alunoId) return showToast('Selecione um aluno!', true);
  if (!materialSelecionado) return showToast('Selecione o tipo de material!', true);
  if (!data) return showToast('Informe a data!', true);

  let material = materialSelecionado;
  if (material === 'Outro') {
    const txt = document.getElementById('txt-outro').value.trim();
    if (!txt) return showToast('Descreva o material!', true);
    material = txt;
  }

  const btn = document.getElementById('btn-salvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataTimestamp = Timestamp.fromDate(new Date(ano, mes - 1, dia));

    await addDoc(collection(db, 'materiais'), {
      alunoId,
      alunoNome,
      material,
      tipo: getTipo(material),
      quantidade: material === 'Palheta' ? quantidade : 1,
      data: dataTimestamp,
      obs,
      criadoEm: serverTimestamp()
    });

    showToast('✅ Registro salvo com sucesso!');
    resetForm();
    await carregarHistorico();
  } catch (e) {
    console.error(e);
    showToast('Erro ao salvar. Tente novamente.', true);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Salvar Registro';
  }
};

function getTipo(material) {
  if (material === 'Palheta') return 'palheta';
  if (material.startsWith('Saxofone')) return 'saxofone';
  if (material === 'Clarinete') return 'clarinete';
  return 'outro';
}

function resetForm() {
  document.getElementById('sel-aluno').value = '';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  materialSelecionado = '';
  quantidade = 1;
  document.getElementById('qty-display').textContent = '1';
  document.getElementById('grp-quantidade').style.display = 'none';
  document.getElementById('grp-outro').style.display = 'none';
  document.getElementById('txt-outro').value = '';
  document.getElementById('inp-obs').value = '';
  document.getElementById('obs-counter').textContent = '0/120';
  setDataHoje();
}

// ── Histórico ──────────────────────────────────────────────
async function carregarHistorico() {
  try {
    const snap = await getDocs(
      query(collection(db, 'materiais'), orderBy('data', 'desc'))
    );
    todosRegistros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    aplicarFiltros();
  } catch (e) {
    console.error('Erro histórico:', e);
  }
}

window.aplicarFiltros = function() {
  const filMat = document.getElementById('fil-material').value;
  const filMes = document.getElementById('fil-mes').value; // 'YYYY-MM'

  let lista = [...todosRegistros];

  if (filMat) {
    lista = lista.filter(r => {
      if (filMat === 'Saxofone') return r.tipo === 'saxofone';
      if (filMat === 'Outro') return r.tipo === 'outro';
      return r.material === filMat;
    });
  }

  if (filMes) {
    const [ano, mes] = filMes.split('-').map(Number);
    lista = lista.filter(r => {
      const d = r.data?.toDate ? r.data.toDate() : new Date(r.data);
      return d.getFullYear() === ano && d.getMonth() + 1 === mes;
    });
  }

  renderTabela(lista);
};

function renderTabela(lista) {
  const tbody = document.getElementById('tbody-historico');
  const wrap = document.getElementById('wrap-tabela');
  const empty = document.getElementById('empty-historico');
  const loader = document.getElementById('loader-historico');

  loader.style.display = 'none';

  if (!lista.length) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  wrap.style.display = 'block';

  tbody.innerHTML = lista.map(r => {
    const d = r.data?.toDate ? r.data.toDate() : new Date(r.data);
    const dataStr = d.toLocaleDateString('pt-BR');
    return `<tr>
      <td>${dataStr}</td>
      <td>${r.alunoNome || '–'}</td>
      <td><span class="badge ${r.tipo || ''}">${r.material}</span></td>
      <td>${r.quantidade || 1}</td>
      <td style="color:var(--muted);font-size:.8rem">${r.obs || '–'}</td>
    </tr>`;
  }).join('');
}

// ── Relatório ──────────────────────────────────────────────
window.carregarRelatorio = function() {
  const periodo = document.getElementById('rel-periodo').value;
  const alunoFil = document.getElementById('rel-aluno').value;
  const loader = document.getElementById('loader-relatorio');
  const conteudo = document.getElementById('conteudo-relatorio');

  loader.style.display = 'block';
  conteudo.style.display = 'none';

  let lista = [...todosRegistros];

  // Filtro período
  const agora = new Date();
  if (periodo === 'mes') {
    lista = lista.filter(r => {
      const d = r.data?.toDate ? r.data.toDate() : new Date(r.data);
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    });
  } else if (periodo === 'ano') {
    lista = lista.filter(r => {
      const d = r.data?.toDate ? r.data.toDate() : new Date(r.data);
      return d.getFullYear() === agora.getFullYear();
    });
  }

  // Filtro aluno
  if (alunoFil) lista = lista.filter(r => r.alunoId === alunoFil);

  // Stats por tipo
  const palhetas = lista.filter(r => r.tipo === 'palheta');
  const saxofones = lista.filter(r => r.tipo === 'saxofone');
  const clarinetes = lista.filter(r => r.tipo === 'clarinete');

  const sumQtd = arr => arr.reduce((a, r) => a + (r.quantidade || 1), 0);

  document.getElementById('stat-total').textContent = lista.length;
  document.getElementById('stat-palhetas').textContent = sumQtd(palhetas);
  document.getElementById('stat-saxofones').textContent = saxofones.length;
  document.getElementById('stat-clarinetes').textContent = clarinetes.length;

  // Ranking alunos
  const porAluno = {};
  lista.forEach(r => {
    if (!porAluno[r.alunoNome]) porAluno[r.alunoNome] = 0;
    porAluno[r.alunoNome]++;
  });
  const ranking = Object.entries(porAluno)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  document.getElementById('ranking-alunos').innerHTML =
    ranking.length
      ? ranking.map(([nome, qtd]) =>
          `<li><span class="rank-name">${nome}</span><span class="rank-badge">${qtd} entrega${qtd > 1 ? 's' : ''}</span></li>`
        ).join('')
      : '<li style="color:var(--muted)">Sem dados.</li>';

  // Detalhes por material
  const porMat = {};
  lista.forEach(r => {
    if (!porMat[r.material]) porMat[r.material] = { entregas: 0, qtd: 0 };
    porMat[r.material].entregas++;
    porMat[r.material].qtd += r.quantidade || 1;
  });
  const rows = Object.entries(porMat).sort((a, b) => b[1].entregas - a[1].entregas);
  document.getElementById('tbody-relatorio').innerHTML =
    rows.length
      ? rows.map(([mat, v]) =>
          `<tr><td>${mat}</td><td>${v.entregas}</td><td>${v.qtd}</td></tr>`
        ).join('')
      : '<tr><td colspan="3" style="text-align:center;color:var(--muted)">Sem dados.</td></tr>';

  loader.style.display = 'none';
  conteudo.style.display = 'block';
};

// ── Tabs ───────────────────────────────────────────────────
window.showTab = function(tab, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'relatorio') carregarRelatorio();
};

// ── Toast ──────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.className = 'toast', 3000);
}
