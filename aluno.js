// aluno.js
// ==========================================
// PAINEL DO ALUNO — Sistema Unificado
// Trabalha com a coleção "eventos" e o aluno
// Atualiza frequência, energia, conquistas e gráficos
// ==========================================

import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  obterEventosDoAno,
  agruparEventosPorMes,
  calcularFrequenciaMensalParaAluno,
  gerarPainelFrequencia
} from "./frequencia.js";

import { carregarLicoesAluno } from "./licoes.js";

/* ========================================================
    1. OBTER ALUNO LOGADO (pela URL)
   ======================================================== */
export async function carregarAlunoAtual() {
  const params = new URLSearchParams(window.location.search);
  const nomeAluno = params.get("nome");

  if (!nomeAluno) {
    // Se não houver nome na URL, redireciona para o login
    window.location.href = "index.html";
    return null;
  }

  const snap = await getDocs(collection(db, "alunos"));
  let alunoEncontrado = null;

  snap.forEach(d => {
    const dados = d.data();
    if (dados.nome === nomeAluno) {
      alunoEncontrado = { id: d.id, ...dados };
    }
  });

  if (!alunoEncontrado) {
    alert("Aluno não encontrado.");
    window.location.href = "index.html";
    return null;
  }

  return alunoEncontrado;
}

/* ========================================================
    2. EXIBIR DADOS DO ALUNO (Adaptado para o novo HTML)
   ======================================================== */
export function montarPainelAluno(aluno) {
  // Sidebar
  document.getElementById("nomeAluno").textContent = aluno.nome || "Aluno";
  document.getElementById("instrumentoAluno").textContent = aluno.instrumento || "Não definido";

  // Foto (IMG)
  const fotoImg = document.getElementById("fotoAluno");
  if (fotoImg) {
    fotoImg.src = aluno.foto || "https://via.placeholder.com/150";
    fotoImg.alt = `Foto de ${aluno.nome}`;
  }

  // Leitura e Método
  const leitura = aluno.leitura ?? 0;
  const metodo = aluno.metodo ?? 0;

  document.getElementById("nivelLeitura").textContent = leitura;
  document.getElementById("nivelMetodo").textContent = metodo;

  // NÍVEL TOTAL (soma)
  const nivel = leitura + metodo;
  document.getElementById("nivelGeral").textContent = nivel;

  // Modo Professor
  if (aluno.classificado === true) {
    document.getElementById("modoProfessorBtn").style.display = "block";
  }

  // Energia visual
  // O valor de energia será calculado em calcularEnergiaDoAluno
  // e não mais lido do aluno.
  // atualizarEnergiaVisual(aluno.energia ?? 10);
  
  // Conquistas (simulação)
  carregarConquistas(aluno.conquistas || {});
}

/* ========================================================
    3. ATUALIZAR ENERGIA NO PAINEL DO ALUNO (Adaptado para o novo HTML)
   ======================================================== */
export function atualizarEnergiaVisual(valor) {
  const barra = document.getElementById("barraEnergia");
  const numero = document.getElementById("valorEnergia");

  if (!barra || !numero) return;

  barra.style.width = valor + "%";
  numero.textContent = valor + "%";

  // Cores baseadas nas variáveis CSS (verde, amarelo, vermelho)
  if (valor >= 80) barra.style.backgroundColor = "var(--verde)";
  else if (valor >= 40) barra.style.backgroundColor = "var(--amarelo)";
  else barra.style.backgroundColor = "var(--vermelho)";
}

/* ========================================================
    4. CARREGAR GRÁFICO DE FREQUÊNCIA ANUAL
   ======================================================== */
// Mantido o código original, pois a lógica de dados é a mesma.
export async function montarGraficoFrequencia(aluno) {
  const anoAtual = new Date().getFullYear();

  const destinoGrafico = document.getElementById("gradeFrequencia");
  const destinoPopup = document.getElementById("popupFrequencia");

  if (!destinoGrafico) return;

  // O novo HTML usa o ID 'gradeFrequencia'
  await gerarPainelFrequencia(
    aluno,
    anoAtual,
    destinoGrafico,
    dadosPopup => abrirPopupFrequencia(dadosPopup, destinoPopup)
  );
}

/* ========================================================
    5. POPUP (detalhes do mês)
   ======================================================== */
