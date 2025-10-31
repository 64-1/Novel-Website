export function createNavigationController() {
  function readSlugInfo() {
    const pathMatch = window.location.pathname.match(/^\/novel\/([^/]+)\/?$/);
    if (pathMatch) {
      return {
        slug: decodeURIComponent(pathMatch[1]),
        source: "path"
      };
    }
    const hashMatch = window.location.hash.match(/^#novel\/(.+)$/);
    if (hashMatch) {
      return {
        slug: decodeURIComponent(hashMatch[1]),
        source: "hash"
      };
    }
    const params = new URLSearchParams(window.location.search);
    const querySlug = params.get("slug");
    if (querySlug) {
      return {
        slug: querySlug,
        source: "query"
      };
    }
    return {
      slug: null,
      source: null
    };
  }

  function readSlugFromUrl() {
    return readSlugInfo().slug;
  }

  function pushUrlWithSlug(slug) {
    const url = new URL(window.location.href);
    url.pathname = "/read.html";
    if (slug) {
      url.searchParams.set("slug", slug);
    } else {
      url.searchParams.delete("slug");
    }
    history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }

  function buildShareUrl(slug) {
    const origin = window.location.origin || "";
    const url = new URL("/read.html", origin);
    if (slug) {
      url.searchParams.set("slug", slug);
    }
    return url.toString();
  }

  function updateDocumentMeta(chapter) {
    if (!chapter) return;
    document.title = `${chapter.title} · 星海小说`;
    const description =
      chapter.summary ||
      (Array.isArray(chapter.paragraphs) ? String(chapter.paragraphs[0]?.text || "").slice(0, 64) : "");
    updateMeta("description", description);
    updateMeta('property="og:title"', document.title);
    updateMeta('property="og:description"', description);
    updateMeta('name="twitter:title"', document.title);
    updateMeta('name="twitter:description"', description);
  }

  function updateMeta(selector, content) {
    if (!content) return;
    const element = document.querySelector(`meta[${selector}]`);
    if (!element) return;
    element.setAttribute("content", content);
  }

  return {
    readSlugInfo,
    readSlugFromUrl,
    pushUrlWithSlug,
    buildShareUrl,
    updateDocumentMeta
  };
}
