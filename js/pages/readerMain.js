import { ReaderSettingsStore, LastReadStore, AnnotationStore } from "../services/Stores.js";
import ChaptersRepo from "../services/ChaptersRepo.js";
import ThemeService from "../services/ThemeService.js";
import { createTracker } from "../reader/ProgressTracker.js";
import { createReaderView } from "../reader/ReaderView.js";
import { createSearchController } from "../reader/SearchInChapter.js";
import { createTocList } from "../reader/TocList.js";
import { createReaderModal } from "../modal/ReaderModal.js";
import { createAnnotations } from "../reader/Annotations.js";
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
  const addBookmarkBtn = document.getElementById("add-bookmark");
  const selectionPopover = document.getElementById("selection-popover");
  const highlightSelectionBtn = document.getElementById("highlight-selection");
  const addNoteBtn = document.getElementById("add-note");
  const annotationsList = document.getElementById("annotations-list");
  const bookmarkCount = document.getElementById("bookmark-count");
  const highlightCount = document.getElementById("highlight-count");
  const annTabs = document.querySelectorAll(".ann-tab");

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
  let globalSearchController = null;
  let pendingSearchQuery = null;
  let annotationsController = null;
  let currentAnnTab = "bookmarks";
  let selectionPopoverTimeout = null;

  const initialQuerySlug = getChapterSlugFromQuery(window.location.search);
  if (initialQuerySlug) {
    replaceUrlWithHash(initialQuerySlug);
  }

  // Extract search query from URL
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q");
  if (initialQuery) {
    pendingSearchQuery = initialQuery.trim();
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

  // Additional shortcuts for annotations (b, h)
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (
      !target ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }

    if (event.key === "b" || event.key === "B") {
      if (addBookmarkBtn && !addBookmarkBtn.disabled) {
        event.preventDefault();
        addBookmarkBtn.click();
        return;
      }
    }

    if (event.key === "h" || event.key === "H") {
      const selection = window.getSelection();
      if (
        selection &&
        !selection.isCollapsed &&
        readerContent &&
        readerContent.contains(selection.anchorNode)
      ) {
        event.preventDefault();
        if (highlightSelectionBtn) {
          highlightSelectionBtn.click();
        }
        return;
      }
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

  // Initialize annotations controller
  if (readerContent) {
    annotationsController = createAnnotations({
      articleEl: readerContent,
      store: AnnotationStore
    });
  }

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

  // Annotation UI wiring
  if (addBookmarkBtn && readerContent && readerProgressTracker) {
    addBookmarkBtn.addEventListener("click", () => {
      if (!chaptersReady || !chapters.length) return;
      const chapter = chapters[currentChapterIndex];
      if (!chapter || !annotationsController) return;

      // Get current scroll progress
      const container = readerContent;
      const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 1);
      const percent = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
      const scrollTop = container.scrollTop;

      const bookmark = annotationsController.createBookmark({
        slug: chapter.slug,
        percent,
        scrollTop,
        note: ""
      });

      if (bookmark) {
        updateAnnotationsPanel(chapter.slug);
        // Announce
        const announcement = document.createElement("div");
        announcement.className = "visually-hidden";
        announcement.setAttribute("role", "status");
        announcement.setAttribute("aria-live", "polite");
        announcement.textContent = `${Strings.annotations.addBookmark}已添加`;
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      }
    });
  }

  // Selection popover
  if (readerContent && selectionPopover && highlightSelectionBtn) {
    readerContent.addEventListener("mouseup", () => {
      clearTimeout(selectionPopoverTimeout);
      const selection = window.getSelection();
      if (
        !selection ||
        selection.isCollapsed ||
        !readerContent.contains(selection.anchorNode) ||
        !readerContent.contains(selection.focusNode)
      ) {
        hideSelectionPopover();
        return;
      }

      const range = selection.getRangeAt(0);
      if (!range || range.collapsed) {
        hideSelectionPopover();
        return;
      }

      showSelectionPopover(range);
    });

    document.addEventListener("mousedown", (e) => {
      if (!selectionPopover?.contains(e.target) && !e.target.closest(".reader-content mark")) {
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed) {
            hideSelectionPopover();
          }
        }, 10);
      }
    });

    highlightSelectionBtn.addEventListener("click", () => {
      if (!chaptersReady || !chapters.length || !annotationsController) return;
      const chapter = chapters[currentChapterIndex];
      if (!chapter) return;

      const highlight = annotationsController.createHighlightFromSelection({
        slug: chapter.slug,
        color: "ylw",
        note: ""
      });

      if (highlight) {
        updateAnnotationsPanel(chapter.slug);
        hideSelectionPopover();
        window.getSelection()?.removeAllRanges();
      }
    });

    addNoteBtn?.addEventListener("click", () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !chaptersReady || !chapters.length) return;
      const chapter = chapters[currentChapterIndex];
      if (!chapter || !annotationsController) return;

      const note = window.prompt(`${Strings.annotations.addNote}:`, "");
      if (note === null) return; // User cancelled

      const highlight = annotationsController.createHighlightFromSelection({
        slug: chapter.slug,
        color: "ylw",
        note: note.trim()
      });

      if (highlight) {
        updateAnnotationsPanel(chapter.slug);
        hideSelectionPopover();
        window.getSelection()?.removeAllRanges();
      }
    });

    function showSelectionPopover(range) {
      if (!selectionPopover) return;
      const rect = range.getBoundingClientRect();
      const containerRect = readerContent.getBoundingClientRect();
      selectionPopover.style.top = `${rect.top - containerRect.top - 40}px`;
      selectionPopover.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
      selectionPopover.setAttribute("aria-hidden", "false");
      selectionPopover.style.display = "flex";
    }

    function hideSelectionPopover() {
      if (!selectionPopover) return;
      selectionPopover.setAttribute("aria-hidden", "true");
      selectionPopover.style.display = "none";
    }
  }

  // Annotation panel tabs
  annTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      if (!tabName) return;
      currentAnnTab = tabName;
      annTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      if (chaptersReady && chapters.length) {
        const chapter = chapters[currentChapterIndex];
        if (chapter) {
          updateAnnotationsPanel(chapter.slug);
        }
      }
    });
  });

  // Annotation panel list click handlers (delegated)
  if (annotationsList) {
    annotationsList.addEventListener("click", (e) => {
      const item = e.target.closest("[data-ann-id]");
      if (!item) return;
      const id = item.dataset.annId;
      const action = e.target.closest("[data-action]")?.dataset.action;

      if (action === "delete") {
        e.stopPropagation();
        if (annotationsController && id) {
          if (annotationsController.remove(id)) {
            if (chaptersReady && chapters.length) {
              const chapter = chapters[currentChapterIndex];
              if (chapter) {
                updateAnnotationsPanel(chapter.slug);
              }
            }
          }
        }
        return;
      }

      if (id) {
        if (id.startsWith("bm_")) {
          annotationsController?.jumpToBookmark(id, readerContent);
        } else if (id.startsWith("hl_")) {
          annotationsController?.jumpToHighlight(id);
        }
      }
    });
  }

  function updateAnnotationsPanel(slug) {
    if (!annotationsController || !slug || !annotationsList) return;
    const { bookmarks, highlights } = annotationsController.list(slug);

    if (bookmarkCount) {
      bookmarkCount.textContent = bookmarks.length;
    }
    if (highlightCount) {
      highlightCount.textContent = highlights.length;
    }

    const items = currentAnnTab === "bookmarks" ? bookmarks : highlights;
    annotationsList.innerHTML = "";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "annotations-empty";
      empty.textContent =
        currentAnnTab === "bookmarks"
          ? Strings.annotations.noBookmarks
          : Strings.annotations.noHighlights;
      annotationsList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const li = document.createElement("div");
      li.className = "annotation-item";
      li.dataset.annId = item.id;
      li.setAttribute("role", "listitem");
      li.setAttribute("tabindex", "0");

      if (item.id.startsWith("bm_")) {
        // Bookmark
        const percent = Math.round(item.percent * 100);
        const date = new Date(item.createdAt);
        const timeStr = date.toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric"
        });

        li.innerHTML = `
          <div class="annotation-content">
            <div class="annotation-meta">${percent}% · ${timeStr}</div>
            ${item.note ? `<div class="annotation-note">${escapeHtml(item.note)}</div>` : ""}
          </div>
          <button class="annotation-delete" data-action="delete" aria-label="${Strings.annotations.delete}">×</button>
        `;
      } else {
        // Highlight - use placeholder, update asynchronously
        let snippet = "高亮片段";

        const date = new Date(item.createdAt);
        const timeStr = date.toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric"
        });

        li.innerHTML = `
          <div class="annotation-content">
            <div class="annotation-snippet">${escapeHtml(snippet || "")}</div>
            ${item.note ? `<div class="annotation-note">${escapeHtml(item.note)}</div>` : ""}
            <div class="annotation-meta">${timeStr}</div>
          </div>
          <button class="annotation-delete" data-action="delete" aria-label="${Strings.annotations.delete}">×</button>
        `;
      }

      annotationsList.appendChild(li);
    });

    // Load snippets for highlights asynchronously
    if (currentAnnTab === "highlights") {
      Promise.all(
        highlights.map(async (item) => {
          if (!item.id.startsWith("hl_")) return null;
          try {
            const { buildTextMap } = await import("../reader/TextMap.js");
            const textMap = buildTextMap(readerContent);
            const range = textMap.offsetsToRange(item.start, item.end);
            if (range) {
              const snippet = range.toString().substring(0, 60);
              const itemEl = annotationsList.querySelector(`[data-ann-id="${item.id}"]`);
              if (itemEl) {
                const snippetEl = itemEl.querySelector(".annotation-snippet");
                if (snippetEl) {
                  snippetEl.textContent = snippet + (snippet.length === 60 ? "…" : "");
                }
              }
            }
          } catch (e) {
            // Ignore errors
          }
        })
      ).catch(() => {});
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      readerView.clearCache?.();
      preparedNextSlug = null;
      preparedPrevSlug = null;
    }
  });

    // Initialize global search overlay
  (async () => {
    const { createGlobalSearch } = await import("../search/GlobalSearch.js");
    globalSearchController = createGlobalSearch({
      onNavigate: (slug, query) => {
        // Navigate within same page
        const url = `read.html#novel/${encodeURIComponent(slug)}?q=${encodeURIComponent(query)}`;
        location.href = url;
      },
      strings: Strings.search
    });
    // Set chapters repo getter for lazy loading during search
    globalSearchController.setChaptersRepoGetter(() => ChaptersRepo);

    // Add Ctrl/⌘ K shortcut handler (only when overlay not open)
    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      const isModKey = event.metaKey || event.ctrlKey;
      const isK = event.key === "k" || event.key === "K";
      
      if (isModKey && isK && !event.altKey) {
        // Only open if overlay is not already open and not in editable target
        const target = event.target;
        if (
          !target ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        if (!globalSearchController?.isOpen()) {
          event.preventDefault();
          // Ensure chapters are loaded before opening
          ChaptersRepo.load().then(() => {
            globalSearchController?.open(ChaptersRepo);
          });
        }
      }
    });

    // Add click handler for search button
    const searchButton = document.querySelector('[data-action="open-global-search"]');
    searchButton?.addEventListener("click", () => {
      ChaptersRepo.load().then(() => {
        globalSearchController?.open(ChaptersRepo);
      });
    });
  })();

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

    // Apply annotations
    if (annotationsController) {
      annotationsController.clearApplied();
      annotationsController.applyForChapter(chapter.slug);
      updateAnnotationsPanel(chapter.slug);
    }

    // Apply pending search query if present
    if (pendingSearchQuery && searchInput && searchController) {
      searchInput.value = pendingSearchQuery;
      searchController.setQuery(pendingSearchQuery);
      // Jump to first hit
      setTimeout(() => {
        searchController?.next();
      }, 100);
      pendingSearchQuery = null; // Clear after applying
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
