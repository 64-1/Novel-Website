/**
 * Reader Main - Module Coordinator
 * Initializes and coordinates all reader page modules
 */

// Core imports
import { ReaderSettingsStore, LastReadStore, AnnotationStore } from "../../services/Stores.js";
import ChaptersRepo from "../../services/ChaptersRepo.js";
import ThemeService from "../../services/ThemeService.js";
import { createTracker } from "../../reader/ProgressTracker.js";
import { createReaderView } from "../../reader/ReaderView.js";
import { createSearchController } from "../../reader/SearchInChapter.js";
import { createTocList } from "../../reader/TocList.js";
import { createReaderModal } from "../../modal/ReaderModal.js";
import { createAnnotations } from "../../reader/Annotations.js";
import { initShortcuts } from "../../services/Shortcuts.js";
import { startRouter, linkToChapter } from "../../router.js";
import Strings from "../../strings.js";

// Module imports
import { createMetadataManager } from "./MetadataManager.js";
import { createFABController } from "./FABController.js";
import { createBookmarksDrawer } from "./BookmarksDrawer.js";
import { createReaderSettingsUI } from "./ReaderSettingsUI.js";
import { createAnnotationsUI } from "./AnnotationsUI.js";
import { createChapterNavigation } from "./ChapterNavigation.js";

// Utilities
import { LIMITS, TIMING } from "../../utils/constants.js";

