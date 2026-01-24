// script_biblioteca.js
import { db } from './firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
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

// INIT
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadCollections();
  renderCollections();
  updateUIBasedOnRole();
});

// ROLE
function setupEventListeners() {
  document.getElementById('user-role').addEventListener('change', e => {
    userRole = e.target.value;
    updateUIBasedOnRole();
  });
}

function updateUIBasedOnRole() {
  document.querySelectorAll('.upload-section.is-teacher')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'block' : 'none');

  document.querySelectorAll('.delete-btn.is-teacher')
    .forEach(el => el.style.display = userRole === 'teacher' ? 'inline-block' : 'none');

  const newCol = document.querySelector('.new-collection-section.is-teacher');
  if (newCol) newCol.style.display = userRole === 'teacher' ? 'block' : 'none';
}

// 🔥 FIRESTORE
async function loadCollections() {
  collections = [];
  const snap = await getDocs(collection(db, 'biblioteca_colecoes'));
  snap.forEach(docSnap => {
    collections.push({ id: docSnap.id, ...docSnap.data() });
  });
}

function renderCollections() {
  const grid = document.getElementById('collections-grid');
  grid.innerHTML = '';

  collections.forEach(col => {
    const card = document.createElement('div');
    card.className = 'collection-card';
    card.onclick = () => openCollection(col.id, col.nome);

    card.innerHTML = `
      <h3>📁 ${col.nome}</h3>
      <p>Coleção de documentos</p>
    `;
    grid.appendChild(card);
  });
}

async function openCollection(id, name) {
  currentCollectionId = id;
  document.getElementById('collections-view').classList.add('hidden');
  document.getElementById('collection-view').classList.add('active');
  document.getElementById('collection-title').textContent = `📁 ${name}`;
  await renderDocuments();
}

function backToCollections() {
  currentCollectionId = null;
  document.getElementById('collections-view').classList.remove('hidden');
  document.getElementById('collection-view').classList.remove('active');
}

// 📄 DOCUMENTOS
async function renderDocuments() {
  const container = document.getElementById('documents-container');
  container.innerHTML = '';

  const docsRef = collection(db, 'biblioteca_colecoes', currentCollectionId, 'documentos');
  const snap = await getDocs(docsRef);

  if (snap.empty) {
    container.innerHTML = '<div class="empty-message">Nenhum documento nesta coleção</div>';
    return;
  }

  snap.forEach(d => {
    const data = d.data();
    const item = document.createElement('div');
    item.className = 'document-item';

    item.innerHTML = `
      <div class="document-info">
        <div class="document-name">📄 ${data.nome}</div>
        <div class="document-meta">${(data.tamanho / 1024).toFixed(2)} KB</div>
      </div>
      <div class="document-actions">
        <a class="download-btn" href="${data.url}" target="_blank">⬇️ Baixar</a>
        <button class="delete-btn is-teacher" onclick="deleteDocument('${d.id}', '${data.storagePath}')">🗑️</button>
      </div>
    `;
    container.appendChild(item);
  });

  updateUIBasedOnRole();
}

// ⬆️ UPLOAD
async function uploadDocument() {
  const file = document.getElementById('pdf-file').files[0];
  if (!file || file.type !== 'application/pdf') return alert('Selecione um PDF válido');

  const path = `biblioteca/${currentCollectionId}/${file.name}`;
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

  alert('Documento enviado!');
  renderDocuments();
}

// 🗑️ DELETE
async function deleteDocument(docId, storagePath) {
  if (!confirm('Deseja excluir este documento?')) return;

  await deleteObject(ref(storage, storagePath));
  await deleteDoc(doc(db, 'biblioteca_colecoes', currentCollectionId, 'documentos', docId));

  renderDocuments();
}

// ➕ COLEÇÃO
async function createNewCollection() {
  const input = document.getElementById('new-collection-name');
  if (!input.value.trim()) return;

  await addDoc(collection(db, 'biblioteca_colecoes'), {
    nome: input.value.trim(),
    criadoEm: serverTimestamp()
  });

  input.value = '';
  await loadCollections();
  renderCollections();
}
