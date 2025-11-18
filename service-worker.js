const CACHE_NAME = "painel-orquestra-cache-v2";
const urlsToCache = [
  "/",
  "/index.html",
  "/aluno.html",
  "/professor.html",
  "/aluno.css",
  "/conquistas.js",
  "/professor.css"
];

// Instala e cria novo cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// NETWORK FIRST — sempre tenta buscar versão nova
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Atualiza o cache com a versão nova
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // Se estiver offline, usa o cache
        return caches.match(event.request);
      })
  );
});

// Remove caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
