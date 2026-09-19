import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

export const JORNADA_ATIVIDADES = [
  { id: "notas-musicais", ordem: 1, titulo: "Notas Musicais", url: "escalas-game.html", icone: "🎹" },
  { id: "escada-notas", ordem: 2, titulo: "Escada de Notas", url: "escada-notas.html", icone: "🪜" },
  { id: "como-funciona-pauta", ordem: 3, titulo: "Como Funciona a Pauta", url: "como-funciona-pauta.html", icone: "🎼" },
  { id: "figuras-musicais", ordem: 4, titulo: "Figuras Musicais", url: "figuras-musicais.html", icone: "𝅗𝅥" },
  { id: "jogo-figuras", ordem: 5, titulo: "Jogo das Figuras", url: "jogo-figuras.html", icone: "🎮" },
  { id: "tom-semitom", ordem: 6, titulo: "Tom ou Semitom?", url: "jogo-tom-semitom.html", icone: "🎵" },
  { id: "tetracordes", ordem: 7, titulo: "Tetracordes & Escalas", url: "tetracordes.html", icone: "🎼" },
];

function usuarioAtual() {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioAtual") || "null");
    return usuario && usuario.docId ? usuario : null;
  } catch {
    return null;
  }
}

function progressoRef(usuario, atividadeId) {
  return doc(db, "alunos", usuario.docId, "progressoAtividades", atividadeId);
}

export async function carregarProgressoJornada() {
  const usuario = usuarioAtual();
  if (!usuario) return {};

  const snap = await getDocs(collection(db, "alunos", usuario.docId, "progressoAtividades"));
  return Object.fromEntries(snap.docs.map((item) => [item.id, item.data()]));
}

export async function concluirAtividade(atividadeId, detalhes = {}) {
  const usuario = usuarioAtual();
  if (!usuario) {
    console.warn("Jornada: nenhum aluno identificado para salvar o progresso.");
    return { salvo: false, motivo: "sem-usuario" };
  }

  const atividade = JORNADA_ATIVIDADES.find((item) => item.id === atividadeId);
  if (!atividade) throw new Error(`Atividade desconhecida: ${atividadeId}`);

  await setDoc(progressoRef(usuario, atividadeId), {
    atividadeId,
    ordem: atividade.ordem,
    titulo: atividade.titulo,
    concluida: true,
    concluidaEm: serverTimestamp(),
    ...detalhes,
  }, { merge: true });

  return { salvo: true, proxima: JORNADA_ATIVIDADES[atividade.ordem] || null };
}

export function proximaAtividade(atividadeId, progresso = {}) {
  const indice = JORNADA_ATIVIDADES.findIndex((item) => item.id === atividadeId);
  if (indice < 0) return null;
  return JORNADA_ATIVIDADES.slice(indice + 1).find((item) => !progresso[item.id]?.concluida) || null;
}

export async function protegerPaginaAtual() {
  const usuario = usuarioAtual();
  if (!usuario) return;

  const pagina = window.location.pathname.split("/").pop();
  const atividade = JORNADA_ATIVIDADES.find((item) => item.url === pagina)
    || (pagina === "tetroquestgame.html" ? JORNADA_ATIVIDADES.find((item) => item.id === "tetracordes") : null);
  if (!atividade) return;

  const progresso = await carregarProgressoJornada();
  const indice = JORNADA_ATIVIDADES.findIndex((item) => item.id === atividade.id);
  const anterior = JORNADA_ATIVIDADES.slice(0, indice).find((item) => !progresso[item.id]?.concluida);
  if (anterior) {
    window.location.replace("atividades.html");
  }
}

export function instalarBotaoProximaAtividade({ atividadeId, seletor = "body", detalhes = {} } = {}) {
  const alvo = document.querySelector(seletor) || document.body;
  const botao = document.createElement("a");
  botao.className = "jornada-next-button";
  botao.style.cssText = "display:none;margin:18px auto;padding:13px 22px;border-radius:12px;background:linear-gradient(90deg,#22c55e,#16a34a);color:#fff;font-weight:800;text-decoration:none;text-align:center;box-shadow:0 6px 20px #16a34a55;max-width:330px";
  alvo.appendChild(botao);

  return async function marcarConclusao() {
    botao.textContent = "Salvando progresso…";
    botao.style.display = "block";
    botao.style.opacity = "0.75";
    try {
      const resultado = await concluirAtividade(atividadeId, detalhes);
      if (resultado.proxima) {
        botao.href = resultado.proxima.url;
        botao.textContent = `✅ Atividade concluída · Fazer ${resultado.proxima.ordem}ª atividade →`;
      } else {
        botao.removeAttribute("href");
        botao.textContent = "🏆 Jornada concluída!";
      }
    } catch (erro) {
      console.error("Jornada: falha ao salvar progresso", erro);
      botao.textContent = "Não foi possível salvar. Tentar novamente";
      botao.onclick = (event) => { event.preventDefault(); marcarConclusao(); };
    } finally {
      botao.style.opacity = "1";
    }
  };
}

window.JornadaAtividades = { concluirAtividade, instalarBotaoProximaAtividade, protegerPaginaAtual, JORNADA_ATIVIDADES };
protegerPaginaAtual().catch((erro) => console.warn("Jornada: não foi possível validar a etapa atual", erro));
