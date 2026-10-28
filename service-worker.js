const CACHE_NAME = 'bid-futebol-amador-shell-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('bid-futebol-amador-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/') || url.pathname.includes('/storage/v1/')) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then((response) => {
      if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy)); }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(req).then((response) => {
    if (response && response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)); }
    return response;
  }).catch(() => caches.match(req)));
});
