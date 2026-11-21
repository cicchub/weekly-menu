/* Weekly Menu · sw.js
   Fa aprire l'app anche senza rete. Prima prova la rete (con un limite di tempo), così arriva sempre
   l'ultima versione; se la rete non risponde, usa la copia salvata. Le chiamate a GitHub non passano da qui.
   A ogni pubblicazione cambia VERSIONE, così le copie vecchie vengono buttate. */
const VERSIONE = 'weekly-menu-2026-11-21a';
const FILE = ['./', 'index.html', 'app.js', 'archivio.js', 'piano.js', 'manifest.json', 'icon.png'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSIONE)
    .then((c) => c.addAll(FILE.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function conLimite(promessa, ms) {
  return new Promise((ok, ko) => {
    const t = setTimeout(() => ko(new Error('la rete non risponde')), ms);
    promessa.then((r) => { clearTimeout(t); ok(r); }, (e) => { clearTimeout(t); ko(e); });
  });
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/finto-github/')) return; /* GitHub e le prove: non li tocco */
  const pagina = req.mode === 'navigate';
  ev.respondWith((async () => {
    const cache = await caches.open(VERSIONE);
    try {
      const rete = await conLimite(fetch(pagina ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : new Request(req, { cache: 'no-cache' })), 4000);
      if (rete.ok && rete.type === 'basic') await cache.put(pagina ? 'index.html' : req, rete.clone());
      return rete;
    } catch (e) {
      const copia = (await cache.match(req, { ignoreSearch: true })) || (pagina ? await cache.match('index.html') : undefined);
      return copia || Response.error();
    }
  })());
});
