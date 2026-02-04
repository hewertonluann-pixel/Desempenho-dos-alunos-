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
 * Adiciona uma notificação à lista
 */
export function adicionarNotificacao(tipo, icone, texto, tempo = null) {
  const lista = document.getElementById("listaNotificacoes");
  if (!lista) return;

  const li = document.createElement("li");
  li.className = `notificacao ${tipo}`;
  li.innerHTML = `
    <span class="icone">${icone}</span>
    <div class="conteudo">
      ${texto}
      <small>${tempo || "agora mesmo"}</small>
    </div>
  `;
  
  lista.prepend(li);

  // Limitar a 50 notificações na tela
  while (lista.children.length > 50) {
    lista.removeChild(lista.lastChild);
  }
}

/**
 * Carrega notificações de atividades recentes (lições, downloads, níveis)
 */
export async function carregarNotificacoes() {
  const lista = document.getElementById("listaNotificacoes");
  if (!lista) return;

  try {
    // Buscar lições recentes (últimas 10)
    const licoesRef = collection(db, "licoes");
    const licoesQuery = query(
      licoesRef,
      orderBy("dataEnvio", "desc"),
      limit(10)
    );

    onSnapshot(licoesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const licao = change.doc.data();
        
        if (change.type === "added") {
          const tempoFormatado = formatarTempoRelativo(licao.dataEnvio);
          adicionarNotificacao(
            "envio",
            "📘",
            `<strong>${licao.nomeAluno || "Aluno"}</strong> enviou a lição <em>${licao.titulo || "Sem título"}</em>`,
            tempoFormatado
          );
        }
        
        if (change.type === "modified" && licao.status) {
          if (licao.status === "aprovada") {
            const tempoAprovacao = formatarTempoRelativo(licao.avaliadoEm);
            adicionarNotificacao(
              "aprovacao",
              "✅",
              `<strong>${licao.nomeAluno || "Aluno"}</strong> foi aprovado na lição <em>${licao.titulo || "Sem título"}</em>`,
              tempoAprovacao
            );
          } else if (licao.status === "rejeitada") {
            const tempoRejeicao = formatarTempoRelativo(licao.avaliadoEm);
            adicionarNotificacao(
              "rejeicao",
              "❌",
              `<strong>${licao.nomeAluno || "Aluno"}</strong> teve a lição <em>${licao.titulo || "Sem título"}</em> devolvida`,
              tempoRejeicao
            );
          }
        }
      });
    });

    // Buscar downloads de PDFs recentes (se houver log)
    const downloadsRef = collection(db, "downloads");
    const downloadsQuery = query(
      downloadsRef,
      orderBy("data", "desc"),
      limit(10)
    );

    onSnapshot(downloadsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const download = change.doc.data();
          const tempoFormatado = formatarTempoRelativo(download.data);
          adicionarNotificacao(
            "download",
            "⬇️",
            `<strong>${download.nomeAluno || "Aluno"}</strong> baixou: <em>${download.nomeArquivo || "Arquivo"}</em>`,
            tempoFormatado
          );
        }
      });
    });

    // Buscar progressos de nível recentes
    const progressoRef = collection(db, "progresso");
    const progressoQuery = query(
      progressoRef,
      orderBy("dataAtualizacao", "desc"),
      limit(10)
    );

    onSnapshot(progressoQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "modified") {
          const progresso = change.doc.data();
          
          // Verificar se houve avanço de nível
          if (progresso.nivelLeitura || progresso.nivelMetodo) {
            const tempoFormatado = formatarTempoRelativo(progresso.dataAtualizacao);
            const tipo = progresso.nivelLeitura ? "Leitura" : "Método";
            const nivel = progresso.nivelLeitura || progresso.nivelMetodo;
            
            adicionarNotificacao(
              "nivel",
              "🚀",
              `<strong>${progresso.nomeAluno || "Aluno"}</strong> avançou para o <em>Nível ${nivel}</em> de ${tipo}`,
              tempoFormatado
            );
          }
        }
      });
    });

  } catch (erro) {
    console.error("Erro ao carregar notificações:", erro);
  }
}

/**
 * Carrega notificações iniciais (sem listener em tempo real)
 */
export async function carregarNotificacoesIniciais() {
  const lista = document.getElementById("listaNotificacoes");
  if (!lista) return;

  try {
    // Buscar lições recentes
    const licoesRef = collection(db, "licoes");
    const licoesQuery = query(
      licoesRef,
      orderBy("dataEnvio", "desc"),
      limit(5)
    );

    const licoesSnapshot = await getDocs(licoesQuery);
    const docs = licoesSnapshot.docs;
    // Inverter a ordem para que o prepend coloque a mais recente no topo por último
    for (let i = docs.length - 1; i >= 0; i--) {
      const licao = docs[i].data();
      const tempoFormatado = formatarTempoRelativo(licao.dataEnvio);
      adicionarNotificacao(
        "envio",
        "📘",
        `<strong>${licao.nomeAluno || "Aluno"}</strong> enviou a lição <em>${licao.titulo || "Sem título"}</em>`,
        tempoFormatado
      );
    }

  } catch (erro) {
    console.error("Erro ao carregar notificações iniciais:", erro);
  }
}

/**
 * Função para teste: adiciona notificações mock
 */
export function adicionarNotificacaoTeste(tipo = "envio") {
  const tipos = {
    envio: { icone: "📘", texto: "<strong>Aluno Teste</strong> enviou a lição <em>Método 20</em>" },
    download: { icone: "⬇️", texto: "<strong>Aluno Teste</strong> baixou o método <em>Arban Completo</em>" },
    nivel: { icone: "🚀", texto: "<strong>Aluno Teste</strong> avançou para o <em>Nível 35</em> de leitura" },
    aprovacao: { icone: "✅", texto: "<strong>Aluno Teste</strong> foi aprovado na lição <em>Método 61</em>" },
    rejeicao: { icone: "❌", texto: "<strong>Aluno Teste</strong> teve a lição <em>Método 61</em> devolvida" }
  };

  const notif = tipos[tipo] || tipos.envio;
  adicionarNotificacao(tipo, notif.icone, notif.texto);
}

// Expor funções globais para teste
window.adicionarNotificacaoTeste = adicionarNotificacaoTeste;
