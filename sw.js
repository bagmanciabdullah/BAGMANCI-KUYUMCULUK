const OFFLINE_CACHE = 'bagmanci-offline-v1';
const OFFLINE_URL = new URL('offline.html', self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache => cache.add(OFFLINE_URL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('bagmanci-offline-') && key !== OFFLINE_CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Prices, accounts, orders and API responses always come from the network.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const base = new URL(self.registration.scope);
  const page = url.pathname.slice(base.pathname.length);
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || url.origin !== base.origin || !['', 'index.html', 'product.html'].includes(page)) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cached = await caches.match(OFFLINE_URL);
    return cached || new Response('İnternet bağlantınızı kontrol edin.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
