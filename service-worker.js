const CACHE_NAME = "painel-orquestra-cache-v2";
const urlsToCache = [
  "/", // Atual versões para relative paths se hospedado em subfolder
  //"/index.html",
  //"/aluno.html",
  //"/professor.html",
  "/aluno.css",
  "/conquistas.js",
  "/professor.css",
  "/manifest.json", // Adicione manifesto se não estiver
  "/favicon.svg" // Ícone
  // Adicione outros locais necessários (ex.: ícones 192px, 512px)
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }).catch(err => console.error('Erro no cache install:', err))
  );
});

self.addEventListener("fetch", (event) => {
  // Apenas gerenci GET, e ignore externos (como via.placeholder.com)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return fetch(event.request); // Não cacheie externos – deixe browser lidar direto
  }

  // Para URLs locais: Cache-first com fallback seguro
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(err => {
        console.warn('Fetch falhou para:', event.request.url, err);
        // Fallback: Retorne uma página de erro simples se for page critical
        if (event.request.destination === 'document') {
          return caches.match('/index.html'); // Ou 404.html se tiver
        }
        // Para outros (ex.: imagens), retorne response vazio para não quebrar
        return new Response('', { status: 200, statusText: 'OK' });
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
