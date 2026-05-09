const CACHE_NAME = "align-static-v5";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/align-icon.png",
  "/align-logo.png",
  "/align-logo-light.png",
  "/hero-mountain.webp",
  "/heroes/midnight-mountain.webp",
  "/heroes/violet-dunes.webp",
  "/heroes/neon-skyline.webp",
  "/heroes/moonlit-ocean.webp",
  "/heroes/shadow-peaks.webp",
  "/heroes/morning-lake.webp",
  "/heroes/aqua-ribbon.webp",
  "/heroes/violet-city.webp",
  "/heroes/mist-ink-mountains.webp",
  "/heroes/luminous-grove.webp",
  "/heroes/ember-village.webp",
  "/heroes/sky-citadel.webp",
  "/heroes/pixel-valley.webp",
  "/heroes/island-kingdom.webp",
  "/heroes/candlekeep-tavern.webp",
  "/heroes/ringed-planet.webp",
  "/heroes/orbital-station.webp",
  "/heroes/galaxy-outpost.webp",
  "/heroes/cloud-realm.webp",
  "/heroes/pixel-spaceport.webp"
];
const IS_TAURI_RUNTIME =
  self.location.protocol === "tauri:" || self.location.origin.includes("tauri.localhost");

if (IS_TAURI_RUNTIME) {
  self.addEventListener("install", (event) => {
    event.waitUntil(self.skipWaiting());
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.claim())
    );
  });
} else {
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
      return;
    }

    if (request.mode === "navigate") {
      event.respondWith(fetch(request).catch(() => caches.match("/")));
      return;
    }

    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") return response;

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  });
}
