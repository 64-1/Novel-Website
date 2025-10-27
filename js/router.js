(function (global) {
  if (global.NovelRouter) {
    return;
  }

  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function parseHash(rawHash) {
    if (!rawHash) return null;
    const hash = rawHash.replace(/^#/, "");
    if (!hash) return null;

    if (hash === "reader") {
      return { type: "reader" };
    }
    if (hash === "writer") {
      return { type: "writer" };
    }
    if (hash.startsWith("novel/")) {
      const slugPart = hash.slice("novel/".length);
      if (!slugPart) {
        return null;
      }
      const decoded = safeDecode(slugPart);
      return {
        type: "novel",
        slug: decoded,
        encodedSlug: slugPart
      };
    }
    return null;
  }

  const Router = (() => {
    let onRouteCallback = null;
    let started = false;
    let suppressNextEvent = false;
    let boundHashChange = null;

    function notify(route, { initial = false } = {}) {
      if (typeof onRouteCallback === "function") {
        if (route) {
          onRouteCallback({ ...route, initial });
        } else {
          onRouteCallback(null);
        }
      }
    }

    function handleHashChange() {
      if (suppressNextEvent) {
        suppressNextEvent = false;
        return;
      }
      const route = parseHash(global.location.hash);
      notify(route, { initial: false });
    }

    function start({ onRoute } = {}) {
      onRouteCallback = typeof onRoute === "function" ? onRoute : null;
      if (started) {
        console.warn("[Router] start called multiple times; ignoring subsequent call.");
        notify(parseHash(global.location.hash), { initial: true });
        return {
          stop() {}
        };
      }

      boundHashChange = handleHashChange;
      global.addEventListener("hashchange", boundHashChange);
      started = true;

      const initialRoute = parseHash(global.location.hash);
      notify(initialRoute, { initial: true });

      return {
        stop() {
          if (!started) return;
          global.removeEventListener("hashchange", boundHashChange);
          started = false;
          onRouteCallback = null;
          boundHashChange = null;
        }
      };
    }

    function linkToChapter(slug) {
      if (!slug) return;
      const encoded = encodeURIComponent(slug);
      const desiredHash = `#novel/${encoded}`;
      if (global.location.hash === desiredHash) {
        return;
      }
      suppressNextEvent = true;
      global.location.hash = desiredHash;
    }

    return Object.freeze({
      start,
      linkToChapter
    });
  })();

  global.NovelRouter = Router;
})(window);

