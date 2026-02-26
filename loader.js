// loader.js

const emojis = ['🎷', '🎻', '🎺', '🎶', '🥁', '🎵', '🎹'];
let emojiIndex = 0;
let emojiInterval;
let loaderHidden = false;

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
    if (loaderHidden) return;
    loaderHidden = true;

    const loader = document.getElementById('global-loader');
    if (loader) {
        clearInterval(emojiInterval);
        loader.classList.add('loader-hidden');
        setTimeout(() => {
            loader.remove();
            document.body.classList.remove('loader-active');
        }, 500);
    }
}

function checkPageReady() {
    if (document.readyState === 'complete') return true;

    const criticalElements = document.querySelectorAll('[data-critical]');
    if (criticalElements.length > 0) {
        let allLoaded = true;
        criticalElements.forEach(el => { if (!el.dataset.loaded) allLoaded = false; });
        return allLoaded;
    }

    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('loader-active');
    startLoader();
});

window.addEventListener('load', () => {
    setTimeout(() => { hideLoader(); }, 2000);
});

setTimeout(() => {
    if (!loaderHidden) hideLoader();
}, 15000);

const readyCheckInterval = setInterval(() => {
    if (!loaderHidden && checkPageReady()) {
        clearInterval(readyCheckInterval);
        setTimeout(() => { hideLoader(); }, 500);
    }
}, 500);

window.hideLoader = hideLoader;