// Mantido o código original, mas o HTML do popup foi simplificado no novo HTML.
export function abrirPopupFrequencia(info, destino) {
  if (!destino) return;

  const meses = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril",
    "05":"Maio","06":"Junho","07":"Julho","08":"Agosto",
    "09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro"
  };

  // O novo HTML usa a classe 'popup-content'
  destino.querySelector(".popup-content").innerHTML = `
    <h3>Frequência de ${meses[info.mes] || info.mes}</h3>

    <p>Chamadas no mês: <strong>${info.totalEventos}</strong></p>
    <p>Presente em: <strong>${info.presencasAluno}</strong></p>
    <p>Frequência: <strong>${info.percentual}%</strong></p>

    <button onclick="fecharPopupFrequencia()">Fechar</button>
  `;

  destino.style.display = "flex";
}

window.fecharPopupFrequencia = () => {
  document.getElementById("popupFrequencia").style.display = "none";
};

/* ========================================================
    6. CALCULAR ENERGIA DO ALUNO (baseado no mês atual)
   ======================================================== */
// Mantido o código original.
export async function calcularEnergiaDoAluno(aluno) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");

  const eventosAno = await obterEventosDoAno(ano);
  const grupos = agruparEventosPorMes(eventosAno);

  const chaveMes = `${ano}-${mesAtual}`;
  const eventosMes = grupos[chaveMes] || [];

  const freq = calcularFrequenciaMensalParaAluno(eventosMes, aluno.nome);

  const energia = freq.percentual; // Agora a energia é a frequência real

  atualizarEnergiaVisual(energia);

  return energia;
}

/* ========================================================
    7. INICIALIZAÇÃO DA PÁGINA DO ALUNO
   ======================================================== */
export async function iniciarPainelAluno() {
  const aluno = await carregarAlunoAtual();
  if (!aluno) return;

  montarPainelAluno(aluno);
  await montarGraficoFrequencia(aluno);
  await calcularEnergiaDoAluno(aluno);
  await carregarLicoesAluno(aluno.nome); // preenche a aba de lições
}

/* ========================================================
    8. FUNÇÕES DE POPUP DE SENHA (Simplificado)
   ======================================================== */
window.abrirPopup = () => {
  document.getElementById("popupSenha").style.display = "flex";
  document.getElementById("mensagemSenha").textContent = "";
  document.getElementById("novaSenha").value = "";
};

window.fecharPopup = () => {
  document.getElementById("popupSenha").style.display = "none";
};

