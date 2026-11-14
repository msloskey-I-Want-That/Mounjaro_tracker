const CACHE = 'mounjaro-v33'; // v33: old caches held food-search and barcode answers (some with API keys in the URL); activate deletes them
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

  // Static assets (this app's own files, fonts, Chart.js and other CDN libraries): cache first for speed.
  // Everything else (food databases, barcode lookups, AI, ntfy) goes straight to the network and is never stored:
  // a cached "not found" for a barcode would otherwise stick forever, and some of those URLs carry API keys.
  if (e.request.method !== 'GET') return;
  let host = '';
  try { const u = new URL(e.request.url); host = u.origin === self.location.origin ? 'self' : u.hostname; } catch (err) { return; }
  if (!['self', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'].includes(host)) return;
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
