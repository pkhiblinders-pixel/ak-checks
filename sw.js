// AK Checklists offline cache.
// The app page and its settings are fetched fresh whenever there's signal (so changes to config.js
// take effect on the next open), and come from this cache when there's no signal.
const V = "ak-checklists-6.42.0";
const SHELL = ["./", "index.html", "config.js", "auth.js", "msal-browser.min.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
const FRESH = /\/(index\.html|config\.js|auth\.js)?$/;
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
function timeout(ms){ return new Promise((_, no) => setTimeout(() => no(new Error("slow")), ms)); }
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;           // SharePoint and sign-in go straight to the network
  const nav = r.mode === "navigate", key = nav ? "index.html" : r;
  if (nav || FRESH.test(u.pathname)) {
    // network first (with a time limit), cache as the fallback
    e.respondWith(caches.open(V).then(c => Promise.race([fetch(r, { cache: "no-store" }), timeout(nav ? 6000 : 4000)]).then(res => {
      if (res && res.ok) c.put(key, res.clone()); return res;
    }).catch(() => c.match(key, { ignoreSearch: true }).then(hit => hit || fetch(r)))));
    return;
  }
  e.respondWith(caches.open(V).then(c => c.match(key, { ignoreSearch: true }).then(hit => hit || fetch(r).then(res => { if (res && res.ok && res.type === "basic") c.put(key, res.clone()); return res; }))));
});
