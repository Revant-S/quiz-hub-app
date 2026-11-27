// Quiz Hub service worker: app shell works offline; quiz files live in Cache "qh-quizzes" (written by the page).
const SHELL = "qh-shell-v1", CDN = "qh-cdn-v1";
const FILES = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const CDN_HOSTS = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("qh-shell-") && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (u.pathname.includes("/api/")) return;              // desktop publisher endpoints: never cache
    e.respondWith(fetch(req).then(r => {                    // network first, so app updates arrive
      if (r.ok) { const c = r.clone(); caches.open(SHELL).then(ch => ch.put(req.mode === "navigate" ? "./" : req, c)); }
      return r;
    }).catch(() => caches.match(req.mode === "navigate" ? "./" : req, {ignoreSearch: true})
      .then(r => r || caches.match("./"))));
    return;
  }
  if (CDN_HOSTS.includes(u.hostname)) {                     // MathJax + fonts: cache first, for offline quizzes
    e.respondWith(caches.open(CDN).then(c => c.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok || r.type === "opaque") c.put(req, r.clone());
      return r;
    }))));
  }
});
