// script_biblioteca.js
import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where
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
let collections = [];

// Coleções iniciais que devem existir
const INITIAL_COLLECTIONS = ['Métodos', 'Hinos da Harpa', 'Músicas'];

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await ensureInitialCollections();
  await loadCollections();
  renderCollections();
  updateUIBasedOnRole();
});

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
}

function updateUIBasedOnRole() {
  // Mostrar/Esconder seções de professor
  document.querySelectorAll('.is-teacher')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');

  // Mostrar/Esconder botões de deletar
  document.querySelectorAll('.btn-delete')
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
  await renderDocuments();
}

function backToCollections() {
  currentCollectionId = null;
  document.getElementById('collections-view').style.display = 'block';
  document.getElementById('collection-view').classList.remove('active');
}

// 📄 DOCUMENTOS
async function renderDocuments() {
  const container = document.getElementById('documents-container');
  container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">Carregando documentos...</div>';

  const docsRef = collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos');
  const snap = await getDocs(docsRef);

  container.innerHTML = '';

  if (snap.empty) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted); font-style:italic;">Nenhum documento nesta coleção</div>';
    return;
  }

  snap.forEach(d => {
    const data = d.data();
    const item = document.createElement('div');
    item.className = 'document-item';

    item.innerHTML = `
      <div class="doc-info">
        <span class="doc-icon">📄</span>
        <div class="doc-details">
          <span class="doc-name">${data.nome}</span>
          <span class="doc-meta">${(data.tamanho / 1024).toFixed(1)} KB</span>
        </div>
      </div>
      <div class="doc-actions">
        <a class="btn-download" href="${data.url}" target="_blank">Baixar</a>
        <button class="btn-delete" onclick="deleteDocument('${d.id}', '${data.storagePath}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
        </button>
      </div>
    `;
    container.appendChild(item);
  });

  updateUIBasedOnRole();
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

// ⬆️ UPLOAD
async function uploadDocument() {
  const file = document.getElementById('pdf-file').files[0];
  if (!file || file.type !== 'application/pdf') {
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

    const path = `biblioteca/${currentCollectionId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await addDoc(
      collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos'),
      {
        nome: file.name,
        tamanho: file.size,
        url,
        storagePath: path,
        criadoEm: serverTimestamp()
      }
    );

    alert('✅ Documento enviado com sucesso!');
    document.getElementById('pdf-file').value = '';
    document.getElementById('file-name').textContent = '';
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Enviar PDF';
    await renderDocuments();
  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error);
    alert('❌ Erro ao fazer upload do documento');
    const uploadBtn = document.querySelector('.upload-btn');
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Enviar PDF';
  }
}

// 🗑️ DELETE
async function deleteDocument(docId, storagePath) {
  if (!confirm('Deseja excluir este documento?')) return;

  try {
    await deleteObject(ref(storage, storagePath));
    await deleteDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', docId));
    alert('✅ Documento excluído com sucesso!');
    await renderDocuments();
  } catch (error) {
    console.error('❌ Erro ao excluir documento:', error);
    alert('❌ Erro ao excluir o documento');
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
window.uploadDocument = uploadDocument;
window.deleteDocument = deleteDocument;
window.backToCollections = backToCollections;
window.createNewCollection = createNewCollection;
