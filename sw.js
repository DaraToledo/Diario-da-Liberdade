/* Service Worker do Diário de Liberdade
   Faz o app funcionar 100% offline depois da primeira visita.
   Cacheia o HTML, o CSS, todos os módulos JS e as fontes.
   Ao mudar arquivos, suba o número da versão (v25 → v26) para forçar atualização. */

const CACHE = 'diario-liberdade-v25';

const APP_FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/core.js',
  './js/storage.js',
  './js/security.js',
  './js/navigation.js',
  './js/diary.js',
  './js/juridico.js',
  './js/audio.js',
  './js/support.js',
  './js/features.js',
  './js/app.js',
  './manifest.json',
];

const FONTS = [
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => {
      const reqs = [...APP_FILES, ...FONTS];
      // allSettled: se um arquivo falhar, não trava a instalação inteira
      return Promise.allSettled(reqs.map(r => c.add(r).catch(() => {})));
    })
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
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isSelf = url.origin === self.location.origin;
  const isFonts = url.hostname.includes('fonts.g') || url.hostname.includes('fonts.googleapis');

  if (isSelf || isFonts) {
    // Cache-first: o app e as fontes vêm do cache (rápido e offline)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
      })
    );
  } else {
    // Network-first para recursos externos (mapas, QR): tenta a rede, cai no cache
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
