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
  const route = parseHash(window.location.hash);
  notify(route, { initial: false });
}

export function startRouter({ onRoute } = {}) {
  onRouteCallback = typeof onRoute === "function" ? onRoute : null;
  if (started) {
    console.warn("[Router] start called multiple times; ignoring subsequent call.");
    notify(parseHash(window.location.hash), { initial: true });
    return {
      stop() {}
    };
  }

  boundHashChange = handleHashChange;
  window.addEventListener("hashchange", boundHashChange);
  started = true;

  const initialRoute = parseHash(window.location.hash);
  notify(initialRoute, { initial: true });

  return {
    stop() {
      if (!started) return;
      window.removeEventListener("hashchange", boundHashChange);
      started = false;
      onRouteCallback = null;
      boundHashChange = null;
    }
  };
}

export function linkToChapter(slug) {
  if (!slug) return;
  const encoded = encodeURIComponent(slug);
  const desiredHash = `#novel/${encoded}`;
  if (window.location.hash === desiredHash) {
    return;
  }
  suppressNextEvent = true;
  window.location.hash = desiredHash;
}

export default {
  startRouter,
  linkToChapter
};
