const SW_VERSION = "v12";
const CACHE_NAME = `xinghai-static-${SW_VERSION}`;
const ASSETS = [
  "./",
  "./index.html",
  "./search/index.html",
  "./read.html",
  "./css/main.css",
  "./css/base/variables.css",
  "./css/base/reset.css",
  "./css/layout/header.css",
  "./css/components/buttons.css",
  "./css/components/forms.css",
  "./css/components/search.css",
  "./css/components/trending.css",
  "./css/components/global-search.css",
  "./css/pages/landing.css",
  "./css/pages/search-page.css",
  "./css/reader/immersive.css",
  "./css/reader/layout.css",
  "./css/reader/toolbar.css",
  "./css/reader/audio-player.css",
  "./css/reader/annotations.css",
  "./css/reader/fab.css",
  "./css/utilities/helpers.css",
  "./css/utilities/responsive.css",
  "./js/main.js",
  "./js/app/initApp.js",
  "./js/pages/immersiveReader.js",
  "./js/pages/search.js",
  "./js/search/popularity.js",
  "./js/services/Stores.js",
  "./js/services/ChaptersRepo.js",
  "./js/services/ThemeService.js",
  "./js/services/AudioPlayer.js",
  "./js/services/Shortcuts.js",
  "./js/services/UniverseCodex.js",
  "./js/reader/ProgressTracker.js",
  "./js/reader/ReaderView.js",
  "./js/reader/TocList.js",
  "./js/reader/SearchInChapter.js",
  "./js/modal/ReaderModal.js",
  "./js/a11y/FocusTrap.js",
  "./js/router.js",
  "./js/strings.js",
  "./chapters.json",
  "./data/books.json",
  "./data/universe.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function broadcastWaiting() {
  if (!self.registration?.waiting) {
    return;
  }
  self.clients
    .matchAll({ includeUncontrolled: true, type: "window" })
    .then((clients) => {
      if (!clients || clients.length === 0) {
        return;
      }
      clients.forEach((client) => {
        client.postMessage({
          type: "SW_WAITING",
          version: SW_VERSION
        });
      });
    })
    .catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => {
        setTimeout(broadcastWaiting, 120);
      })
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
      .then(async () => {
        await self.clients.claim();
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
        clients.forEach((client) => {
          client.postMessage({
            type: "SW_ACTIVATED",
            version: SW_VERSION
          });
        });
      })
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

  if (request.mode === "navigate") {
    if (/^\/novel\/[^/]+\/?$/.test(requestUrl.pathname)) {
      event.respondWith(
        caches
          .match("/read.html")
          .then((cachedResponse) => cachedResponse || fetch("/read.html"))
      );
      return;
    }
    if (requestUrl.pathname === "/search" || requestUrl.pathname === "/search/") {
      event.respondWith(
        caches
          .match("/search/index.html")
          .then((cachedResponse) => cachedResponse || fetch("/search/index.html"))
      );
      return;
    }
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
