
// script_biblioteca.js -- atualizado com busca global e contagem de arquivos
import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  Timestamp
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
let allDocuments = []; // Para busca global

// Coleções iniciais que devem existir
const INITIAL_COLLECTIONS = ['Métodos', 'Hinos da Harpa', 'Músicas'];

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  checkUserAuth();
  setupEventListeners();
  await ensureInitialCollections();
  await loadCollections();
  renderCollections();
  updateUIBasedOnRole();
  
  // Carregar todos os documentos para a busca global em segundo plano
  loadAllDocuments();
});

// Verificar Autenticação e Papel
function checkUserAuth() {
  const usuarioLogado = localStorage.getItem("usuarioAtual");
  const roleSelector = document.getElementById('user-role');
  
  if (usuarioLogado) {
    try {
      const user = JSON.parse(usuarioLogado);
      if (user.tipo === 'professor' || user.classificado === true) { 
        userRole = 'teacher';
        if (roleSelector) {
          roleSelector.style.display = 'block';
          roleSelector.value = 'teacher';
        }
      } else {
        userRole = 'student';
        if (roleSelector) roleSelector.style.display = 'none';
      }
    } catch (e) {
      console.error("Erro ao ler usuário logado:", e);
      userRole = 'student';
      if (roleSelector) roleSelector.style.display = 'none';
    }
  } else {
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
      }
    }
  } catch (error) {
    console.error('❌ Erro ao garantir coleções iniciais:', error);
  }
}

// ROLE
function setupEventListeners() {
  const roleSelector = document.getElementById('user-role');
  if (roleSelector) {
    roleSelector.addEventListener('change', e => {
      userRole = e.target.value;
      updateUIBasedOnRole();
    });
  }

  // Busca interna da coleção
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterAndSortDocuments);
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', filterAndSortDocuments);
  }

  // Busca Global
  const globalSearchInput = document.getElementById('global-search-input');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', handleGlobalSearch);
  }
}

function updateUIBasedOnRole() {
  document.querySelectorAll('.is-teacher')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');

  document.querySelectorAll('.btn-delete-collection')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'flex' : 'none');
}

// 🔥 FIRESTORE
async function loadCollections() {
  collections = [];
  const snap = await getDocs(collection(db, 'biblioteca_colecoes'));
  
  const collectionPromises = snap.docs.map(async (docSnap) => {
    const colData = { id: docSnap.id, ...docSnap.data() };
    // Buscar contagem de documentos
    const docsSnap = await getDocs(collection(db, 'biblioteca_colecoes', docSnap.id, 'documentos'));
    colData.fileCount = docsSnap.size;
    return colData;
  });

  collections = await Promise.all(collectionPromises);
}

// Carregar todos os documentos de todas as coleções para busca global
async function loadAllDocuments() {
  allDocuments = [];
  for (const col of collections) {
    const docsSnap = await getDocs(collection(db, 'biblioteca_colecoes', col.id, 'documentos'));
    docsSnap.forEach(d => {
      allDocuments.push({ 
        id: d.id, 
        collectionId: col.id, 
        collectionName: col.nome,
        ...d.data() 
      });
    });
  }
}

function getCollectionIcon(name) {
  if (name.includes('Métodos')) return '📚';
  if (name.includes('Harpa')) return '📖';
  if (name.includes('Músicas')) return '🎵';
  return '📁';
}

function renderCollections() {
  const grid = document.getElementById('collections-grid');
  if (!grid) return;
  grid.innerHTML = '';

  collections.forEach(col => {
    const card = document.createElement('div');
    card.className = 'collection-card';
    
    card.onclick = (e) => {
      if (e.target.closest('.btn-delete-collection')) return;
      openCollection(col.id, col.nome);
    };

    card.innerHTML = `
      <button class="btn-delete-collection" onclick="deleteCollection('${col.id}', '${col.nome}')">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
      <span class="icon-folder">${getCollectionIcon(col.nome)}</span>
      <h3>${col.nome}</h3>
      <span class="file-count">${col.fileCount || 0} arquivos</span>
      <p>Toque para abrir</p>
    `;
    grid.appendChild(card);
  });
  
  updateUIBasedOnRole();
}

// Busca Global
function handleGlobalSearch(e) {
  const term = e.target.value.toLowerCase().trim();
  const resultsView = document.getElementById('search-results-view');
  const resultsContainer = document.getElementById('global-search-results');
  const collectionsGrid = document.getElementById('collections-grid');
  const headerSection = document.querySelector('.header-section');

  if (term.length < 2) {
    resultsView.style.display = 'none';
    collectionsGrid.style.opacity = '1';
    if (headerSection) headerSection.style.display = 'block';
    return;
  }

  resultsView.style.display = 'block';
  collectionsGrid.style.opacity = '0.3';
  if (headerSection) headerSection.style.display = 'none';

  const filtered = allDocuments.filter(doc => 
    doc.nome.toLowerCase().includes(term) || 
    doc.collectionName.toLowerCase().includes(term)
  );

  renderDocumentList(filtered, resultsContainer);
}

