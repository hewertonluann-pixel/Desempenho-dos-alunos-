const CACHE_NAME = "painel-orquestra-cache-v18";
const urlsToCache = [
  "/",
  "/index.html",
  "/aluno.html",
  "/professor.html",
  "/aluno.css",
  "/conquistas.js",
  "/professor.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Ignorar requisições que não sejam GET
  if (event.request.method !== 'GET') return;

  // Ignorar requisições para domínios externos (Firebase, Google Fonts, etc)
  // Isso evita erros de CORS e 'Failed to fetch' no Service Worker
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Fallback silencioso se o fetch falhar
        return null;
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
