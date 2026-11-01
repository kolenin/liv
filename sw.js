const CACHE = 'lfc-tracker-v14';
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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML/манифест: сначала сеть (чтобы обновления доходили сразу), оффлайн — из кэша.
// Остальное (иконки, эмблемы): сначала кэш.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // API ESPN и внешние картинки — всегда напрямую из сети
  const fresh = e.request.mode === 'navigate' || /\.(html|json|js)$/.test(url.pathname);
  const save = res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return res; };
  e.respondWith(fresh
    ? fetch(e.request).then(save).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    : caches.match(e.request).then(r => r || fetch(e.request).then(save))
  );
});
