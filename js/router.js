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

function parsePath(pathname) {
  if (!pathname) return null;
  const match = pathname.match(/^\/novel\/([^/?#]+)\/?$/);
  if (!match) {
    return null;
  }
  const encodedSlug = match[1];
  const slug = safeDecode(encodedSlug);
  return {
    type: "novel",
    slug,
    encodedSlug
  };
}

function parseLocation({ pathname, hash } = window.location) {
  return parsePath(pathname) || parseHash(hash);
}

let onRouteCallback = null;
let started = false;
let suppressNextEvent = false;
let boundHashChange = null;
let boundPopState = null;

function notify(route, { initial = false } = {}) {
  if (typeof onRouteCallback === "function") {
    if (route) {
      onRouteCallback({ ...route, initial });
    } else {
      onRouteCallback(null);
    }
  }
}

function emitCurrentRoute({ initial = false } = {}) {
  const route = parseLocation(window.location);
  notify(route, { initial });
}

function handleHashChange() {
  if (suppressNextEvent) {
    suppressNextEvent = false;
    return;
  }
  emitCurrentRoute({ initial: false });
}

function handlePopState() {
  emitCurrentRoute({ initial: false });
}

function shouldUsePathMode(mode) {
  if (mode === "path") return true;
  if (mode === "hash") return false;
  const { pathname } = window.location;
  if (/^\/novel\/[^/]*\/?$/.test(pathname)) {
    return true;
  }
  return pathname === "/read.html";
}

export function startRouter({ onRoute } = {}) {
  onRouteCallback = typeof onRoute === "function" ? onRoute : null;
  if (started) {
    console.warn("[Router] start called multiple times; ignoring subsequent call.");
    emitCurrentRoute({ initial: true });
    return {
      stop() {}
    };
  }

  boundHashChange = handleHashChange;
  boundPopState = handlePopState;
  window.addEventListener("hashchange", boundHashChange);
  window.addEventListener("popstate", boundPopState);
  started = true;

  emitCurrentRoute({ initial: true });

  return {
    stop() {
      if (!started) return;
      window.removeEventListener("hashchange", boundHashChange);
      window.removeEventListener("popstate", boundPopState);
      started = false;
      onRouteCallback = null;
      boundHashChange = null;
      boundPopState = null;
    }
  };
}

export function linkToChapter(slug, options = {}) {
  if (!slug) return;
  const encoded = encodeURIComponent(slug);
  const { replace = false, search, mode = "auto" } = options;
  const usePath = shouldUsePathMode(mode);

  if (usePath) {
    const url = new URL(window.location.href);
    url.pathname = `/novel/${encoded}`;
    if (search instanceof URLSearchParams) {
      const serialized = search.toString();
      url.search = serialized ? `?${serialized}` : "";
    } else if (typeof search === "string") {
      url.search = search ? (search.startsWith("?") ? search : `?${search}`) : "";
    } else if (search === null) {
      url.search = "";
    } else {
      url.searchParams.delete("chapter");
    }
    url.hash = "";
    const method = replace ? "replaceState" : "pushState";
    const targetPath = `${url.pathname}${url.search}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (!replace && targetPath === currentPath) {
      return;
    }
    history[method](null, "", `${url.pathname}${url.search}`);
    notify(
      {
        type: "novel",
        slug,
        encodedSlug: encoded
      },
      { initial: false }
    );
    return;
  }

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