window.clearGlobalSearch = () => {
  const input = document.getElementById('global-search-input');
  if (input) {
    input.value = '';
    handleGlobalSearch({ target: input });
  }
};

async function deleteCollection(id, name) {
  if (!confirm(`⚠️ ATENÇÃO: Tem certeza que deseja excluir a coleção "${name}"?\n\nIsso removerá permanentemente todos os documentos e áudios contidos nela.`)) return;

  try {
    const docsRef = collection(db, 'biblioteca_colecoes', id, 'documentos');
    const snap = await getDocs(docsRef);
    
    for (const d of snap.docs) {
      const data = d.data();
      if (data.storagePath) {
        try { await deleteObject(ref(storage, data.storagePath)); } catch(e) {}
      }
      if (data.audioStoragePath) {
        try { await deleteObject(ref(storage, data.audioStoragePath)); } catch(e) {}
      }
      await deleteDoc(doc(db, 'biblioteca_colecoes', id, 'documentos', d.id));
    }

    await deleteDoc(doc(db, 'biblioteca_colecoes', id));
    alert(`✅ Coleção "${name}" excluída com sucesso!`);
    await loadCollections();
    renderCollections();
    loadAllDocuments(); // Atualizar busca global
  } catch (error) {
    console.error('❌ Erro ao excluir coleção:', error);
  }
}

async function openCollection(id, name) {
  currentCollectionId = id;
  document.getElementById('collections-view').style.display = 'none';
  document.getElementById('collection-view').classList.add('active');
  document.getElementById('collection-title').textContent = name;
  
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
  
  // Limpar campos de upload
  const pdfInput = document.getElementById('pdf-file');
  const audioInput = document.getElementById('audio-file');
  if (pdfInput) pdfInput.value = '';
  if (audioInput) audioInput.value = '';
  
  const fileName = document.getElementById('file-name');
  const audioFileName = document.getElementById('audio-file-name');
  if (fileName) fileName.textContent = '';
  if (audioFileName) audioFileName.textContent = '';
}

async function loadDocuments() {
  documents = [];
  if (!currentCollectionId) return;
  const docsRef = collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos');
  const snap = await getDocs(docsRef);
  snap.forEach(d => {
    documents.push({ id: d.id, ...d.data() });
  });
}

function filterAndSortDocuments() {
  const term = document.getElementById('search-input').value.toLowerCase();
  const sortBy = document.getElementById('sort-select').value;

  let filtered = documents.filter(doc => doc.nome.toLowerCase().includes(term));

  if (sortBy === 'name-asc') filtered.sort((a, b) => a.nome.localeCompare(b.nome));
  else if (sortBy === 'name-desc') filtered.sort((a, b) => b.nome.localeCompare(a.nome));
  else if (sortBy === 'date-desc') filtered.sort((a, b) => (b.criadoEm?.toDate() || 0) - (a.criadoEm?.toDate() || 0));
  else if (sortBy === 'date-asc') filtered.sort((a, b) => (a.criadoEm?.toDate() || 0) - (b.criadoEm?.toDate() || 0));

  renderDocumentList(filtered, document.getElementById('documents-container'));
}

function renderDocuments() {
  filterAndSortDocuments();
}