window.salvarSenha = async () => {
  const novaSenha = document.getElementById("novaSenha").value;
  const mensagemSenha = document.getElementById("mensagemSenha");
  const aluno = await carregarAlunoAtual(); // Recarrega o aluno para obter o ID

  if (!novaSenha || novaSenha.length < 6) {
    mensagemSenha.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  if (aluno && aluno.id) {
    try {
      const alunoRef = doc(db, "alunos", aluno.id);
      await updateDoc(alunoRef, {
        senha: novaSenha // ATENÇÃO: Isso é inseguro em produção!
      });
      mensagemSenha.textContent = "Senha alterada com sucesso!";
      setTimeout(fecharPopup, 2000);
    } catch (error) {
      console.error("Erro ao salvar a senha:", error);
      mensagemSenha.textContent = "Erro ao salvar a senha. Tente novamente.";
    }
  }
};

/* ========================================================
    9. FUNÇÕES DE FOTO E MODO PROFESSOR
   ======================================================== */
window.enviarNovaFoto = () => {
  alert("Funcionalidade de upload de foto precisa ser implementada.");
  // A lógica de upload de foto precisa ser implementada, pois não estava no código original.
};

window.acessarModoProfessor = () => {
  window.location.href = "professor.html";
};

/* ========================================================
    10. CONQUISTAS (Simulação para o novo HTML)
   ======================================================== */
const mapaConquistas = {
  presencaPerfeita: { 
    icone: "⭐", 
    nome: "Presença Perfeita", 
    raridade: "lendaria",
    descricao: "Concedida a quem comparece a 100% dos ensaios do mês.",
    detalhes: ["Não faltar nenhum ensaio.", "Compromisso e constância exemplar.", "Atualizada mensalmente."]
  },
  leituraAlta: { 
    icone: "📘", 
    nome: "Leitor Dedicado", 
    raridade: "rara",
    descricao: "Atingida por alunos com Leitura ≥ 50 pontos.",
    detalhes: ["Estudo contínuo da leitura musical (BONA).", "Requer evolução técnica constante.", "Indicador de boa leitura rítmica e melódica."]
  },
  musicoPontual: { 
    icone: "🎯", 
    nome: "Músico Pontual", 
    raridade: "epica",
    descricao: "Obtida com frequência mensal acima de 80%.",
    detalhes: ["Comparecer na maioria dos ensaios.", "Evitar faltas repetidas.", "Reflete disciplina e responsabilidade."]
  },
  evolucaoConstante: { 
    icone: "🔥", 
    nome: "Evolução Constante", 
    raridade: "epica",
    descricao: "Conquistada quando Leitura + Método ≥ 100 pontos.",
    detalhes: ["Avanço equilibrado nas duas áreas.", "Indicador de estudo consistente.", "Mostra domínio progressivo."]
  },
  veteranoPalco: { 
    icone: "🎤", 
    nome: "Veterano de Palco", 
    raridade: "rara",
    descricao: "Para quem participou de 20 ou mais apresentações.",
    detalhes: ["Experiência em eventos oficiais.", "Presença em oportunidades musicais.", "Confiança no palco."]
  },
  lider: { 
    icone: "🧑‍🏫", 
    nome: "Líder", 
    raridade: "lendaria",
    descricao: "Conquista atribuída pelo professor ao aluno que demonstra postura de liderança.",
    detalhes: ["Líder de naipe / monitor / auxiliar.", "Critério: maturidade, cooperação e exemplo.", "Não é automática — depende do professor."]
  },
};

// ... outras conquistas
// Vou manter a simulação de dados, mas o mapa agora é mais completo.
// A chave 'metodoAlto' foi substituída por 'musicoPontual' e 'evolucaoConstante' para refletir o manual.
// A simulação será ajustada no próximo passo.
// A função carregarConquistas será ajustada no próximo passo.
// ...
// FUNÇÕES DE POPUP DE CONQUISTA
// ...
window.abrirPopupConquista = (key) => {
  const conquista = mapaConquistas[key];
  if (!conquista) return;

  document.getElementById("conquistaTitulo").textContent = conquista.nome;
  document.getElementById("conquistaIcone").textContent = conquista.icone;
  document.getElementById("conquistaDescricao").textContent = conquista.descricao;

  const ul = document.getElementById("conquistaDetalhes");
  ul.innerHTML = "";
  conquista.detalhes.forEach(detalhe => {
    const li = document.createElement("li");
    li.textContent = detalhe;
    ul.appendChild(li);
  });

  document.getElementById("popupConquista").style.display = "flex";
};

window.fecharPopupConquista = () => {
  document.getElementById("popupConquista").style.display = "none";
};

function carregarConquistas(conquistas) {
  const gradeConquistas = document.getElementById("grade-conquistas");
  if (!gradeConquistas) return;
  
  gradeConquistas.innerHTML = ""; // Limpa a grade

  // Garante que 'conquistas' é um objeto iterável
  const conquistasReais = conquistas || {};

  // Usa o objeto 'conquistas' passado como argumento (dados reais do aluno)
  // O objeto 'conquistas' deve ter o formato { nomeDaConquista: nivel, ... }
  // Ex: { presencaPerfeita: 2, leituraAlta: 1 }

  for (const key in conquistasReais) {
    const nivel = conquistas[key];
    if (nivel > 0 && mapaConquistas[key]) {
      const info = mapaConquistas[key];
      const card = document.createElement("div");
      card.className = `achievement-card ${info.raridade}`;
      card.setAttribute("onclick", `abrirPopupConquista('${key}')`); // Adiciona o onclick
      card.innerHTML = `
        <span class="achievement-icon">${info.icone}</span>
        <span class="achievement-name">${info.nome}</span>
        ${nivel > 1 ? `<span class="achievement-count">x${nivel}</span>` : ''}
      `;
      gradeConquistas.appendChild(card);
    }
  }
}

/* ========================================================
    11. EXECUTAR AUTOMATICAMENTE AO CARREGAR A PÁGINA
   ======================================================== */
document.addEventListener("DOMContentLoaded", iniciarPainelAluno);

// A função abrirModalEnviarLicao será implementada em licoes.js
// A função carregarLicoesAluno será implementada em licoes.js
// A função de navegação (como logout) será implementada em navegacao.js
