const CACHE_NAME = "painel-orquestra-cache-v45";
const APP_SCOPE = self.registration.scope;

const arquivosEssenciais = [
  ".",
  "index.html",
  "login.js",
  "auth.js",
  "firebase-config.js",
  "manifest.json",
  "aluno.html",
  "professor.html",
  "favicon.svg",
  "icon-192.png",
  "icon-512.png",
  "logo-fa.jpeg",
  "aluno.css",
  "professor.css"
];

function urlDoApp(caminho) {
  return new URL(caminho, APP_SCOPE).toString();
}

const urlsToCache = arquivosEssenciais.map(urlDoApp);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const isNavigation = request.mode === "navigate" || request.destination === "document";
  const isCode = request.destination === "script" || request.url.endsWith(".js");

  if (isNavigation || isCode) {
    // Atualiza HTML e JavaScript assim que houver rede, sem prender o PWA a uma versão antiga.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});
