// MatchWise service worker — offline cache
const CACHE = "matchwise-v1";
const ASSETS = ["./", "index.html", "style.css", "manifest.json",
  "js/app.js", "js/i18n.js", "js/questions.js", "js/scoring.js", "js/report.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
