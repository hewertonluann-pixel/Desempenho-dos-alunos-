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
 * Adiciona uma notificação à lista (sempre no topo)
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
 * Carrega notificações de atividades recentes com ordenação global correta
 */
export async function carregarNotificacoes() {
  const lista = document.getElementById("listaNotificacoes");
  if (!lista) return;

  try {
    // 1. CARREGAMENTO INICIAL UNIFICADO
    const todasNotificacoes = [];

    // Buscar lições
    const licoesSnap = await getDocs(query(collection(db, "licoes"), orderBy("dataEnvio", "desc"), limit(15)));
    licoesSnap.forEach(doc => {
      const d = doc.data();
      todasNotificacoes.push({
        data: d.dataEnvio,
        tipo: "envio",
        icone: "📘",
        texto: `<strong>${d.nomeAluno || "Aluno"}</strong> enviou a lição <em>${d.titulo || "Sem título"}</em>`
      });
      
      if (d.status === "aprovada" && d.avaliadoEm) {
        todasNotificacoes.push({
          data: d.avaliadoEm,
          tipo: "aprovacao",
          icone: "✅",
          texto: `<strong>${d.nomeAluno || "Aluno"}</strong> foi aprovado na lição <em>${d.titulo || "Sem título"}</em>`
        });
      } else if (d.status === "rejeitada" && d.avaliadoEm) {
        todasNotificacoes.push({
          data: d.avaliadoEm,
          tipo: "rejeicao",
          icone: "❌",
          texto: `<strong>${d.nomeAluno || "Aluno"}</strong> teve a lição <em>${d.titulo || "Sem título"}</em> devolvida`
        });
      }
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

    // Ordenar todas as notificações pela data (mais antiga para mais recente para o prepend funcionar)
    todasNotificacoes.sort((a, b) => {
      const dateA = a.data instanceof Timestamp ? a.data.toDate() : new Date(a.data);
      const dateB = b.data instanceof Timestamp ? b.data.toDate() : new Date(b.data);
      return dateA - dateB;
    });

    // Limpar lista antes de inserir (caso haja algo)
    lista.innerHTML = "";

    // Inserir no DOM (prepend fará a mais recente ficar no topo)
    todasNotificacoes.forEach(n => {
      adicionarNotificacao(n.tipo, n.icone, n.texto, formatarTempoRelativo(n.data));
    });

    // 2. CONFIGURAR LISTENERS PARA TEMPO REAL (apenas para novas adições)
    const agora = Timestamp.now();

    // Listener de lições
    onSnapshot(query(collection(db, "licoes"), orderBy("dataEnvio", "desc"), limit(1)), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const licao = change.doc.data();
          // Só adicionar se for realmente novo (pós-carregamento)
          if (licao.dataEnvio && licao.dataEnvio.toMillis() > agora.toMillis()) {
            adicionarNotificacao("envio", "📘", `<strong>${licao.nomeAluno || "Aluno"}</strong> enviou a lição <em>${licao.titulo || "Sem título"}</em>`, "agora mesmo");
          }
        }
      });
    });

    // Listener de downloads
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

  } catch (erro) {
    console.error("Erro ao carregar notificações:", erro);
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
