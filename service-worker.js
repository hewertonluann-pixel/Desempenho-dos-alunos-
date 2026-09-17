const CACHE_NAME = "painel-orquestra-cache-v42";
const urlsToCache = [
  "/",
  "/index.html",
  "/aluno.html",
  "/professor.html",
  "/coral.html",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/logo-fa.jpeg",
  "/manifest-coral.json",
  "/ensaio2.html",
  "/auth.js",
  "/firebase-config.js",
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
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        if (event.request.destination === "image") {
          return caches.match("/icon-192.png");
        }
        return new Response("Recurso temporariamente indisponível", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
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
