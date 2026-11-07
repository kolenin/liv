const CACHE = 'lfc-tracker-v23';
const LOGOS = 'lfc-logos';   // логотипы клубов с ESPN: кэшируются при первом показе и дальше работают оффлайн
const ASSETS = [
  './', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== LOGOS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML/манифест: сначала сеть (чтобы обновления доходили сразу), оффлайн — из кэша.
// Остальное (иконки, эмблемы): сначала кэш.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) {
    // логотипы ESPN: сначала кэш, при первом показе сохраняем; всё остальное внешнее (API) — напрямую из сети
    if (e.request.destination === 'image' && /espncdn\.com$/.test(url.hostname)) {
      e.respondWith(caches.open(LOGOS).then(c => c.match(e.request).then(hit => hit ||
        fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }).catch(() => hit))));
    }
    return;
  }
  const fresh = e.request.mode === 'navigate' || /\.(html|json|js)$/.test(url.pathname);
  const save = res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return res; };
  e.respondWith(fresh
    ? fetch(e.request).then(save).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    : caches.match(e.request).then(r => r || fetch(e.request).then(save))
  );
});
