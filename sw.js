const CACHE = 'mounjaro-v32';
const SHELL = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  // Cache each shell file independently (not addAll) — one failed fetch
  // should never block the whole service worker from installing/updating.
  // Cross-origin CDN resources (fonts, Chart.js) are intentionally NOT
  // precached here; they're cached opportunistically by the fetch handler
  // below instead, so a flaky third-party CDN can't ever get this app
  // permanently stuck on an old cached version again.
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(SHELL.map(url => c.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Firebase/Firestore: always straight to network
  if (e.request.url.includes('firestore') || e.request.url.includes('firebase')) {
    return;
  }

  // App shell (HTML navigations): NETWORK FIRST so updates arrive immediately,
  // cache fallback so the app still opens offline
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./')))
    );
    return;
  }

  // Static assets (fonts, Chart.js, icons): cache first for speed
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200 && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
