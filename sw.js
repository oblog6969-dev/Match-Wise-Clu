// MatchWise service worker — offline cache
//
// IMPORTANT: bump CACHE on every release that changes any file below.
// The activate handler deletes every cache whose key !== CACHE, so a new
// name is what actually evicts the old files. Leaving the name unchanged
// means already-installed phones keep serving the previous version forever,
// because the fetch handler answers from cache first and never revalidates.
//
// Equally important: every file the app imports must be listed in ASSETS.
// Anything missing isn't precached, so offline it falls through to a network
// fetch that can't succeed — and since js/app.js imports the v3 modules at
// load time, one missing entry breaks the whole app, not just one feature.
const CACHE = "matchwise-v6";
const ASSETS = ["./", "index.html", "style.css", "manifest.json",
  "js/app.js", "js/cloud.js", "js/i18n.js", "js/questions.js", "js/scoring.js", "js/report.js",
  "js/questions-v3.js", "js/scoring-v3.js", "js/report-v3.js",
  "js/questions-v4.js", "js/scoring-v4.js", "js/report-v4.js",
  "js/scoring-v5.js", "js/demo-v5.js", "js/crypto-v5.js", "js/report-v5.js",
  "js/scoring-v6.js", "js/report-v6.js"];

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