function renderDocumentList(docs, container) {
  if (!container) return;
  container.innerHTML = '';

  if (docs.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted); font-style:italic;">Nenhum documento encontrado</div>';
    return;
  }

  docs.forEach(d => {
    const item = document.createElement('div');
    item.className = 'document-item';

    let audioHTML = '';
    if (d.audioUrl) {
      audioHTML = `
        <div class="audio-player">
          <audio controls>
            <source src="${d.audioUrl}" type="audio/mpeg">
          </audio>
        </div>
      `;
    }

    // Se for busca global, mostrar de qual coleção é
    const collectionTag = d.collectionName ? `<small style="color:var(--azul); display:block; margin-bottom:5px;">📁 ${d.collectionName}</small>` : '';

    item.innerHTML = `
      ${collectionTag}
      <div class="doc-name">${d.nome}</div>
      ${audioHTML}
      <div class="doc-buttons">
        <a class="btn-download" href="${d.url}" target="_blank" onclick="registrarDownload('${d.id}', '${d.nome}')">📥 Baixar PDF</a>
        <div class="is-teacher" style="display: ${userRole === 'teacher' ? 'flex' : 'none'}; gap: 10px;">
          <button class="btn-edit" onclick="openEditModal('${d.id}', '${d.collectionId || currentCollectionId}')">🎵 Áudio</button>
          <button class="btn-delete" onclick="deleteDocument('${d.id}', '${d.collectionId || currentCollectionId}')">🗑️</button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Funções de Upload e Gerenciamento (Mantidas as originais)
async function uploadDocument() {
  const pdfFile = document.getElementById('pdf-file').files[0];
  const audioFile = document.getElementById('audio-file').files[0];

  if (!pdfFile) {
    alert('❌ Selecione pelo menos o arquivo PDF');
    return;
  }

  const btn = document.querySelector('.upload-btn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const pdfPath = `biblioteca/${currentCollectionId}/${Date.now()}_${pdfFile.name}`;
    const pdfRef = ref(storage, pdfPath);
    await uploadBytes(pdfRef, pdfFile);
    const pdfUrl = await getDownloadURL(pdfRef);

    let audioUrl = null;
    let audioStoragePath = null;

    if (audioFile) {
      const audioPath = `biblioteca/${currentCollectionId}/${Date.now()}_audio_${audioFile.name}`;
      const audioRef = ref(storage, audioPath);
      await uploadBytes(audioRef, audioFile);
      audioUrl = await getDownloadURL(audioRef);
      audioStoragePath = audioPath;
    }

    await addDoc(collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos'), {
      nome: pdfFile.name.replace('.pdf', ''),
      url: pdfUrl,
      storagePath: pdfPath,
      audioUrl: audioUrl,
      audioStoragePath: audioStoragePath,
      criadoEm: serverTimestamp()
    });

    alert('✅ Documento enviado com sucesso!');
    backToCollections();
    await loadCollections();
    renderCollections();
    loadAllDocuments();
  } catch (error) {
    console.error('Erro no upload:', error);
    alert('❌ Erro ao enviar arquivo');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar';
  }
}

async function deleteDocument(docId, colId) {
  if (!confirm('Tem certeza que deseja excluir este documento?')) return;
  const targetColId = colId || currentCollectionId;
  
  try {
    const docRef = doc(db, 'biblioteca_colecoes', targetColId, 'documentos', docId);
    await deleteDoc(docRef);
    alert('✅ Documento excluído!');
    if (currentCollectionId) {
      await loadDocuments();
      renderDocuments();
    }
    await loadCollections();
    renderCollections();
    loadAllDocuments();
  } catch (error) {
    console.error('Erro ao deletar:', error);
  }
}

// Modais e auxiliares
window.updateFileName = () => {
  const f = document.getElementById('pdf-file').files[0];
  if (f) document.getElementById('file-name').textContent = `✅ ${f.name}`;
};

window.updateAudioFileName = () => {
  const f = document.getElementById('audio-file').files[0];
  if (f) document.getElementById('audio-file-name').textContent = `✅ ${f.name}`;
};

window.openEditModal = (docId, colId) => {
  currentDocumentId = docId;
  currentCollectionId = colId; // Importante para o saveAudio
  document.getElementById('edit-modal').style.display = 'flex';
};

window.closeModal = () => {
  document.getElementById('edit-modal').style.display = 'none';
};

async function saveAudio() {
  const audioFile = document.getElementById('edit-audio-file').files[0];
  if (!audioFile) return alert('Selecione um arquivo');
  
  try {
    const path = `biblioteca/${currentCollectionId}/${Date.now()}_audio_${audioFile.name}`;
    const sRef = ref(storage, path);
    await uploadBytes(sRef, audioFile);
    const url = await getDownloadURL(sRef);

    await updateDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentDocumentId), {
      audioUrl: url,
      audioStoragePath: path
    });

    alert('✅ Áudio atualizado!');
    closeModal();
    if (currentCollectionId) {
      await loadDocuments();
      renderDocuments();
    }
    loadAllDocuments();
  } catch (e) {
    console.error(e);
  }
}

async function removeAudio() {
  if (!confirm('Remover áudio?')) return;
  try {
    await updateDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', currentDocumentId), {
      audioUrl: null,
      audioStoragePath: null
    });
    alert('✅ Áudio removido!');
    closeModal();
    if (currentCollectionId) {
      await loadDocuments();
      renderDocuments();
    }
    loadAllDocuments();
  } catch (e) {
    console.error(e);
  }
}

async function createNewCollection() {
  const input = document.getElementById('new-collection-name');
  if (!input.value.trim()) return;
  try {
    await addDoc(collection(db, 'biblioteca_colecoes'), {
      nome: input.value.trim(),
      criadoEm: serverTimestamp()
    });
    input.value = '';
    await loadCollections();
    renderCollections();
  } catch (e) {
    console.error(e);
  }
}

async function registrarDownload(docId, nome) {
  try {
    const user = JSON.parse(localStorage.getItem('usuarioAtual') || '{}');
    await addDoc(collection(db, 'downloads'), {
      nomeAluno: user.nome || 'Anônimo',
      nomeArquivo: nome,
      data: serverTimestamp(),
      documentoId: docId
    });
  } catch (e) {}
}

// Expor globais
window.uploadDocument = uploadDocument;
window.deleteDocument = deleteDocument;
window.backToCollections = backToCollections;
window.createNewCollection = createNewCollection;
window.deleteCollection = deleteCollection;
window.saveAudio = saveAudio;
window.removeAudio = removeAudio;
window.openCollection = openCollection;
window.filterAndSortDocuments = filterAndSortDocuments;
window.registrarDownload = registrarDownload;
window.handleGlobalSearch = handleGlobalSearch;
