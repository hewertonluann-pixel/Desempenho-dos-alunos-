// script_biblioteca.js -- atualizado combuscas
import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

const storage = getStorage();

// Estado
let userRole = 'student';
let currentCollectionId = null;
let currentDocumentId = null;
let collections = [];
let documents = [];

// Coleções iniciais que devem existir
const INITIAL_COLLECTIONS = ['Métodos', 'Hinos da Harpa', 'Músicas'];

// Novas variáveis para pesquisa e ordenação
let currentDocuments = []; // Array global com documentos carregados
let searchTerm = ''; // Termo de pesquisa atual
let sortCriterion = 'name-asc'; // Critério de ordenação padrão

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  checkUserAuth();
  setupEventListeners();
  await ensureInitialCollections();
  await loadCollections();
  renderCollections();
  updateUIBasedOnRole();
  setupSearchSortListeners(); // Adiciona listeners para pesquisa e ordenação
});

// Verificar Autenticação e Papel
function checkUserAuth() {
  const usuarioLogado = localStorage.getItem("usuarioAtual");
  const roleSelector = document.getElementById('user-role');
  
  if (usuarioLogado) {
    try {
      const user = JSON.parse(usuarioLogado);
      if (user.tipo === 'professor') {
        // Se for professor, mostra o seletor e permite trocar
        userRole = 'teacher';
        if (roleSelector) {
          roleSelector.style.display = 'block';
          roleSelector.value = 'teacher';
        }
      } else {
        // Se for aluno, esconde o seletor e trava no modo student
        userRole = 'student';
        if (roleSelector) roleSelector.style.display = 'none';
      }
    } catch (e) {
      console.error("Erro ao ler usuário logado:", e);
      userRole = 'student';
      if (roleSelector) roleSelector.style.display = 'none';
    }
  } else {
    // Se não houver usuário logado (acesso direto), assume aluno por segurança
    userRole = 'student';
    if (roleSelector) roleSelector.style.display = 'none';
  }
}

// Garantir que as coleções iniciais existam
async function ensureInitialCollections() {
  try {
    const snap = await getDocs(collection(db, 'biblioteca_colecoes'));
    const existingNames = snap.docs.map(d => d.data().nome);
    
    for (const colName of INITIAL_COLLECTIONS) {
      if (!existingNames.includes(colName)) {
        await addDoc(collection(db, 'biblioteca_colecoes'), {
          nome: colName,
          criadoEm: serverTimestamp()
        });
        console.log(`✅ Coleção "${colName}" criada com sucesso!`);
      }
    }
  } catch (error) {
    console.error('❌ Erro ao garantir coleções iniciais:', error);
  }
}

// ROLE
function setupEventListeners() {
  document.getElementById('user-role').addEventListener('change', e => {
    userRole = e.target.value;
    updateUIBasedOnRole();
  });

  document.getElementById('search-input').addEventListener('input', filterAndSortDocuments);
  document.getElementById('sort-select').addEventListener('change', filterAndSortDocuments);
}

function updateUIBasedOnRole() {
  document.querySelectorAll('.is-teacher')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');

  document.querySelectorAll('.btn-delete')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');

  document.querySelectorAll('.btn-edit')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');
}

// 🔥 FIRESTORE
async function loadCollections() {
  collections = [];
  const snap = await getDocs(collection(db, 'biblioteca_colecoes'));
  snap.forEach(docSnap => {
    collections.push({ id: docSnap.id, ...docSnap.data() });
  });
}

function getCollectionIcon(name) {
  if (name.includes('Métodos')) return '📚';
  if (name.includes('Harpa')) return '📖';
  if (name.includes('Músicas')) return '🎵';
  return '📁';
}

function renderCollections() {
  const grid = document.getElementById('collections-grid');
  grid.innerHTML = '';

  collections.forEach(col => {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.onclick = () => openCollection(col.id, col.nome);

    card.innerHTML = `
      <span class="icon-folder">${getCollectionIcon(col.nome)}</span>
      <h3>${col.nome}</h3>
      <p>Toque para abrir</p>
    `;
    grid.appendChild(card);
  });
}

async function openCollection(id, name) {
  currentCollectionId = id;
  document.getElementById('collections-view').style.display = 'none';
  document.getElementById('collection-view').classList.add('active');
  document.getElementById('collection-title').textContent = name;
  
  // Limpar filtros
  document.getElementById('search-input').value = '';
  document.getElementById('sort-select').value = 'name-asc';
  
  await loadDocuments();
  renderDocuments();
}

function backToCollections() {
  currentCollectionId = null;
  currentDocumentId = null;
  document.getElementById('collections-view').style.display = 'block';
  document.getElementById('collection-view').classList.remove('active');
  document.getElementById('pdf-file').value = '';
  document.getElementById('audio-file').value = '';
  document.getElementById('file-name').textContent = '';
  document.getElementById('audio-file-name').textContent = '';
}

// 📄 DOCUMENTOS
async function loadDocuments() {
  documents = [];
  const docsRef = collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos');
  const snap = await getDocs(docsRef);

  snap.forEach(d => {
    documents.push({ id: d.id, ...d.data() });
  });
}

