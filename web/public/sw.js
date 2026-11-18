/**
 * web/public/sw.js
 *
 * Service Worker for Questcademy Student App.
 * Caches app shell, fonts, and active node learning content for offline use.
 */

const CACHE_NAME = "questcademy-student-v1";
const STATIC_ASSETS = [
  "/",
  "/learn",
  "/practice",
  "/tutor",
  "/tests",
  "/progress",
  "/profile",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("SW: failed to pre-cache some assets:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Pass non-GET requests through directly
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // Network first for API, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then((res) => {
          return res || new Response(JSON.stringify({ offline: true, error: "Network unavailable" }), {
            headers: { "Content-Type": "application/json" },
          });
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for pages and static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
