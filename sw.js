// Service worker — clears local cache on every activation, then serves
// network-first on every fetch. This is what makes the site pick up
// fresh content even when the browser has a previous version cached.
//
// Strategy:
//   install   → skipWaiting() so the new SW takes over immediately
//   activate  → delete every cache the browser knows about, then claim
//               all open clients so they're controlled by this SW
//               without needing a reload
//   fetch     → try network first; only fall back to the cache if the
//               network is unreachable (offline). The cache fallback is
//               empty in practice because activate just wiped it, but
//               keeping it lets the page still load if the visitor is
//               offline after a fresh SW install.
//
// Cache-Control on the HTML response (set via <meta> in index.html) is
// what guarantees the SW file itself is re-fetched each visit, which is
// what guarantees activate() runs each visit.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      // Don't put opaque / cross-origin responses (YouTube embeds,
      // CDN images) into a shared cache — they'd be useless anyway
      // and pollute the storage budget.
      if (response.type === 'basic') {
        const cache = await caches.open('runtime');
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      return cached || new Response('', { status: 503, statusText: 'offline' });
    }
  })());
});