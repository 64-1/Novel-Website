import { ReaderSettingsStore, LastReadStore } from "../services/Stores.js";
import ChaptersRepo from "../services/ChaptersRepo.js";
import ThemeService from "../services/ThemeService.js";
import { createTracker } from "../reader/ProgressTracker.js";
import { createReaderView } from "../reader/ReaderView.js";
import { createSearchController } from "../reader/SearchInChapter.js";
import { createTocList } from "../reader/TocList.js";
import { createReaderModal } from "../modal/ReaderModal.js";
import { initShortcuts } from "../services/Shortcuts.js";
import { startRouter, linkToChapter } from "../router.js";
import Strings from "../strings.js";

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const themeToggleBtn = document.querySelector('[data-action="toggle-theme"]');
  const readerLayoutBtn = document.querySelector('[data-action="toggle-reader-layout"]');
  const openReaderBtn = document.querySelector('[data-action="open-reader"]');
  const readerGrid = document.querySelector(".reader-grid");
  const readerContent = document.querySelector(".reader-content");
  const fontSlider = document.querySelector('input[data-action="font-size"]');
  const lineSlider = document.querySelector('input[data-action="line-height"]');
  const readerThemeButtons = document.querySelectorAll(".theme-toggle .pill");
  const tocList = document.querySelector(".toc ol");
  const readerProgressBar = document.querySelector('[data-progress="reader"]');
  const readerProgressFill = readerProgressBar?.querySelector(".progress-fill");
  const readerModalElement = document.getElementById("reader-modal");
  const modalTocContainer = readerModalElement ? readerModalElement.querySelector(".modal-toc") : null;
  const modalArticle = readerModalElement ? readerModalElement.querySelector(".modal-article") : null;
  const modalCloseElements = readerModalElement ? readerModalElement.querySelectorAll('[data-action="close-modal"]') : [];
  const modalProgressBar = document.querySelector('[data-progress="modal"]');
  const modalProgressFill = modalProgressBar?.querySelector(".progress-fill");
  const modalContent = readerModalElement ? readerModalElement.querySelector(".modal-content") : null;
  const readingTimeDisplay = document.querySelector("[data-reading-time]");
  const searchInput = document.getElementById("chap-search");
  const searchPrevBtn = document.getElementById("chap-search-prev");
  const searchNextBtn = document.getElementById("chap-search-next");
  const searchClearBtn = document.getElementById("chap-search-clear");
  const searchStatus = document.getElementById("chap-search-status");
  const SEARCH_HIGHLIGHT_CAP = 200;
  const SEARCH_DEBOUNCE_MS = 160;

  let currentChapterIndex = 0;
  let readerProgressTracker;
  let modalProgressTracker;
  let readerModalController = null;
  let chapters = [];
  let chaptersReady = false;
  let pendingRoute = null;
  let lastRoute = null;
  let preparedNextSlug = null;
  let preparedPrevSlug = null;
  let searchController = null;
  let searchDebounce = null;

  const initialQuerySlug = getChapterSlugFromQuery(window.location.search);
  if (initialQuerySlug) {
    replaceUrlWithHash(initialQuerySlug);
  }

  const readerSettings = loadReaderSettings();

  ThemeService.init({ body, toggleButton: themeToggleBtn });
  ThemeService.applyStoredShellMode();
  ThemeService.syncReaderTheme({
    readerSettings,
    applyReaderSettings,
    persistReaderSettings,
    syncModalTheme,
    respectOverride: false
  });

  applyReaderSettings();

  readerProgressTracker = createTracker({
    container: readerContent,
    progressBar: readerProgressBar,
    progressFill: readerProgressFill,
    context: "reader",
    onProgress: handleReaderProgress
  });

  modalProgressTracker = createTracker({
    container: modalArticle,
    progressBar: modalProgressBar,
    progressFill: modalProgressFill,
    context: "modal"
  });

  const readerView = createReaderView({
    readerContainer: readerContent,
    modalContainer: modalArticle,
    readerTracker: readerProgressTracker,
    modalTracker: modalProgressTracker
  });

  readerModalController = readerModalElement
    ? createReaderModal({
        modalElement: readerModalElement,
        modalContent,
        openButton: openReaderBtn,
        closeElements: modalCloseElements,
        progressTracker: modalProgressTracker,
        syncTheme: syncModalTheme
      })
    : null;

  const tocListController = createTocList({
    tocContainer: tocList,
    modalContainer: modalTocContainer,
    onChapterSelect: (index) => selectChapter(index)
  });

  initShortcuts({
    onEscape: () => {
      if (readerModalController?.isOpen()) {
        readerModalController.close();
        return true;
      }
      return false;
    },
    onLeft: () => {
      if (!chaptersReady || !chapters.length) {
        return false;
      }
      if (currentChapterIndex > 0) {
        selectChapter(currentChapterIndex - 1);
        return true;
      }
      return false;
    },
    onRight: () => {
      if (!chaptersReady || !chapters.length) {
        return false;
      }
      if (currentChapterIndex < chapters.length - 1) {
        selectChapter(currentChapterIndex + 1);
        return true;
      }
      return false;
    },
    onScrollDown: () => {
      scrollActiveContainer("down");
      return true;
    },
    onScrollUp: () => {
      scrollActiveContainer("up");
      return true;
    },
    onSearchFocus: () => {
      if (!searchInput) return false;
      searchInput.focus({ preventScroll: false });
      searchInput.select();
      return true;
    },
    onSearchNext: () => {
      if (!searchController || !searchInput?.value.trim()) return false;
      const state = searchController.getState();
      if (!state.total) return false;
      searchController.next();
      return true;
    },
    onSearchPrev: () => {
      if (!searchController || !searchInput?.value.trim()) return false;
      const state = searchController.getState();
      if (!state.total) return false;
      searchController.prev();
      return true;
    }
  });

  startRouter({
    onRoute: (route) => {
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
  });

  themeToggleBtn?.addEventListener("click", () => {
    ThemeService.toggleShellMode();
    ThemeService.syncReaderTheme({
      readerSettings,
      applyReaderSettings,
      persistReaderSettings,
      syncModalTheme
    });
  });

  readerLayoutBtn?.addEventListener("click", () => {
    readerGrid?.classList.toggle("expanded");
    readerLayoutBtn.classList.toggle("active");
    updateReaderLayoutLabel();
    readerProgressTracker?.refresh({ fromStorage: true });
  });
  updateReaderLayoutLabel();

  fontSlider?.addEventListener("input", (event) => {
    readerSettings.fontSize = Number(event.target.value);
    applyReaderSettings();
    persistReaderSettings();
  });

  lineSlider?.addEventListener("input", (event) => {
    readerSettings.lineHeight = Number(event.target.value);
    applyReaderSettings();
    persistReaderSettings();
  });

  readerThemeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedTheme = btn.dataset.theme || "day";
      ThemeService.handleReaderThemeSelection(selectedTheme, {
        readerSettings,
        applyReaderSettings,
        persistReaderSettings,
        syncModalTheme
      });
    });
  });

  openReaderBtn?.addEventListener("click", () => readerModalController?.open());

  if (searchInput && readerContent) {
    searchController = createSearchController({
      articleEl: readerContent,
      maxHighlights: SEARCH_HIGHLIGHT_CAP
    });

    searchController.onStateChange(updateSearchStatus);
    updateSearchStatus();

    searchInput.addEventListener("input", (event) => {
      const value = event.target.value.trim();
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
      searchDebounce = window.setTimeout(() => {
        searchDebounce = null;
        searchController?.setQuery(value);
      }, SEARCH_DEBOUNCE_MS);
    });

    searchPrevBtn?.addEventListener("click", () => {
      if (!searchController) return;
      const state = searchController.getState();
      if (!state.total) return;
      searchController.prev();
    });

    searchNextBtn?.addEventListener("click", () => {
      if (!searchController) return;
      const state = searchController.getState();
      if (!state.total) return;
      searchController.next();
    });

    searchClearBtn?.addEventListener("click", () => {
      searchController?.clear();
      searchInput.value = "";
      updateSearchStatus();
      searchInput.focus();
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        searchController?.clear();
        searchInput.value = "";
        updateSearchStatus();
        searchInput.blur();
      } else if (event.key === "Enter") {
        event.preventDefault();
        searchController?.next();
      }
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      readerView.clearCache?.();
      preparedNextSlug = null;
      preparedPrevSlug = null;
    }
  });

  loadChapters();

  function loadReaderSettings() {
    const stored = ReaderSettingsStore.load();
    if (stored && typeof stored === "object") {
      return {
        fontSize: Number(stored.fontSize) || 18,
        lineHeight: Number(stored.lineHeight) || 1.6,
        theme: stored.theme || "day"
      };
    }
    return { fontSize: 18, lineHeight: 1.6, theme: "day" };
  }

  function persistReaderSettings() {
    ReaderSettingsStore.save(readerSettings);
  }

  function applyReaderSettings() {
    if (!readerContent) return;
    readerContent.style.fontSize = `${readerSettings.fontSize}px`;
    readerContent.style.lineHeight = readerSettings.lineHeight;
    readerContent.dataset.theme = readerSettings.theme;
    if (fontSlider) fontSlider.value = readerSettings.fontSize;
    if (lineSlider) lineSlider.value = readerSettings.lineHeight;
    readerThemeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === readerSettings.theme);
    });
    readerProgressTracker?.refresh({ fromStorage: true });
    modalProgressTracker?.refresh({ fromStorage: true });
    syncModalTheme();
  }

  function syncModalTheme() {
    if (modalArticle) {
      modalArticle.dataset.theme = readerSettings.theme;
    }
  }

  function updateReaderLayoutLabel() {
    if (!readerLayoutBtn) return;
    const labels = Strings?.buttons?.toggleWide || {};
    const expandedLabel = labels.expanded || "切换常规";
    const collapsedLabel = labels.collapsed || "切换宽屏";
    readerLayoutBtn.textContent = readerLayoutBtn.classList.contains("active")
      ? expandedLabel
      : collapsedLabel;
  }

  async function loadChapters() {
    await ChaptersRepo.load();
    chapters = ChaptersRepo.list();

    tocListController.render();
    readerModalController?.refreshFocusTrap();

    if (!chapters.length) {
      console.warn("未找到任何章节数据。");
      return;
    }

    chaptersReady = true;
    let initialHandled = false;
    if (pendingRoute) {
      initialHandled = applyRoute(pendingRoute);
    } else if (lastRoute) {
      initialHandled = applyRoute(lastRoute);
    }
    pendingRoute = null;

    if (!initialHandled) {
      const lastRead = resolveLastRead();
      if (lastRead) {
        currentChapterIndex = lastRead.index;
        selectChapter(currentChapterIndex, { updateHash: true });
        initialHandled = true;
      }
    }

    if (!initialHandled) {
      selectChapter(currentChapterIndex, { updateHash: true });
    }
  }

  function selectChapter(index, options = {}) {
    const { updateHash = true } = options;
    if (!chapters.length) {
      chapters = ChaptersRepo.list();
    }
    if (!chapters.length) return;

    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = readerView.render(safeIndex);
    if (!chapter) return;

    currentChapterIndex = safeIndex;
    tocListController.setActive(safeIndex);
    readerModalController?.refreshFocusTrap();
    updateReadingTime(chapter);
    LastReadStore.set({ slug: chapter.slug });
    preparedNextSlug = null;
    preparedPrevSlug = null;
    prepareAdjacentChapters(safeIndex);
    searchController?.onChapterChanged();
    if (!searchInput || !searchInput.value.trim()) {
      updateSearchStatus();
    }

    if (updateHash) {
      linkToChapter(chapter.slug);
      lastRoute = {
        type: "novel",
        slug: chapter.slug,
        encodedSlug: encodeURIComponent(chapter.slug),
        initial: false
      };
    }
  }

  function updateReadingTime(chapter) {
    if (!readingTimeDisplay) return;
    const stats = ChaptersRepo.getStats(chapter);
    const safeMinutes = Math.max(1, Math.round(stats.minutes || 1));
    readingTimeDisplay.textContent = `预计剩余阅读时间：${safeMinutes} 分钟`;
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
        scrollToSection("reader", behavior);
        return true;
      case "novel": {
        if (!chapters.length) {
          chapters = ChaptersRepo.list();
        }
        const slug = route.slug;
        const fallbackSlug = route.encodedSlug || slug;
        const index = (() => {
          const fromSlug = ChaptersRepo.getIndexBySlug(slug);
          if (typeof fromSlug === "number" && fromSlug >= 0) {
            return fromSlug;
          }
          const fromFallback = ChaptersRepo.getIndexBySlug(fallbackSlug);
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

  function scrollActiveContainer(direction) {
    const container = readerModalController?.isOpen() && modalArticle ? modalArticle : readerContent;
    if (!container) return;
    const amount = Math.max(container.clientHeight * 0.9, 200);
    const offset = direction === "down" ? amount : -amount;
    container.scrollBy({ top: offset, behavior: "smooth" });
  }

  function scrollToSection(id, behavior = "smooth") {
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
  }

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

  function replaceUrlWithHash(slug) {
    if (!slug) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("chapter");
    url.hash = `#novel/${encodeURIComponent(slug)}`;
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function resolveLastRead() {
    const record = LastReadStore.get();
    if (!record || !record.slug) {
      return null;
    }
    const index = ChaptersRepo.getIndexBySlug(record.slug);
    if (typeof index !== "number" || index < 0) {
      LastReadStore.clear();
      return null;
    }
    return { slug: record.slug, index };
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
    const chapter = ChaptersRepo.getByIndex(index);
    if (!chapter) {
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

  function updateSearchStatus(state) {
    if (!searchStatus) return;
    const info = state || (searchController ? searchController.getState() : null);
    const queryActive = Boolean(searchInput?.value.trim());
    if (!queryActive) {
      searchStatus.textContent = "";
      return;
    }
    if (!info || info.total === 0) {
      searchStatus.textContent = "无结果";
      return;
    }
    const capNote = info.capped ? `（已高亮前 ${info.highlighted} 处）` : "";
    if (info.index >= 0) {
      searchStatus.textContent = `第 ${info.index + 1} / ${info.total} 处${capNote}`;
    } else {
      searchStatus.textContent = `共 ${info.total} 处${capNote}`;
    }
  }
});
