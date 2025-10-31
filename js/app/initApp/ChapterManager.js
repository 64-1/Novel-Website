/**
 * Chapter Manager Module
 * Handles chapter loading, selection, navigation, and routing
 */

export function createChapterManager({
  chaptersRepo,
  readerView,
  tocListController,
  readerModalController,
  LastReadStore,
  router,
  syncModalTheme
} = {}) {
  if (!chaptersRepo || !readerView || !router) {
    return null;
  }

  let currentChapterIndex = 0;
  let chapters = [];
  let chaptersReady = false;
  let pendingRoute = null;
  let lastRoute = null;
  let preparedNextSlug = null;
  let preparedPrevSlug = null;

  async function initChapters() {
    await chaptersRepo.load();
    chapters = chaptersRepo.list();

    tocListController?.render();
    readerModalController?.refreshFocusTrap();

    if (!chapters.length) {
      console.warn("未找到任何章节数据。");
      return;
    }

    currentChapterIndex = Math.min(currentChapterIndex, chapters.length - 1);
    selectChapter(currentChapterIndex, { updateHash: false });
    chaptersReady = true;

    let routeHandled = false;
    if (pendingRoute) {
      routeHandled = applyRoute(pendingRoute);
      pendingRoute = null;
    } else if (lastRoute) {
      routeHandled = applyRoute(lastRoute);
    }

    if (!routeHandled) {
      const initialSlug = chaptersRepo.getSlugByIndex(currentChapterIndex);
      if (!window.location.hash || window.location.hash.startsWith("#novel/")) {
        router.linkToChapter(initialSlug, { mode: "hash" });
        lastRoute = {
          type: "novel",
          slug: initialSlug,
          encodedSlug: encodeURIComponent(initialSlug),
          initial: false
        };
      }
    }
  }

  function selectChapter(index, options = {}) {
    const { updateHash = true } = options;
    if (!chapters.length) {
      chapters = chaptersRepo.list();
    }
    if (!chapters.length) {
      return;
    }
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = readerView.render(safeIndex);
    if (!chapter) return;

    currentChapterIndex = safeIndex;
    tocListController?.setActive(safeIndex);
    readerModalController?.refreshFocusTrap();
    syncModalTheme?.();

    if (LastReadStore && typeof LastReadStore.set === "function") {
      LastReadStore.set({ slug: chapter.slug });
    }

    preparedNextSlug = null;
    preparedPrevSlug = null;
    prepareAdjacentChapters(safeIndex);

    if (updateHash) {
      router.linkToChapter(chapter.slug, { mode: "hash" });
      lastRoute = {
        type: "novel",
        slug: chapter.slug,
        encodedSlug: encodeURIComponent(chapter.slug),
        initial: false
      };
    }
  }

  function applyRoute(route) {
    if (!route) {
      return false;
    }
    const behavior = route.initial ? "auto" : "smooth";
    switch (route.type) {
      case "reader":
        scrollToSection("reader", behavior);
        return true;
      case "writer":
        scrollToSection("writer", behavior);
        return true;
      case "novel": {
        if (!chapters.length) {
          chapters = chaptersRepo.list();
        }
        const slug = route.slug;
        const fallbackSlug = route.encodedSlug || slug;
        const index = (() => {
          const fromSlug = chaptersRepo.getIndexBySlug(slug);
          if (typeof fromSlug === "number" && fromSlug >= 0) {
            return fromSlug;
          }
          const fromFallback = chaptersRepo.getIndexBySlug(fallbackSlug);
          if (typeof fromFallback === "number" && fromFallback >= 0) {
            return fromFallback;
          }
          return -1;
        })();
        if (index >= 0 && index < chapters.length) {
          selectChapter(index, { updateHash: false });
          scrollToSection("reader", behavior);
          const resolvedChapter = chapters[index];
          if (resolvedChapter) {
            lastRoute = {
              type: "novel",
              slug: resolvedChapter.slug,
              encodedSlug: encodeURIComponent(resolvedChapter.slug),
              initial: Boolean(route.initial)
            };
          }
          return true;
        }
        return false;
      }
      default:
        return false;
    }
  }

  function handleReaderProgress(progress, detail) {
    if (!detail || detail.context !== "reader" || typeof progress !== "number") {
      return;
    }
    const currentChapter = chapters[currentChapterIndex];
    if (!currentChapter || detail.slug !== currentChapter.slug) {
      return;
    }
    if (progress >= 0.7) {
      prepareChapter(currentChapterIndex + 1, "next");
    } else if (progress <= 0.3) {
      prepareChapter(currentChapterIndex - 1, "prev");
    }
  }

  function prepareAdjacentChapters(index) {
    prepareChapter(index + 1, "next");
    prepareChapter(index - 1, "prev");
  }

  function prepareChapter(index, direction) {
    if (!Number.isFinite(index) || index < 0 || index >= chapters.length) {
      return;
    }
    const chapter = chapters[index] || chaptersRepo.getByIndex(index);
    if (!chapter || !chapter.slug) {
      return;
    }
    const slug = chapter.slug;
    if (direction === "next" && slug === preparedNextSlug) {
      return;
    }
    if (direction === "prev" && slug === preparedPrevSlug) {
      return;
    }

    if (direction === "next") {
      preparedNextSlug = slug;
    } else {
      preparedPrevSlug = slug;
    }

    runWhenIdle(() => {
      const prepared = readerView.prepare(index);
      if (!prepared) {
        if (direction === "next" && preparedNextSlug === slug) {
          preparedNextSlug = null;
        }
        if (direction === "prev" && preparedPrevSlug === slug) {
          preparedPrevSlug = null;
        }
      }
    });
  }

  function runWhenIdle(callback) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(callback, { timeout: 120 });
    } else {
      window.setTimeout(callback, 0);
    }
  }

  function scrollToSection(id, behavior = "smooth") {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior, block: "start" });
  }

  function clearCache() {
    readerView.clearCache?.();
    preparedNextSlug = null;
    preparedPrevSlug = null;
  }

  function setRoute(route) {
    lastRoute = route;
    if (!route) {
      pendingRoute = null;
      return;
    }
    if (!chaptersReady) {
      pendingRoute = route;
      return;
    }
    applyRoute(route);
  }

  return {
    initChapters,
    selectChapter,
    applyRoute,
    handleReaderProgress,
    clearCache,
    setRoute,
    getChapters: () => chapters,
    getCurrentIndex: () => currentChapterIndex,
    isReady: () => chaptersReady
  };
}