function filterAndSortDocuments() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const sortBy = document.getElementById('sort-select').value;

  let filtered = documents.filter(doc =>
    doc.nome.toLowerCase().includes(searchTerm)
  );

  // Ordenação
  if (sortBy === 'name-asc') {
    filtered.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (sortBy === 'name-desc') {
    filtered.sort((a, b) => b.nome.localeCompare(a.nome));
  } else if (sortBy === 'date-desc') {
    filtered.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
  } else if (sortBy === 'date-asc') {
    filtered.sort((a, b) => (a.criadoEm?.seconds || 0) - (b.criadoEm?.seconds || 0));
  }

  renderDocumentsFiltered(filtered);
}

function renderDocuments() {
  filterAndSortDocuments();
}

function renderDocumentsFiltered(docsToRender) {
  const container = document.getElementById('documents-container');
  container.innerHTML = '';

  if (docsToRender.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted); font-style:italic;">Nenhum documento encontrado</div>';
    return;
  }

  docsToRender.forEach(d => {
    const item = document.createElement('div');
    item.className = 'document-item';

    let audioHTML = '';
    if (d.audioUrl) {
      audioHTML = `
        <div class="audio-player">
          <audio controls>
            <source src="${d.audioUrl}" type="audio/mpeg">
            Seu navegador não suporta o elemento de áudio.
          </audio>
        </div>
      `;
    }

    item.innerHTML = `
      <div class="doc-name">${d.nome}</div>
      ${audioHTML}
      <div class="doc-buttons">
        <a class="btn-download" href="${d.url}" target="_blank">📥 Baixar PDF</a>
        <button class="btn-edit" onclick="openEditModal('${d.id}')">🎵 Áudio</button>
        <button class="btn-delete" onclick="deleteDocument('${d.id}', '${d.storagePath}', '${d.audioStoragePath || ''}')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </div>
    `;
    container.appendChild(item);
  });

  updateUIBasedOnRole();
}

// Função para filtrar documentos por termo de pesquisa (substring, case-insensitive)
function filterDocuments(term) {
  if (!term.trim()) return currentDocuments;
  return currentDocuments.filter(doc =>
    doc.nome.toLowerCase().includes(term.toLowerCase())
  );
}

// Função para ordenar documentos
function sortDocuments(docs) {
  const sorted = [...docs]; // Cópia

  switch (sortCriterion) {
    case 'name-asc':
      return sorted.sort((a, b) => a.nome.localeCompare(b.nome));
    case 'name-desc':
      return sorted.sort((a, b) => b.nome.localeCompare(a.nome));
    case 'date-desc':
      return sorted.sort((a, b) => b.criadoEm.toDate() - a.criadoEm.toDate());
    case 'date-asc':
      return sorted.sort((a, b) => a.criadoEm.toDate() - b.criadoEm.toDate());
    default:
      return sorted;
  }
}

// Função para configurar listeners de pesquisa e ordenação
function setupSearchSortListeners() {
  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');

  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderDocumentsFiltered();
  });

  sortSelect.addEventListener('change', (e) => {
    sortCriterion = e.target.value;
    renderDocumentsFiltered();
  });
}

// Atualizar nome do arquivo selecionado
function updateFileName() {
  const file = document.getElementById('pdf-file').files[0];
  const nameSpan = document.getElementById('file-name');
  if (file) {
    nameSpan.textContent = `✅ ${file.name}`;
  } else {
    nameSpan.textContent = '';
  }
}

function updateAudioFileName() {
  const file = document.getElementById('audio-file').files[0];
  const nameSpan = document.getElementById('audio-file-name');
  if (file) {
    nameSpan.textContent = `✅ ${file.name}`;
  } else {
    nameSpan.textContent = '';
  }
}

// ⬆️ UPLOAD
async function uploadDocument() {
  const pdfFile = document.getElementById('pdf-file').files[0];
  const audioFile = document.getElementById('audio-file').files[0];

  if (!pdfFile || pdfFile.type !== 'application/pdf') {
    alert('❌ Selecione um PDF válido');
    return;
  }

  if (!currentCollectionId) {
    alert('❌ Nenhuma coleção selecionada');
    return;
  }

  try {
    const uploadBtn = document.querySelector('.upload-btn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Enviando...';

    // Upload do PDF
    const pdfPath = `biblioteca/${currentCollectionId}/${Date.now()}_${pdfFile.name}`;
    const pdfRef = ref(storage, pdfPath);
    await uploadBytes(pdfRef, pdfFile);
    const pdfUrl = await getDownloadURL(pdfRef);

    // Upload do áudio (se fornecido)
    let audioUrl = null;
    let audioStoragePath = null;
    if (audioFile) {
      const audioPath = `biblioteca/${currentCollectionId}/${Date.now()}_audio_${audioFile.name}`;
      const audioRef = ref(storage, audioPath);
      await uploadBytes(audioRef, audioFile);
      audioUrl = await getDownloadURL(audioRef);
      audioStoragePath = audioPath;
    }

    // Salvar no Firestore
    await addDoc(
      collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos'),
      {
        nome: pdfFile.name,
        tamanho: pdfFile.size,
        url: pdfUrl,
        storagePath: pdfPath,
        audioUrl: audioUrl || null,
        audioStoragePath: audioStoragePath || null,
        criadoEm: serverTimestamp()
      }
    );

    alert('✅ Documento enviado com sucesso!');
    document.getElementById('pdf-file').value = '';
    document.getElementById('audio-file').value = '';
    document.getElementById('file-name').textContent = '';
    document.getElementById('audio-file-name').textContent = '';
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Enviar';
    
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error);
    alert('❌ Erro ao fazer upload do documento');
    const uploadBtn = document.querySelector('.upload-btn');
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Enviar';
  }
}

