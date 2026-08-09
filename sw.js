// MatchWise service worker — offline cache
const CACHE = "matchwise-v2";
const ASSETS = ["./", "index.html", "style.css", "manifest.json",
  "js/app.js", "js/cloud.js", "js/i18n.js", "js/questions.js", "js/scoring.js", "js/report.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Only the app shell is cached. Share-code lookups are POSTs to Supabase and
  // must always hit the network, or a partner's results would be served stale.
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
