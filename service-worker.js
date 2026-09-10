const CACHE_NAME = "ito-game-cache-v8-8-20260911";

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./topics.csv",
  "./topics-data.js",
  "./wolf-topics.csv",
  "./wolf-topics-data.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(CORE_ASSETS);
      })
  );
});

self.addEventListener("message", function(event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.map(function(key) {
            if (key !== CACHE_NAME && key.indexOf("ito-game-cache-") === 0) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;

  const requestURL = new URL(event.request.url);
  if (requestURL.origin !== self.location.origin) return;

  // HTML navigation: try network first so updates appear quickly,
  // then fall back to the cached app shell when offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put("./index.html", copy);
            });
          }
          return response;
        })
        .catch(function() {
          return caches.match("./index.html")
            .then(function(response) {
              return response || caches.match("./");
            });
        })
    );
    return;
  }

  // Static files / CSV: cache first, network fallback.
  event.respondWith(
    caches.match(event.request)
      .then(function(cached) {
        if (cached) return cached;

        return fetch(event.request).then(function(response) {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }

          const copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, copy);
          });
          return response;
        });
      })
  );
});
