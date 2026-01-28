// loader.js

// Array com os emojis: sax, violino, trompete, trombone (aprox. 🎶), bumbo, clave de sol, teclado
const emojis = ['🎷', '🎻', '🎺', '🎶', '🥁', '🎵', '🎹'];
let emojiIndex = 0;
let emojiInterval;

// Versículos de louvor
const verses = [
    { text: "Louvem o Senhor com a lira, toquem para ele na harpa de dez cordas.", reference: "Salmo 33:2" },
    { text: "Cantai ao Senhor um cântico novo; cantai louvores a ele na assembleia dos santos.", reference: "Salmo 149:1" },
    { text: "Tudo que tem fôlego louve ao Senhor. Aleluia!", reference: "Salmo 150:6" },
    { text: "Alegrem-se no Senhor e exultem, vocês, os justos; cantem de alegria, todos vocês, de coração reto!", reference: "Salmo 97:12" },
    { text: "Cantarei ao Senhor enquanto eu viver; entoarei louvores ao meu Deus enquanto eu existir.", reference: "Salmo 104:33" },
    { text: "Louvem o Senhor! Porque é bom cantar louvores ao nosso Deus, pois é agradável e apropriado fazê-lo.", reference: "Salmo 147:1" }
];

function startLoader() {
    const emojiContainer = document.getElementById('emoji-container');
    if (emojiContainer) {
        emojiInterval = setInterval(() => {
            emojiContainer.textContent = emojis[emojiIndex];
            emojiIndex = (emojiIndex + 1) % emojis.length;
        }, 300);
    }
    
    // Exibir versículo aleatório
    displayRandomVerse();
}

function displayRandomVerse() {
    const verseContainer = document.getElementById('verse-container');
    if (verseContainer) {
        const randomVerse = verses[Math.floor(Math.random() * verses.length)];
        const verseText = document.getElementById('verse-text');
        const verseReference = document.getElementById('verse-reference');
        
        if (verseText) verseText.textContent = '"' + randomVerse.text + '"';
        if (verseReference) verseReference.textContent = randomVerse.reference;
    }
}

function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        clearInterval(emojiInterval);
        loader.classList.add('loader-hidden');
        // Remove o loader do DOM após a transição
        setTimeout(() => {
            loader.remove();
            document.body.classList.remove('loader-active');
        }, 500); // 500ms é o tempo da transição no CSS
    }
}

// Inicia o loader assim que o script é carregado
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loader-active');
    startLoader();
});

// Esconde o loader quando a página está completamente carregada
// Aguarda o evento 'load' que garante que todos os recursos (imagens, scripts, etc) foram carregados
window.addEventListener('load', () => {
    // Aguarda um pequeno delay para garantir que o DOM foi renderizado completamente
    setTimeout(() => {
        hideLoader();
    }, 1000); // 1 segundo de delay para garantir renderização completa
});

// Fallback: se por algum motivo o 'load' não disparar, esconde após 10 segundos
setTimeout(() => {
    const loader = document.getElementById('global-loader');
    if (loader && !loader.classList.contains('loader-hidden')) {
        hideLoader();
    }
}, 10000);

// Exporta a função para ser chamada quando o conteúdo principal estiver pronto
window.hideLoader = hideLoader;
