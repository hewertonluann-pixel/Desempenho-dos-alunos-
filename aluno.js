import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.1.0/firebase-storage.js";

// Inicialização do Firebase (assumindo que está em firebase-config.js)
import "./firebase-config.js";

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

let alunoID = null;
let alunoData = null;

// ============================================================
// FUNÇÕES DE CARREGAMENTO DE DADOS
// ============================================================

// Função principal para carregar os dados do aluno
async function carregarDadosAluno(uid) {
  const alunoRef = doc(db, "alunos", uid);
  const docSnap = await getDoc(alunoRef);

  if (docSnap.exists()) {
    alunoData = docSnap.data();
    alunoID = uid;
    exibirDadosAluno(alunoData);
    verificarModoProfessor(alunoData);
    carregarConquistas(alunoData.conquistas || {});
    carregarFrequenciaAnual(alunoData.frequenciaAnual || {});
    // Outras funções de carregamento (lições, etc.)
  } else {
    console.error("Nenhum dado encontrado para o aluno.");
    // Redirecionar para login ou exibir erro
  }
}

// Exibe os dados básicos do aluno na interface
function exibirDadosAluno(data) {
  document.getElementById("nomeAluno").textContent = data.nome || "Aluno";
  document.getElementById("instrumentoAluno").textContent = data.instrumento || "Não definido";
  document.getElementById("nivelGeral").textContent = (data.leitura || 0) + (data.metodo || 0);
  document.getElementById("nivelLeitura").textContent = data.leitura || 0;
  document.getElementById("nivelMetodo").textContent = data.metodo || 0;

  // Foto do aluno
  const fotoAluno = document.getElementById("fotoAluno");
  if (data.foto) {
    fotoAluno.src = data.foto;
  } else {
    // Foto padrão
    fotoAluno.src = "icon-192.png";
  }

  // Energia (Frequência Mensal)
  const energia = data.frequenciaMensal?.porcentagem || 0;
  document.getElementById("valorEnergia").textContent = energia;
  const barraEnergia = document.getElementById("barraEnergia");
  barraEnergia.style.width = `${energia}%`;
  
  // Mudar cor da barra de energia
  // ATENÇÃO: As variáveis CSS --vermelho, --amarelo, --verde não estão definidas no aluno.css
  // O código original usava cores hardcoded ou variáveis diferentes.
  // Vou manter o código como está, mas o usuário pode precisar definir essas variáveis no CSS.
  if (energia < 40) {
    barraEnergia.style.backgroundColor = "var(--vermelho)";
  } else if (energia >= 40 && energia <= 80) {
    barraEnergia.style.backgroundColor = "var(--amarelo)";
  } else {
    barraEnergia.style.backgroundColor = "var(--verde)";
  }
}

// Verifica se o aluno pode acessar o modo professor
function verificarModoProfessor(data) {
  if (data.classificado) {
    document.getElementById("modoProfessorBtn").style.display = "block";
  }
}

// ============================================================
// CONQUISTAS
// ============================================================

// Mapeamento de conquistas (exemplo simplificado)
const mapaConquistas = {
  presencaPerfeita: { icone: "⭐", nome: "Presença Perfeita", raridade: "lendaria" },
  leituraAlta: { icone: "📘", nome: "Leitura Avançada", raridade: "rara" },
  metodoAlto: { icone: "🎯", nome: "Método Concluído", raridade: "epica" },
  // ... outras conquistas
};

function carregarConquistas(conquistas) {
  const gradeConquistas = document.getElementById("grade-conquistas");
  gradeConquistas.innerHTML = ""; // Limpa a grade

  for (const key in conquistas) {
    if (conquistas[key] > 0 && mapaConquistas[key]) {
      const info = mapaConquistas[key];
      const card = document.createElement("div");
      card.className = `achievement-card ${info.raridade}`;
      card.innerHTML = `
        <span class="achievement-icon">${info.icone}</span>
        <span class="achievement-name">${info.nome}</span>
        ${conquistas[key] > 1 ? `<span class="achievement-count">x${conquistas[key]}</span>` : ''}
      `;
      gradeConquistas.appendChild(card);
    }
  }
}

