// Service worker Sistem Relief Guru — halaman: network-first, fail lain: network-first
const CACHE = 'relief-guru-v2c.28.0';
const ASET = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './xlsx.full.min.js', './relief-engine.js?v=2.15.0'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ASET.map(a => c.add(a)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => (n.startsWith('relief-guru-')||n.startsWith('relef-guru-')) && n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  if(new URL(req.url).origin!==self.location.origin) return;
  // Network-first so a new relief engine always reaches the user; cache only when offline.
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req)));
});
