/* Service Worker — AGESCI Tool Bilancio Helper (PWA)
   Strategia:
   - App shell (index.html, manifest, icone): cache-first, così l'app si apre anche offline.
   - Chiamate API a bilancio.agesci.it: SEMPRE network-only, mai in cache
     (i dati di bilancio devono essere sempre aggiornati e non vanno salvati).
   - Richieste non-GET (POST/PUT/DELETE): sempre network-only.
*/
const CACHE_NAME = "agesci-bilancio-helper-v42";
const APP_SHELL = [
  "./",
  "./index.html",
  "./bank-statement.js?v=1",
  "./bank-import-v6.js",
  "./bank-import.js?v=4",
  "./bank-import.js?v=5",
  "./vendor/pdfjs/pdf.min.mjs",
  "./vendor/pdfjs/pdf.worker.min.mjs",
  "./manifest.json",
  "./icons/icon-48.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if ((key.startsWith("agesci-bilancio-helper-") && key !== CACHE_NAME) || key.startsWith("agesci-bilancio-ocr-")) return caches.delete(key);
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET possono essere cachate; tutto il resto va in rete.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API di bilancio: mai in cache, sempre rete.
  if (url.hostname === "bilancio.agesci.it") return;

  // Navigazioni (apertura pagina): network-first con fallback alla cache,
  // così gli aggiornamenti dell'app arrivano subito ma offline si apre comunque.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Risorse statiche same-origin: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then(async (res) => {
          if (res && res.status === 200) {
            try { const cache = await caches.open(CACHE_NAME); await cache.put(request, res.clone()); } catch (_) { /* L'app resta utilizzabile se la cache è piena. */ }
          }
          return res;
        });
      })
    );
  }
});