// 🗑️ DELETE
async function deleteDocument(docId, pdfPath, audioPath) {
  if (!confirm('Deseja excluir este documento?')) return;

  try {
    await deleteObject(ref(storage, pdfPath));
    if (audioPath) {
      await deleteObject(ref(storage, audioPath));
    }
    await deleteDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', docId));
    alert('✅ Documento excluído com sucesso!');
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('❌ Erro ao excluir documento:', error);
    alert('❌ Erro ao excluir o documento');
  }
}

// 🎵 MODAL DE ÁUDIO
function openEditModal(docId) {
  currentDocumentId = docId;
  document.getElementById('edit-modal').style.display = 'block';
}

function closeModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.getElementById('edit-audio-file').value = '';
  currentDocumentId = null;
}

async function saveAudio() {
  const audioFile = document.getElementById('edit-audio-file').files[0];

  if (!audioFile) {
    alert('❌ Selecione um arquivo de áudio');
    return;
  }

  if (!currentDocumentId) {
    alert('❌ Nenhum documento selecionado');
    return;
  }

  try {
    const docData = documents.find(d => d.id === currentDocumentId);
    if (!docData) {
      alert('❌ Documento não encontrado');
      return;
    }

    // Deletar áudio antigo se existir
    if (docData.audioStoragePath) {
      try {
        await deleteObject(ref(storage, docData.audioStoragePath));
      } catch (e) {
        console.warn('Não foi possível deletar áudio antigo:', e);
      }
    }

    // Upload do novo áudio
    const audioPath = `biblioteca/${currentCollectionId}/${Date.now()}_audio_${audioFile.name}`;
    const audioRef = ref(storage, audioPath);
    await uploadBytes(audioRef, audioFile);
    const audioUrl = await getDownloadURL(audioRef);

    // Atualizar no Firestore
    await updateDoc(
      doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentDocumentId),
      {
        audioUrl: audioUrl,
        audioStoragePath: audioPath
      }
    );

    alert('✅ Áudio atualizado com sucesso!');
    closeModal();
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('❌ Erro ao salvar áudio:', error);
    alert('❌ Erro ao salvar o áudio');
  }
}

async function removeAudio() {
  if (!confirm('Deseja remover o áudio deste documento?')) return;

  if (!currentDocumentId) {
    alert('❌ Nenhum documento selecionado');
    return;
  }

  try {
    const docData = documents.find(d => d.id === currentDocumentId);
    if (!docData) {
      alert('❌ Documento não encontrado');
      return;
    }

    // Deletar áudio do Storage
    if (docData.audioStoragePath) {
      try {
        await deleteObject(ref(storage, docData.audioStoragePath));
      } catch (e) {
        console.warn('Não foi possível deletar áudio:', e);
      }
    }

    // Atualizar no Firestore
    await updateDoc(
      doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentDocumentId),
      {
        audioUrl: null,
        audioStoragePath: null
      }
    );

    alert('✅ Áudio removido com sucesso!');
    closeModal();
    await loadDocuments();
    renderDocuments();
  } catch (error) {
    console.error('❌ Erro ao remover áudio:', error);
    alert('❌ Erro ao remover o áudio');
  }
}

// ➕ COLEÇÃO
async function createNewCollection() {
  const input = document.getElementById('new-collection-name');
  if (!input.value.trim()) {
    alert('❌ Digite um nome para a coleção');
    return;
  }

  try {
    await addDoc(collection(db, 'biblioteca_colecoes'), {
      nome: input.value.trim(),
      criadoEm: serverTimestamp()
    });

    alert('✅ Coleção criada com sucesso!');
    input.value = '';
    await loadCollections();
    renderCollections();
  } catch (error) {
    console.error('❌ Erro ao criar coleção:', error);
    alert('❌ Erro ao criar a coleção');
  }
}

// Expor funções globalmente
window.updateFileName = updateFileName;
window.updateAudioFileName = updateAudioFileName;
window.uploadDocument = uploadDocument;
window.deleteDocument = deleteDocument;
window.backToCollections = backToCollections;
window.createNewCollection = createNewCollection;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.saveAudio = saveAudio;
window.removeAudio = removeAudio;
window.filterAndSortDocuments = filterAndSortDocuments;
