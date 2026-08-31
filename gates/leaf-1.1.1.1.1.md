# Gates: Installable assets

Scope: Manifest, icons, and service worker make the shell installable and cache its entrypoint.

- [x] G1: Manifest declares a standalone SplitShare application.
  CHECK: rg -n '"display": "standalone"' public/manifest.webmanifest
  EXPECT: standalone
  EVIDENCE: 6:  "display": "standalone",

- [x] G2: Service worker is registered from the app and caches the shell.
  CHECK: rg -n "serviceWorker.register|splitshare-shell|install|fetch" src/main.jsx public/sw.js
  EXPECT: serviceWorker.register
  EVIDENCE: public/sw.js:15:  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))); | src/main.jsx:9:  window.addEventListener('load', () => navigator.serviceWorker.regi
