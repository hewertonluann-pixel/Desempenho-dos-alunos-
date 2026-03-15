// ==========================================
// NOTIFICAÇÕES - Sistema de Atividades Recentes
// ==========================================

import { db } from "./firebase-config.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

/**
 * Verifica se o usuário logado é professor.
 * Um aluno é considerado professor quando classificado === true.
 */
function isProfessor() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioAtual") || "{}");
    return usuario?.classificado === true;
  } catch {
    return false;
  }
}

/**
 * Remove tags HTML e retorna texto puro formatado para WhatsApp
 * <strong>texto</strong> → *texto*
 * <em>texto</em>       → _texto_
 */
function htmlParaWhatsApp(html) {
  return html
    .replace(/<strong>(.*?)<\/strong>/gi, "*$1*")
    .replace(/<em>(.*?)<\/em>/gi, "_$1_")
    .replace(/<[^>]+>/g, "");
}

/**
 * Formata o tempo relativo (ex: "há 2 minutos", "há 1 hora")
 */
function formatarTempoRelativo(dataFirebase) {
  if (!dataFirebase) return "agora mesmo";

  const data = dataFirebase instanceof Timestamp
    ? dataFirebase.toDate()
    : new Date(dataFirebase);

  const agora = new Date();
  const diferencaMs = agora - data;
  const diferencaSegundos = Math.floor(diferencaMs / 1000);
  const diferencaMinutos = Math.floor(diferencaSegundos / 60);
  const diferencaHoras = Math.floor(diferencaMinutos / 60);
  const diferencaDias = Math.floor(diferencaHoras / 24);

  if (diferencaSegundos < 60) return "agora mesmo";
  if (diferencaMinutos < 60) return `há ${diferencaMinutos} minuto${diferencaMinutos > 1 ? 's' : ''}`;
  if (diferencaHoras < 24) return `há ${diferencaHoras} hora${diferencaHoras > 1 ? 's' : ''}`;
  if (diferencaDias < 7) return `há ${diferencaDias} dia${diferencaDias > 1 ? 's' : ''}`;

  return data.toLocaleDateString('pt-BR');
}

/**
 * Adiciona uma notificação à lista (sempre no topo).
 * Para notificações de nível quando o usuário é professor,
 * o item inteiro é clicável e copia o texto formatado para WhatsApp.
 */
