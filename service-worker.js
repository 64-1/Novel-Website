const CACHE_NAME = "xinghai-static-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/main.js",
  "./js/app/initApp.js",
  "./js/services/Stores.js",
  "./js/services/ChaptersRepo.js",
  "./js/services/ThemeService.js",
  "./js/services/Shortcuts.js",
  "./js/reader/ProgressTracker.js",
  "./js/reader/ReaderView.js",
  "./js/reader/TocList.js",
  "./js/modal/ReaderModal.js",
  "./js/a11y/FocusTrap.js",
  "./js/router.js",
  "./js/strings.js",
  "./chapters.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((error) => {
            if (!cachedResponse) {
              throw error;
            }
            return cachedResponse;
          });

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetchPromise;
      })
    )
  );
});