// ============================================================
// FREQUÊNCIA ANUAL
// ============================================================

function carregarFrequenciaAnual(frequenciaAnual) {
  const gradeFrequencia = document.getElementById("gradeFrequencia");
  const anoAtualTexto = document.getElementById("anoAtualTexto");
  const anoAtual = new Date().getFullYear();
  
  anoAtualTexto.textContent = anoAtual;
  gradeFrequencia.innerHTML = ""; // Limpa a grade

  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  meses.forEach((mes, index) => {
    const mesData = frequenciaAnual[index + 1] || { porcentagem: 0, total: 0, presencas: 0 };
    const porcentagem = mesData.porcentagem || 0;
    
    const card = document.createElement("div");
    card.className = "month-card";
    card.setAttribute("data-mes", mes);
    card.setAttribute("data-porcentagem", porcentagem);
    card.innerHTML = `
      <div class="month-name">${mes}</div>
      <div class="month-progress" style="--p:${porcentagem};">
        <div class="progress-circle"></div>
        <span class="progress-value">${porcentagem}%</span>
      </div>
    `;
    gradeFrequencia.appendChild(card);
    
    // Adicionar evento de clique para o popup (implementação simplificada)
    card.addEventListener('click', () => abrirPopupFrequencia(mes, mesData));
  });
}

function abrirPopupFrequencia(mes, data) {
  const popup = document.getElementById("popupFrequencia");
  const content = popup.querySelector(".popup-content");
  
  content.innerHTML = `
    <h3>Frequência de ${mes}</h3>
    <p>Porcentagem: ${data.porcentagem || 0}%</p>
    <p>Presenças: ${data.presencas || 0}</p>
    <p>Total de Ensaios: ${data.total || 0}</p>
    <button onclick="fecharPopupFrequencia()">Fechar</button>
  `;
  popup.style.display = "flex";
}

window.fecharPopupFrequencia = () => {
  document.getElementById("popupFrequencia").style.display = "none";
};

// ============================================================
// ALTERAR SENHA
// ============================================================

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

  if (!novaSenha || novaSenha.length < 6) {
    mensagemSenha.textContent = "A senha deve ter pelo menos 6 caracteres.";
    return;
  }

  if (alunoID) {
    try {
      const alunoRef = doc(db, "alunos", alunoID);
      // No Firestore, a senha é salva como um campo do documento do aluno
      // ATENÇÃO: Em um sistema real, a senha deve ser hasheada no backend.
      // Aqui, estamos apenas simulando a atualização do campo 'senha'.
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

// ============================================================
// ALTERAR FOTO
// ============================================================

window.enviarNovaFoto = async () => {
  const fileInput = document.getElementById("novaFoto");
  const file = fileInput.files[0];

  if (!file || !alunoID) return;

  const storageRef = ref(storage, `fotos_alunos/${alunoID}/${file.name}`);

  try {
    // 1. Upload da imagem
    await uploadBytes(storageRef, file);
    
    // 2. Obter a URL de download
    const fotoURL = await getDownloadURL(storageRef);

    // 3. Atualizar o Firestore com a nova URL
    const alunoRef = doc(db, "alunos", alunoID);
    await updateDoc(alunoRef, {
      foto: fotoURL
    });

    // 4. Atualizar a interface
    document.getElementById("fotoAluno").src = fotoURL;
    alert("Foto atualizada com sucesso!");

  } catch (error) {
    console.error("Erro ao atualizar a foto:", error);
    alert("Erro ao atualizar a foto. Verifique o console.");
  }
};

// ============================================================
// MODO PROFESSOR
// ============================================================

window.acessarModoProfessor = () => {
  // Redireciona para a página do professor
  window.location.href = "professor.html";
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================

onAuthStateChanged(auth, (user) => {
  if (user) {
    // O usuário está logado
    carregarDadosAluno(user.uid);
  } else {
    // O usuário não está logado, redireciona para a página de login
    window.location.href = "index.html";
  }
});

// A função abrirModalEnviarLicao será implementada em licoes.js
// A função carregarLicoes será implementada em licoes.js
// A função de navegação (como logout) será implementada em navegacao.js
