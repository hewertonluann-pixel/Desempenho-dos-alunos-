// Variáveis globais
let userRole = 'student'; // 'student' ou 'teacher'
let currentCollection = null;
let collections = [];

// Coleções padrão
const defaultCollections = ['Métodos', 'Músicas', 'Hinos da Harpa'];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadCollections();
    setupEventListeners();
    renderCollections();
    updateUIBasedOnRole();
});

// Configurar Event Listeners
function setupEventListeners() {
    document.getElementById('user-role').addEventListener('change', (e) => {
        userRole = e.target.value;
        updateUIBasedOnRole();
    });
}

// Atualizar UI baseado no papel do usuário
function updateUIBasedOnRole() {
    const uploadSections = document.querySelectorAll('.upload-section.is-teacher');
    const deleteBtns = document.querySelectorAll('.delete-btn.is-teacher');
    const newCollectionSection = document.querySelector('.new-collection-section.is-teacher');

    if (userRole === 'teacher') {
        uploadSections.forEach(section => section.style.display = 'block');
        deleteBtns.forEach(btn => btn.style.display = 'inline-block');
        if (newCollectionSection) newCollectionSection.style.display = 'block';
    } else {
        uploadSections.forEach(section => section.style.display = 'none');
        deleteBtns.forEach(btn => btn.style.display = 'none');
        if (newCollectionSection) newCollectionSection.style.display = 'none';
    }
}

// Carregar coleções do localStorage
function loadCollections() {
    const stored = localStorage.getItem('biblioteca_collections');
    if (stored) {
        collections = JSON.parse(stored);
    } else {
        // Inicializar com coleções padrão
        collections = defaultCollections.map(name => ({
            name: name,
            documents: []
        }));
        saveCollections();
    }
}

// Salvar coleções no localStorage
function saveCollections() {
    localStorage.setItem('biblioteca_collections', JSON.stringify(collections));
}

// Renderizar coleções
function renderCollections() {
    const grid = document.getElementById('collections-grid');
    grid.innerHTML = '';

    collections.forEach((collection, index) => {
        const card = document.createElement('div');
        card.className = 'collection-card';
        card.onclick = () => openCollection(index);

        const docCount = collection.documents ? collection.documents.length : 0;
        const icon = getCollectionIcon(collection.name);

        card.innerHTML = `
            <h3>${icon} ${collection.name}</h3>
            <p>Coleção de documentos</p>
            <div class="doc-count">${docCount} documento${docCount !== 1 ? 's' : ''}</div>
        `;

        grid.appendChild(card);
    });
}

// Obter ícone baseado no nome da coleção
function getCollectionIcon(name) {
    const icons = {
        'Métodos': '📖',
        'Músicas': '🎵',
        'Hinos da Harpa': '🎶'
    };
    return icons[name] || '📄';
}

// Abrir coleção
function openCollection(index) {
    currentCollection = index;
    document.getElementById('collections-view').classList.add('hidden');
    document.getElementById('collection-view').classList.add('active');
    document.getElementById('collection-title').textContent = `${getCollectionIcon(collections[index].name)} ${collections[index].name}`;
    renderDocuments();
}

// Voltar para coleções
function backToCollections() {
    currentCollection = null;
    document.getElementById('collections-view').classList.remove('hidden');
    document.getElementById('collection-view').classList.remove('active');
    document.getElementById('pdf-file').value = '';
    document.getElementById('file-name').textContent = '';
}

// Atualizar nome do arquivo selecionado
function updateFileName() {
    const fileInput = document.getElementById('pdf-file');
    const fileName = fileInput.files[0] ? fileInput.files[0].name : '';
    document.getElementById('file-name').textContent = fileName;
}

// Fazer upload de documento
function uploadDocument() {
    const fileInput = document.getElementById('pdf-file');
    const file = fileInput.files[0];

    if (!file) {
        alert('Por favor, selecione um arquivo PDF');
        return;
    }

    if (file.type !== 'application/pdf') {
        alert('Por favor, selecione um arquivo PDF válido');
        return;
    }

    // Ler o arquivo como Data URL
    const reader = new FileReader();
    reader.onload = (e) => {
        const document = {
            id: Date.now(),
            name: file.name,
            size: file.size,
            uploadDate: new Date().toLocaleDateString('pt-BR'),
            data: e.target.result // Data URL do PDF
        };

        collections[currentCollection].documents.push(document);
        saveCollections();
        renderDocuments();

        // Limpar input
        fileInput.value = '';
        document.getElementById('file-name').textContent = '';
        alert('Documento enviado com sucesso!');
    };

    reader.readAsDataURL(file);
}

// Renderizar documentos
function renderDocuments() {
    const container = document.getElementById('documents-container');
    const collection = collections[currentCollection];
    const documents = collection.documents || [];

    container.innerHTML = '';

    if (documents.length === 0) {
        container.innerHTML = '<div class="empty-message">Nenhum documento nesta coleção</div>';
        return;
    }

    documents.forEach((doc, index) => {
        const item = document.createElement('div');
        item.className = 'document-item';

        const sizeKB = (doc.size / 1024).toFixed(2);

        item.innerHTML = `
            <div class="document-info">
                <div class="document-name">📄 ${doc.name}</div>
                <div class="document-meta">
                    Tamanho: ${sizeKB} KB | Enviado em: ${doc.uploadDate}
                </div>
            </div>
            <div class="document-actions">
                <button class="download-btn" onclick="downloadDocument(${currentCollection}, ${index})">⬇️ Baixar</button>
                <button class="delete-btn is-teacher" onclick="deleteDocument(${currentCollection}, ${index})">🗑️ Deletar</button>
            </div>
        `;

        container.appendChild(item);
    });

    updateUIBasedOnRole();
}

// Baixar documento
function downloadDocument(collectionIndex, docIndex) {
    const doc = collections[collectionIndex].documents[docIndex];
    
    // Criar um link temporário para download
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Deletar documento
function deleteDocument(collectionIndex, docIndex) {
    if (confirm(`Tem certeza que deseja deletar "${collections[collectionIndex].documents[docIndex].name}"?`)) {
        collections[collectionIndex].documents.splice(docIndex, 1);
        saveCollections();
        renderDocuments();
    }
}

// Criar nova coleção
function createNewCollection() {
    const input = document.getElementById('new-collection-name');
    const name = input.value.trim();

    if (!name) {
        alert('Por favor, digite um nome para a coleção');
        return;
    }

    if (collections.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        alert('Uma coleção com este nome já existe');
        return;
    }

    collections.push({
        name: name,
        documents: []
    });

    saveCollections();
    renderCollections();
    input.value = '';
    alert(`Coleção "${name}" criada com sucesso!`);
}

// Função para limpar dados (apenas para desenvolvimento/teste)
function clearAllData() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        localStorage.removeItem('biblioteca_collections');
        collections = defaultCollections.map(name => ({
            name: name,
            documents: []
        }));
        saveCollections();
        backToCollections();
        renderCollections();
        alert('Todos os dados foram limpos');
    }
}
