/**
 * ChapterNavigation
 * Manages chapter loading, navigation, routing, and URL handling
 */

import { runWhenIdle } from "../../utils/domHelpers.js";

/**
 * Creates a chapter navigation controller
 * @param {Object} config - Configuration object
 * @param {Object} config.chaptersRepo - Chapters repository
 * @param {Object} config.lastReadStore - Last read store
 * @param {Object} config.readerView - Reader view instance
 * @param {Object} config.tocListController - TOC list controller
 * @param {Object} config.readerModalController - Reader modal controller (optional)
 * @param {Object} config.router - Router instance
 * @param {HTMLElement} config.readingTimeDisplay - Reading time display element (optional)
 * @param {Function} config.onChapterChanged - Callback when chapter changes
 * @param {Function} config.onChaptersLoaded - Callback when chapters are loaded
 * @returns {Object} Chapter navigation public API
 */
export function createChapterNavigation(config) {
  const {
    chaptersRepo,
    lastReadStore,
    readerView,
    tocListController,
    readerModalController,
    router,
    readingTimeDisplay,
    onChapterChanged,
    onChaptersLoaded
  } = config;

  if (!chaptersRepo || !readerView) {
    throw new Error("[ChapterNavigation] Missing required dependencies");
  }

  let chapters = [];
  let currentChapterIndex = 0;
  let chaptersReady = false;
  let preparedNextSlug = null;
  let preparedPrevSlug = null;
  let pendingRoute = null;
  let lastRoute = null;

  /**
   * Extracts chapter slug from URL path
   * @returns {string|null} Chapter slug from path
   */
  function pathSlug() {
    const match = window.location.pathname.match(/^\/novel\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Extracts chapter slug from URL hash
   * @param {string} rawHash - URL hash
   * @returns {string|null} Chapter slug from hash
   */
  function getHashSlug(rawHash) {
    if (!rawHash) return null;
    const match = rawHash.match(/^#novel\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Extracts chapter slug from query parameter
   * @param {string} search - URL search string
   * @returns {string|null} Chapter slug from query
   */
  function getChapterSlugFromQuery(search) {
    const params = new URLSearchParams(search);
    const value = params.get("chapter");
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  /**
   * Replaces URL with canonical path
   * @param {string} slug - Chapter slug
   * @param {URLSearchParams} params - URL parameters
   */
  function replaceUrlWithPath(slug, params) {
    if (!slug) return;

    const url = new URL(window.location.href);
    url.pathname = `/novel/${encodeURIComponent(slug)}`;
    url.hash = "";

    const nextParams =
      params instanceof URLSearchParams ? new URLSearchParams(params.toString()) : new URLSearchParams(url.search);
    nextParams.delete("chapter");
    const serialized = nextParams.toString();
    url.search = serialized ? `?${serialized}` : "";

    history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  /**
   * Scrolls to a section by ID
   * @param {string} id - Section ID
   * @param {string} behavior - Scroll behavior
   */
  function scrollToSection(id, behavior = "smooth") {
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
  }

  /**
   * Applies a route
   * @param {Object} route - Route object
   * @returns {boolean} Whether route was handled
   */
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
        scrollToSection("reader", behavior);
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
          return 0;
        })();

        selectChapter(index, { updateHash: false });
        return true;
      }

      default:
        return false;
    }
  }

  /**
   * Resolves the last read chapter
   * @returns {Object|null} Last read info with slug and index
   */
  function resolveLastRead() {
    if (!lastReadStore) return null;

    const record = lastReadStore.get();
    if (!record || !record.slug) {
      return null;
    }

    const index = chaptersRepo.getIndexBySlug(record.slug);
    if (typeof index !== "number" || index < 0) {
      lastReadStore.clear();
      return null;
    }

    return { slug: record.slug, index };
  }

  /**
   * Updates reading time display
   * @param {Object} chapter - Chapter object
   */
  function updateReadingTime(chapter) {
    if (!readingTimeDisplay) return;

    const stats = chaptersRepo.getStats(chapter);
    const safeMinutes = Math.max(1, Math.round(stats.minutes || 1));
    readingTimeDisplay.textContent = `预计剩余阅读时间：${safeMinutes} 分钟`;
  }

  /**
   * Prepares a chapter for preloading
   * @param {number} index - Chapter index
   * @param {string} direction - "next" or "prev"
   */
  function prepareChapter(index, direction) {
    if (!Number.isFinite(index) || index < 0 || index >= chapters.length) {
      return;
    }

    const chapter = chaptersRepo.getByIndex(index);
    if (!chapter) {
      return;
    }

    const slug = chapter.slug;

    // Check if already prepared
    if (direction === "next" && slug === preparedNextSlug) {
      return;
    }
    if (direction === "prev" && slug === preparedPrevSlug) {
      return;
    }

    // Mark as prepared
    if (direction === "next") {
      preparedNextSlug = slug;
    } else {
      preparedPrevSlug = slug;
    }

    // Prepare when idle
    runWhenIdle(() => {
      const prepared = readerView.prepare(index);
      if (!prepared) {
        // Failed to prepare - clear marker
        if (direction === "next" && preparedNextSlug === slug) {
          preparedNextSlug = null;
        }
        if (direction === "prev" && preparedPrevSlug === slug) {
          preparedPrevSlug = null;
        }
      }
    });
  }

  /**
   * Prepares adjacent chapters for preloading
   * @param {number} index - Current chapter index
   */
  function prepareAdjacentChapters(index) {
    prepareChapter(index + 1, "next");
    prepareChapter(index - 1, "prev");
  }

  /**
   * Handles reader progress for preloading
   * @param {number} progress - Progress percentage (0-1)
   * @param {Object} detail - Progress detail
   */
  function handleReaderProgress(progress, detail) {
    if (!detail || detail.context !== "reader" || typeof progress !== "number") {
      return;
    }

    const currentChapter = chapters[currentChapterIndex];
    if (!currentChapter || detail.slug !== currentChapter.slug) {
      return;
    }

    // Prepare next chapter when 70% through
    if (progress >= 0.7) {
      prepareChapter(currentChapterIndex + 1, "next");
    }
    // Prepare previous chapter when 30% from start
    else if (progress <= 0.3) {
      prepareChapter(currentChapterIndex - 1, "prev");
    }
  }

  /**
   * Selects and displays a chapter
   * @param {number} index - Chapter index
   * @param {Object} options - Selection options
   */
  function selectChapter(index, options = {}) {
    const { updateHash = true } = options;

    if (!chapters.length) {
      chapters = chaptersRepo.list();
    }
    if (!chapters.length) return;

    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = readerView.render(safeIndex);
    if (!chapter) return;

    currentChapterIndex = safeIndex;

    // Update TOC
    if (tocListController) {
      tocListController.setActive(safeIndex);
    }

    // Refresh modal focus trap
    if (readerModalController) {
      readerModalController.refreshFocusTrap();
    }

    // Update reading time
    updateReadingTime(chapter);

    // Save last read
    if (lastReadStore) {
      lastReadStore.set({ slug: chapter.slug });
    }

    // Clear prepared chapters
    preparedNextSlug = null;
    preparedPrevSlug = null;

    // Prepare adjacent chapters
    prepareAdjacentChapters(safeIndex);

    // Notify chapter changed
    if (onChapterChanged) {
      onChapterChanged(chapter, safeIndex);
    }

    // Update URL
    if (updateHash && router) {
      router.linkToChapter(chapter.slug, { mode: "path" });
      lastRoute = {
        type: "novel",
        slug: chapter.slug,
        encodedSlug: encodeURIComponent(chapter.slug),
        initial: false
      };
    }
  }

  /**
   * Loads chapters from repository
   * @returns {Promise<void>}
   */
  async function loadChapters() {
    await chaptersRepo.load();
    chapters = chaptersRepo.list();

    // Render TOC
    if (tocListController) {
      tocListController.render();
    }

    // Refresh modal
    if (readerModalController) {
      readerModalController.refreshFocusTrap();
    }

    if (!chapters.length) {
      console.warn("未找到任何章节数据。");
      return;
    }

    chaptersReady = true;

    // Handle initial routing
    let initialHandled = false;

    if (pendingRoute) {
      initialHandled = applyRoute(pendingRoute);
    } else if (lastRoute) {
      initialHandled = applyRoute(lastRoute);
    }
    pendingRoute = null;

    // Try last read if no route handled
    if (!initialHandled) {
      const lastRead = resolveLastRead();
      if (lastRead) {
        currentChapterIndex = lastRead.index;
        selectChapter(currentChapterIndex, { updateHash: true });
        initialHandled = true;
      }
    }

    // Default to first chapter
    if (!initialHandled) {
      selectChapter(currentChapterIndex, { updateHash: true });
    }

    // Notify chapters loaded
    if (onChaptersLoaded) {
      onChaptersLoaded(chapters);
    }
  }

  /**
   * Navigates to next chapter
   */
  function nextChapter() {
    if (!chaptersReady || !chapters.length) return false;
    if (currentChapterIndex < chapters.length - 1) {
      selectChapter(currentChapterIndex + 1);
      return true;
    }
    return false;
  }

  /**
   * Navigates to previous chapter
   */
  function previousChapter() {
    if (!chaptersReady || !chapters.length) return false;
    if (currentChapterIndex > 0) {
      selectChapter(currentChapterIndex - 1);
      return true;
    }
    return false;
  }

  /**
   * Gets current chapter
   * @returns {Object|null} Current chapter
   */
  function getCurrentChapter() {
    return chapters[currentChapterIndex] || null;
  }

  /**
   * Gets current chapter index
   * @returns {number} Current chapter index
   */
  function getCurrentIndex() {
    return currentChapterIndex;
  }

  /**
   * Gets all chapters
   * @returns {Array} All chapters
   */
  function getChapters() {
    return chapters;
  }

  /**
   * Checks if chapters are ready
   * @returns {boolean} Whether chapters are loaded
   */
  function isReady() {
    return chaptersReady;
  }

  /**
   * Sets pending route (called before chapters load)
   * @param {Object} route - Route object
   */
  function setPendingRoute(route) {
    pendingRoute = route;
  }

  /**
   * Sets last route
   * @param {Object} route - Route object
   */
  function setLastRoute(route) {
    lastRoute = route;
  }

  // Public API
  return {
    loadChapters,
    selectChapter,
    nextChapter,
    previousChapter,
    getCurrentChapter,
    getCurrentIndex,
    getChapters,
    isReady,
    handleReaderProgress,
    applyRoute,
    setPendingRoute,
    setLastRoute,
    pathSlug,
    getHashSlug,
    getChapterSlugFromQuery,
    replaceUrlWithPath
  };
}
