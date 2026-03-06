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

    // Buscar lições — apenas envios e devoluções
    // Aprovações são omitidas pois já aparecem como avanço de nível
    const licoesSnap = await getDocs(query(collection(db, "licoes"), orderBy("dataEnvio", "desc"), limit(15)));
    licoesSnap.forEach(doc => {
      const d = doc.data();
      const nomeAluno = d.alunoNome || d.nomeAluno || "Aluno";

      // Notificação de ENVIO
      todasNotificacoes.push({
        data: d.dataEnvio,
        tipo: "envio",
        icone: "📘",
        texto: `<strong>${nomeAluno}</strong> enviou a lição <em>${d.titulo || "Sem título"}</em>`
      });

      // Notificação de DEVOLUÇÃO (reprovado) — mantida pois não tem equivalente no avanço de nível
      if (d.status === "reprovado" && d.avaliadoEm) {
        todasNotificacoes.push({
          data: d.avaliadoEm,
          tipo: "rejeicao",
          icone: "❌",
          texto: `<strong>${nomeAluno}</strong> teve a lição <em>${d.titulo || "Sem título"}</em> devolvida`
        });
      }
      // Aprovação removida — já coberta pela notificação de avanço de nível
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

    // Ordenar da mais antiga para mais recente (prepend deixa a mais recente no topo)
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

    // Listener de lições — apenas envios novos
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

    // Listener de nível em tempo real
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
    nivel:    { icone: "🚀", texto: "<strong>Aluno Teste</strong> avançou para o <em>Nível 35</em> de leitura" },
    rejeicao: { icone: "❌", texto: "<strong>Aluno Teste</strong> teve a lição <em>Método 61</em> devolvida" }
  };

  const notif = tipos[tipo] || tipos.envio;
  adicionarNotificacao(tipo, notif.icone, notif.texto);
}

window.adicionarNotificacaoTeste = adicionarNotificacaoTeste;
