const CACHE_NAME = "vch-cache-v2";
const STATIC_ASSETS = [
  "/",
  "/rosa",
  "/calendario",
  "/classifica",
  "/cannonieri",
  "/campi",
  "/news",
  "/galleria",
  "/competizioni",
  "/staff",
  "/sponsors",
  "/logo.jpeg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    // Una pagina che non risponde non deve bloccare l'installazione (e con essa le notifiche)
    caches.open(CACHE_NAME).then((cache) => Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Solo le pagine del sito: dati Supabase, API e admin passano senza cache
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/adminwebapp")) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Notifiche push inviate dall'admin (/api/push/send)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };
  if (data.image) options.image = data.image;
  event.waitUntil(self.registration.showNotification(data.title || "Victoria Casa Hirta", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const sameOrigin = windows.find((w) => w.url.startsWith(self.location.origin));
      if (sameOrigin && new URL(target).origin === self.location.origin) {
        return sameOrigin.focus().then((w) => (w ? w.navigate(target) : self.clients.openWindow(target)));
      }
      return self.clients.openWindow(target);
    })
  );
});
