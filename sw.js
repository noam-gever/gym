/* Service Worker — האפליקציה נפתחת גם בלי אינטרנט בחדר כושר */
const CACHE = 'noam-gym-v43';
const CORE = ['./', './index.html', './manifest.json', './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => c.add('./index.html'))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  /* בקשות סנכרון לגוגל — תמיד רשת, אף פעם לא מטמון */
  if (url.hostname.includes('script.google') || url.hostname.includes('googleusercontent')) return;

  if (e.request.mode === 'navigate') {
    /* דף ראשי: רשת קודם (כדי לקבל עדכונים), מטמון אם אין אינטרנט */
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) { /* דף שגיאה זמני לא מרעיל את המטמון */
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return r;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  /* שאר הקבצים (פונטים, אייקונים): מטמון קודם, רשת כגיבוי */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if ((r.ok && url.origin === location.origin) || (url.hostname.includes('fonts.g') && (r.ok || r.type === 'opaque'))) {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return r;
    }))
  );
});
