// loader.js

// Array com os emojis: sax, violino, trompete, trombone (aprox. 🎶), bumbo, clave de sol, teclado
const emojis = ['🎷', '🎻', '🎺', '🎶', '🥁', '🎵', '🎹'];
let emojiIndex = 0;
let emojiInterval;

function startLoader() {
    const emojiContainer = document.getElementById('emoji-container');
    if (emojiContainer) {
        emojiInterval = setInterval(() => {
            emojiContainer.textContent = emojis[emojiIndex];
            emojiIndex = (emojiIndex + 1) % emojis.length;
        }, 300);
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

// Esconde o loader automaticamente após o carregamento completo da página
window.addEventListener('load', () => {
    setTimeout(() => {
        hideLoader();
    }, 500);
});

// Exporta a função para ser chamada quando o conteúdo principal estiver pronto
window.hideLoader = hideLoader;