document.addEventListener("DOMContentLoaded", () => {
  // ======================
  // DOM Element References
  // ======================

  const body = document.body;
  const themeToggleBtn = document.querySelector('[data-action="toggle-theme"]');
  const readerGrid = document.querySelector(".reader-grid");
  const readerContent = document.querySelector(".reader-content");
  const openReaderBtn = document.querySelector('[data-action="open-reader"]');

  // Settings UI elements
  const fontSlider = document.querySelector('input[data-action="font-size"]');
  const lineSlider = document.querySelector('input[data-action="line-height"]');
  const readerThemeButtons = document.querySelectorAll(".theme-toggle .pill");
  const readerLayoutBtn = document.querySelector('[data-action="toggle-reader-layout"]');

  // TOC and Modal elements
  const tocList = document.querySelector(".toc ol");
  const readerModalElement = document.getElementById("reader-modal");
  const modalTocContainer = readerModalElement?.querySelector(".modal-toc");
  const modalArticle = readerModalElement?.querySelector(".modal-article");
  const modalCloseElements = readerModalElement?.querySelectorAll('[data-action="close-modal"]') || [];
  const modalContent = readerModalElement?.querySelector(".modal-content");

  // Progress bars
  const readerProgressBar = document.querySelector('[data-progress="reader"]');
  const readerProgressFill = readerProgressBar?.querySelector(".progress-fill");
  const modalProgressBar = document.querySelector('[data-progress="modal"]');
  const modalProgressFill = modalProgressBar?.querySelector(".progress-fill");
  const readingTimeDisplay = document.querySelector("[data-reading-time]");

  // Search elements
  const searchInput = document.getElementById("chap-search");
  const searchPrevBtn = document.getElementById("chap-search-prev");
  const searchNextBtn = document.getElementById("chap-search-next");
  const searchClearBtn = document.getElementById("chap-search-clear");
  const searchStatus = document.getElementById("chap-search-status");

  // Annotations elements
  const addBookmarkBtn = document.getElementById("add-bookmark");
  const selectionPopover = document.getElementById("selection-popover");
  const highlightSelectionBtn = document.getElementById("highlight-selection");
  const addNoteBtn = document.getElementById("add-note");
  const annotationsList = document.getElementById("annotations-list");
  const bookmarkCount = document.getElementById("bookmark-count");
  const highlightCount = document.getElementById("highlight-count");
  const annTabs = document.querySelectorAll(".ann-tab");

  // Bookmarks drawer elements
  const bookmarksDrawerTrigger = document.getElementById("bookmarks-drawer-trigger");
  const bookmarksDrawer = document.getElementById("bookmarks-drawer");
  const bookmarksDrawerList = document.getElementById("bookmarks-drawer-list");
  const drawerTabs = document.querySelectorAll(".drawer-tab");
  const drawerCloseElements = document.querySelectorAll('[data-action="close-drawer"]');

  // FAB elements
  const fabAddBookmark = document.getElementById("fab-add-bookmark");
  const bookmarkToast = document.getElementById("bookmark-toast");

  // ======================
  // State Variables
  // ======================

  let pendingSearchQuery = null;
  let annotationStoreUnsubscribe = null;

  // ======================
  // Create Progress Trackers
  // ======================

  const readerProgressTracker = createTracker({
    container: readerContent,
    progressBar: readerProgressFill
  });

  const modalProgressTracker = createTracker({
    container: modalArticle,
    progressBar: modalProgressFill
  });

  // ======================
  // Create Reader View
  // ======================

  const readerView = createReaderView({
    container: readerContent,
    repo: ChaptersRepo,
    tracker: readerProgressTracker,
    modalTracker: modalProgressTracker
  });

  // ======================
  // Create Metadata Manager
  // ======================

  const metadataManager = createMetadataManager({
    siteName: Strings?.meta?.siteName || "星海小说",
    defaultDescription: Strings?.meta?.defaultDescription || "",
    shareImage: Strings?.meta?.shareImage || "/icons/icon-512.png"
  });

  // ======================
  // Create Annotations Controller
  // ======================

  const annotationsController = createAnnotations({
    articleElement: readerContent,
    annotationStore: AnnotationStore
  });

  // ======================
  // Create Chapter Navigation
  // ======================

  const chapterNavigation = createChapterNavigation({
    chaptersRepo: ChaptersRepo,
    lastReadStore: LastReadStore,
    readerView,
    tocListController: null, // Set after TOC is created
    readerModalController: null, // Set after modal is created
    router: { linkToChapter },
    readingTimeDisplay,
    onChapterChanged: (chapter, index) => {
      // Update metadata
      metadataManager.updateChapterMeta(chapter);

      // Apply annotations
      if (annotationsController) {
        annotationsController.clearApplied();
        annotationsController.applyForChapter(chapter.slug);
      }

      // Update annotations UI if initialized
      if (annotationsUI) {
        annotationsUI.updatePanel(chapter.slug);
      }

      // Update bookmarks drawer if open
      if (bookmarksDrawerController?.isOpen()) {
        bookmarksDrawerController.render();
      }

      // Clear search
      if (searchController) {
        searchController.onChapterChanged();
      }

      // Check for pending bookmark scroll
      if (bookmarksDrawerController) {
        bookmarksDrawerController.checkPendingScroll(readerContent);
      }

      // Apply pending search query
      if (pendingSearchQuery && searchInput && searchController) {
        searchInput.value = pendingSearchQuery;
        searchController.setQuery(pendingSearchQuery);
        setTimeout(() => searchController?.next(), 100);
        pendingSearchQuery = null;
      }

      // Show FAB after delay
      if (fabController) {
        setTimeout(() => fabController.show(), 400);
      }
    },
    onChaptersLoaded: (chapters) => {
      // Show FAB after chapters loaded
      if (fabController) {
        setTimeout(() => fabController.show(), 600);
      }
    }
  });

  // ======================
  // Create TOC List
  // ======================

  const tocListController = createTocList({
    tocContainer: tocList,
    modalContainer: modalTocContainer,
    onChapterSelect: (index) => chapterNavigation.selectChapter(index)
  });

  // Update navigation with TOC controller
  chapterNavigation.tocListController = tocListController;

  // ======================
  // Create Reader Modal
  // ======================

  let readerModalController = null;
  if (readerModalElement) {
    readerModalController = createReaderModal({
      modalElement: readerModalElement,
      modalContent,
      openButton: openReaderBtn,
      closeElements: modalCloseElements,
      progressTracker: modalProgressTracker,
      syncTheme: () => {
        if (readerSettingsUI) {
          readerSettingsUI.syncModalTheme();
        }
      },
      onOpen: () => {
        if (fabController) fabController.hide();
      },
      onClose: () => {
        if (fabController) {
          setTimeout(() => fabController.show(), 200);
        }
      }
    });

    // Update navigation with modal controller
    chapterNavigation.readerModalController = readerModalController;
  }

  // ======================
  // Create Reader Settings UI
  // ======================

  const readerSettingsUI = createReaderSettingsUI({
    readerContent,
    modalArticle,
    readerGrid,
    fontSlider,
    lineSlider,
    themeButtons: readerThemeButtons,
    layoutButton: readerLayoutBtn,
    progressTrackers: [readerProgressTracker, modalProgressTracker],
    settingsStore: ReaderSettingsStore,
    themeService: ThemeService,
    strings: {
      layoutLabels: Strings?.buttons?.toggleWide || {}
    }
  });

  readerSettingsUI.initialize();

  // ======================
  // Create Annotations UI
  // ======================

  let annotationsUI = null;
  if (annotationsList) {
    annotationsUI = createAnnotationsUI({
      readerContent,
      annotationsList,
      selectionPopover,
      addBookmarkBtn,
      highlightSelectionBtn,
      addNoteBtn,
      bookmarkCount,
      highlightCount,
      tabElements: annTabs,
      annotationsController,
      getCurrentChapter: () => chapterNavigation.getCurrentChapter(),
      strings: {
        addBookmark: Strings.annotations?.addBookmark || "书签",
        addNote: Strings.annotations?.addNote || "添加笔记",
        noBookmarks: Strings.annotations?.noBookmarks || "暂无书签",
        noHighlights: Strings.annotations?.noHighlights || "暂无高亮",
        delete: Strings.annotations?.delete || "删除"
      }
    });

    annotationsUI.initialize();
  }

  // ======================
  // Create Bookmarks Drawer
  // ======================

  let bookmarksDrawerController = null;
  if (bookmarksDrawer && bookmarksDrawerList) {
    bookmarksDrawerController = createBookmarksDrawer({
      drawerElement: bookmarksDrawer,
      drawerList: bookmarksDrawerList,
      triggerElement: bookmarksDrawerTrigger,
      closeElements: drawerCloseElements,
      tabElements: drawerTabs,
      getBookmarks: () => AnnotationStore.getAllBookmarks(),
      getChapters: () => chapterNavigation.getChapters(),
      getCurrentChapterSlug: () => chapterNavigation.getCurrentChapter()?.slug || "",
      onBookmarkClick: (bookmarkId) => {
        const bookmark = AnnotationStore.getAllBookmarks().find(bm => bm.id === bookmarkId);
        if (!bookmark) return;

        const currentChapter = chapterNavigation.getCurrentChapter();
        const currentSlug = currentChapter?.slug || "";

        if (bookmark.slug === currentSlug) {
          // Same chapter - scroll to position
          if (annotationsController) {
            annotationsController.jumpToBookmark(bookmarkId, readerContent);
          } else {
            // Fallback: scroll manually
            const maxScroll = Math.max(readerContent.scrollHeight - readerContent.clientHeight, 1);
            const targetScroll = bookmark.percent * maxScroll;
            readerContent.scrollTo({ top: targetScroll, behavior: "smooth" });
          }
        } else {
          // Different chapter - navigate
          const url = `/novel/${encodeURIComponent(bookmark.slug)}`;
          sessionStorage.setItem(
            "pendingBookmarkScroll",
            JSON.stringify({ percent: bookmark.percent, scrollTop: bookmark.scrollTop })
          );
          location.href = url;
        }
      },
      onBookmarkDelete: (bookmarkId) => {
        if (AnnotationStore.removeBookmark(bookmarkId)) {
          bookmarksDrawerController.render();
          if (annotationsUI) {
            const chapter = chapterNavigation.getCurrentChapter();
            if (chapter) {
              annotationsUI.updatePanel(chapter.slug);
            }
          }
        }
      },
      onOpen: () => {
        if (fabController) fabController.hide();
      },
      onClose: () => {
        if (fabController) {
          setTimeout(() => fabController.show(), 200);
        }
      },
      strings: {
        emptyCurrent: Strings.annotations?.drawer?.emptyCurrent || "当前章节无书签",
        emptyAll: Strings.annotations?.drawer?.emptyAll || "暂无书签",
        locate: Strings.annotations?.drawer?.locate || "定位",
        delete: Strings.annotations?.delete || "删除"
      }
    });

    bookmarksDrawerController.initialize();
  }

  // Subscribe to annotation store changes
  if (AnnotationStore.subscribe) {
    annotationStoreUnsubscribe = AnnotationStore.subscribe(() => {
      // Update drawer if open
      if (bookmarksDrawerController?.isOpen()) {
        bookmarksDrawerController.render();
      }
      // Update annotations panel
      if (annotationsUI) {
        const chapter = chapterNavigation.getCurrentChapter();
        if (chapter) {
          annotationsUI.updatePanel(chapter.slug);
        }
      }
    });
  }

  // ======================
  // Create FAB Controller
  // ======================

  let fabController = null;
  if (fabAddBookmark && readerContent) {
    fabController = createFABController({
      fabElement: fabAddBookmark,
      toastElement: bookmarkToast,
      scrollContainer: readerContent,
      onBookmarkCreate: ({ percent, scrollTop, note }) => {
        const chapter = chapterNavigation.getCurrentChapter();
        if (!chapter || !annotationsController) return null;

        const bookmark = annotationsController.createBookmark({
          slug: chapter.slug,
          percent,
          scrollTop,
          note
        });

        if (bookmark) {
          // Update UIs
          if (annotationsUI) {
            annotationsUI.updatePanel(chapter.slug);
          }
          if (bookmarksDrawerController?.isOpen()) {
            bookmarksDrawerController.render();
          }

          return {
            ...bookmark,
            chapterNum: chapterNavigation.getCurrentIndex() + 1,
            percent: Math.round(percent * 100)
          };
        }
        return null;
      },
      isDrawerOpen: () => bookmarksDrawerController?.isOpen() || false,
      isModalOpen: () => readerModalController?.isOpen() || false,
      isSearchFocused: () => document.activeElement === searchInput,
      strings: {
        addNoteOptional: Strings.annotations?.fab?.addNoteOptional || "添加备注（可选）：",
        bookmarkAdded: (chapterNum, percent) =>
          Strings.annotations?.fab?.bookmarkAdded?.(chapterNum, percent) || `第${chapterNum}章 ${percent}% 书签已添加`
      }
    });

    fabController.initialize();
  }

  // ======================
  // Create Search Controller
  // ======================

  let searchController = null;
  if (searchInput && readerContent) {
    searchController = createSearchController({
      articleEl: readerContent,
      onNavigate: (index, total) => {
        if (searchStatus) {
          searchStatus.textContent = total > 0 ? `${index + 1} / ${total}` : "";
        }
      },
      maxHighlights: LIMITS.SEARCH_HIGHLIGHT_CAP
    });

    // Search input event
    let searchDebounce = null;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        searchController.setQuery(e.target.value);
      }, TIMING.SEARCH_DEBOUNCE);
    });

    // Search navigation
    searchPrevBtn?.addEventListener("click", () => searchController.previous());
    searchNextBtn?.addEventListener("click", () => searchController.next());
    searchClearBtn?.addEventListener("click", () => {
      searchInput.value = "";
      searchController.clear();
    });

    // Hide FAB when search focused
    searchInput.addEventListener("focus", () => {
      if (fabController) fabController.hide();
    });
    searchInput.addEventListener("blur", () => {
      if (fabController) {
        setTimeout(() => fabController.show(), 200);
      }
    });
  }

  // ======================
  // Keyboard Shortcuts
  // ======================

  initShortcuts({
    onEscape: () => {
      if (bookmarksDrawerController?.isOpen()) {
        bookmarksDrawerController.close();
        return true;
      }
      if (readerModalController?.isOpen()) {
        readerModalController.close();
        return true;
      }
      return false;
    },
    onLeft: () => chapterNavigation.previousChapter(),
    onRight: () => chapterNavigation.nextChapter(),
    onUp: () => {
      const container = readerModalController?.isOpen() && modalArticle ? modalArticle : readerContent;
      if (container) {
        const amount = Math.max(container.clientHeight * 0.9, LIMITS.MIN_SCROLL_AMOUNT);
        container.scrollBy({ top: -amount, behavior: "smooth" });
      }
      return true;
    },
    onDown: () => {
      const container = readerModalController?.isOpen() && modalArticle ? modalArticle : readerContent;
      if (container) {
        const amount = Math.max(container.clientHeight * 0.9, LIMITS.MIN_SCROLL_AMOUNT);
        container.scrollBy({ top: amount, behavior: "smooth" });
      }
      return true;
    },
    onKeyB: () => {
      // Add bookmark shortcut
      if (fabController) {
        fabController.handleClick?.();
        return true;
      }
      return false;
    },
    onKeyH: () => {
      // Open highlights/bookmarks panel
      if (bookmarksDrawerController) {
        bookmarksDrawerController.open();
        return true;
      }
      return false;
    }
  });

  // ======================
  // Theme Toggle
  // ======================

  themeToggleBtn?.addEventListener("click", () => {
    ThemeService.toggle();
  });

  // ======================
  // Handle Initial URL and Routing
  // ======================

  const initialPathSlug = chapterNavigation.pathSlug();
  const initialHashSlug = chapterNavigation.getHashSlug(window.location.hash);
  const initialQuerySlug = chapterNavigation.getChapterSlugFromQuery(window.location.search);
  const canonicalSlug = initialPathSlug || initialHashSlug || initialQuerySlug;
  const searchParams = new URLSearchParams(window.location.search);
  const hasChapterParam = searchParams.has("chapter");

  // Canonicalize URL
  if (canonicalSlug) {
    const needsCanonicalPath =
      !initialPathSlug || initialPathSlug !== canonicalSlug || hasChapterParam || Boolean(initialHashSlug);
    if (needsCanonicalPath) {
      chapterNavigation.replaceUrlWithPath(canonicalSlug, searchParams);
    }
  } else if (hasChapterParam) {
    searchParams.delete("chapter");
    const serialized = searchParams.toString();
    const newUrl = serialized ? `?${serialized}` : window.location.pathname;
    history.replaceState(null, "", newUrl);
  }

  // Extract pending search query from URL
  const searchQuery = searchParams.get("q");
  if (searchQuery) {
    pendingSearchQuery = searchQuery;
  }

  // ======================
  // Start Router
  // ======================

  startRouter({
    onRoute: (route) => {
      if (chapterNavigation.isReady()) {
        chapterNavigation.applyRoute(route);
      } else {
        chapterNavigation.setPendingRoute(route);
      }
    },
    onLastRoute: (route) => {
      chapterNavigation.setLastRoute(route);
    }
  });

  // ======================
  // Load Chapters
  // ======================

  chapterNavigation.loadChapters().catch((error) => {
    console.error("[ReaderMain] Failed to load chapters:", error);
  });

  // ======================
  // Progress Event Listener
  // ======================

  window.addEventListener("reader:progress", (e) => {
    chapterNavigation.handleReaderProgress(e.detail.progress, e.detail);
  });
});