export function adicionarNotificacao(tipo, icone, texto, tempo = null) {
  const lista = document.getElementById("listaNotificacoes");
  if (!lista) return;

  const professor = isProfessor();
  const ehNivel = tipo === "nivel";
  const clicavel = ehNivel && professor;

  const li = document.createElement("li");
  li.className = `notificacao ${tipo}${clicavel ? " copiavel" : ""}`;

  if (clicavel) {
    li.title = "Clique para copiar para o WhatsApp";
    li.style.cssText = "cursor:pointer; transition: opacity 0.15s;";

    li.addEventListener("click", function () {
      const msg = `🚀 ${htmlParaWhatsApp(texto)} ✨`;
      navigator.clipboard.writeText(msg).then(() => {
        // Feedback visual: pisca verde por 1.5s
        const estiloOriginal = li.style.cssText;
        li.style.cssText = "cursor:pointer; transition: background 0.15s; background: rgba(37,211,102,0.18); border-radius: 8px;";
        setTimeout(() => { li.style.cssText = estiloOriginal; }, 1500);

        // Toast de confirmação
        const toast = document.createElement("span");
        toast.textContent = "Texto copiado! ";
        toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#25D366;color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;z-index:9999;pointer-events:none;";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      });
    });
  }

  li.innerHTML = `
    <span class="icone">${icone}</span>
    <div class="conteudo">
      ${texto} <small>${tempo || "agora mesmo"}</small>
    </div>
  `;

  lista.prepend(li);

  // Limitar a 50 notificações na tela
  while (lista.children.length > 50) {
    lista.removeChild(lista.lastChild);
  }
}

/**
 * Carrega notificações de atividades recentes com ordenação global correta
 */
export async function carregarNotificacoes() {
  const lista = document.getElementById("listaNotificacoes");
  if (!lista) return;

  try {
    const todasNotificacoes = [];

    // Buscar lições — apenas envios
    const licoesSnap = await getDocs(query(collection(db, "licoes"), orderBy("dataEnvio", "desc"), limit(15)));
    licoesSnap.forEach(doc => {
      const d = doc.data();
      const nomeAluno = d.alunoNome || d.nomeAluno || "Aluno";
      todasNotificacoes.push({
        data: d.dataEnvio,
        tipo: "envio",
        icone: "📘",
        texto: `<strong>${nomeAluno}</strong> enviou a lição <em>${d.titulo || "Sem título"}</em>`
      });
    });

    // Buscar downloads
    const downloadsSnap = await getDocs(query(collection(db, "downloads"), orderBy("data", "desc"), limit(10)));
    downloadsSnap.forEach(doc => {
      const d = doc.data();
      todasNotificacoes.push({
        data: d.data,
        tipo: "download",
        icone: "⬇️",
        texto: `<strong>${d.nomeAluno || "Aluno"}</strong> baixou: <em>${d.nomeArquivo || "Arquivo"}</em>`
      });
    });

    // Buscar notificações de nível
    const niveisSnap = await getDocs(
      query(collection(db, "notificacoes"), orderBy("data", "desc"), limit(20))
    );
    niveisSnap.forEach(doc => {
      const d = doc.data();
      todasNotificacoes.push({
        data: d.data,
        tipo: d.tipo || "nivel",
        icone: d.icone || "🚀",
        texto: d.texto || `<strong>${d.alunoNome || "Aluno"}</strong> avançou de nível`
      });
    });

    // Ordenar da mais antiga para mais recente
    todasNotificacoes.sort((a, b) => {
      const dateA = a.data instanceof Timestamp ? a.data.toDate() : new Date(a.data);
      const dateB = b.data instanceof Timestamp ? b.data.toDate() : new Date(b.data);
      return dateA - dateB;
    });

    lista.innerHTML = "";
    todasNotificacoes.forEach(n => {
      adicionarNotificacao(n.tipo, n.icone, n.texto, formatarTempoRelativo(n.data));
    });

    // Listeners em tempo real
    const agora = Timestamp.now();

    onSnapshot(query(collection(db, "licoes"), orderBy("dataEnvio", "desc"), limit(1)), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const licao = change.doc.data();
          const nomeAluno = licao.alunoNome || licao.nomeAluno || "Aluno";
          if (licao.dataEnvio && licao.dataEnvio.toMillis() > agora.toMillis()) {
            adicionarNotificacao("envio", "📘", `<strong>${nomeAluno}</strong> enviou a lição <em>${licao.titulo || "Sem título"}</em>`, "agora mesmo");
          }
        }
      });
    });

    onSnapshot(query(collection(db, "downloads"), orderBy("data", "desc"), limit(1)), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const d = change.doc.data();
          if (d.data && d.data.toMillis() > agora.toMillis()) {
            adicionarNotificacao("download", "⬇️", `<strong>${d.nomeAluno || "Aluno"}</strong> baixou: <em>${d.nomeArquivo || "Arquivo"}</em>`, "agora mesmo");
          }
        }
      });
    });

    onSnapshot(
      query(collection(db, "notificacoes"), orderBy("data", "desc"), limit(1)),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const d = change.doc.data();
            if (d.data && d.data.toMillis() > agora.toMillis()) {
              adicionarNotificacao(
                d.tipo || "nivel",
                d.icone || "🚀",
                d.texto || `<strong>${d.alunoNome || "Aluno"}</strong> avançou de nível`,
                "agora mesmo"
              );
            }
          }
        });
      }
    );

  } catch (erro) {
    console.error("Erro ao carregar notificações:", erro);
  }
}

/**
 * Função para teste: adiciona notificações mock
 */
export function adicionarNotificacaoTeste(tipo = "envio") {
  const tipos = {
    envio:    { icone: "📘", texto: "<strong>Aluno Teste</strong> enviou a lição <em>Método 20</em>" },
    download: { icone: "⬇️", texto: "<strong>Aluno Teste</strong> baixou o método <em>Arban Completo</em>" },
    nivel:    { icone: "🚀", texto: "<strong>Aluno Teste</strong> avançou para o <em>Nível 35</em> de leitura" }
  };

  const notif = tipos[tipo] || tipos.envio;
  adicionarNotificacao(tipo, notif.icone, notif.texto);
}

window.adicionarNotificacaoTeste = adicionarNotificacaoTeste;
