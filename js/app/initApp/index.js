/**
 * InitApp - Module Coordinator
 * Initializes and coordinates all app modules
 */

// Module imports
import { createMusicPlayerUI } from "./MusicPlayerUI.js";
import { createWriterDraftManager } from "./WriterDraftManager.js";
import { createWriterImportExport } from "./WriterImportExport.js";
import { createReaderSettingsUI } from "./ReaderSettingsUI.js";
import { createChapterManager } from "./ChapterManager.js";
import { createUIControllers } from "./UIControllers.js";

export function initApp({
  stores,
  chaptersRepo,
  themeService,
  audioPlayer,
  createProgressTracker,
  createReaderView,
  createTocList,
  createReaderModal,
  initShortcuts,
  router,
  strings
} = {}) {
  // Validate dependencies
  if (!stores) {
    throw new Error("initApp requires stores dependency");
  }
  const { ReaderSettingsStore, DraftStore, LastReadStore } = stores;
  if (!ReaderSettingsStore || !DraftStore) {
    throw new Error("stores missing ReaderSettingsStore or DraftStore");
  }
  if (!chaptersRepo) {
    throw new Error("initApp requires chaptersRepo");
  }
  if (!themeService) {
    throw new Error("initApp requires themeService");
  }
  if (!audioPlayer) {
    throw new Error("initApp requires audioPlayer");
  }
  if (typeof createProgressTracker !== "function") {
    throw new Error("initApp requires createProgressTracker function");
  }
  if (typeof createReaderView !== "function") {
    throw new Error("initApp requires createReaderView function");
  }
  if (typeof createTocList !== "function") {
    throw new Error("initApp requires createTocList function");
  }
  if (typeof createReaderModal !== "function") {
    throw new Error("initApp requires createReaderModal function");
  }
  if (typeof initShortcuts !== "function") {
    throw new Error("initApp requires initShortcuts function");
  }
  if (!router || typeof router.startRouter !== "function" || typeof router.linkToChapter !== "function") {
    throw new Error("initApp requires router startRouter/linkToChapter");
  }

  const Strings = strings || {};

  document.addEventListener("DOMContentLoaded", () => {
    // ======================
    // DOM Element References
    // ======================

    const body = document.body;
    const themeToggleBtn = document.querySelector('[data-action="toggle-theme"]');
    const scrollButtons = document.querySelectorAll('[data-action="scroll"]');
    const readerLayoutBtn = document.querySelector('[data-action="toggle-reader-layout"]');
    const openReaderBtn = document.querySelector('[data-action="open-reader"]');
    const openWriterBtn = document.querySelector('[data-action="open-writer"]');
    const readerGrid = document.querySelector(".reader-grid");
    const readerContent = document.querySelector(".reader-content");

    // Reader settings elements
    const fontSlider = document.querySelector('input[data-action="font-size"]');
    const lineSlider = document.querySelector('input[data-action="line-height"]');
    const readerThemeButtons = document.querySelectorAll(".theme-toggle .pill");

    // TOC and reader elements
    const tocList = document.querySelector(".toc ol");
    const readerProgressBar = document.querySelector('[data-progress="reader"]');
    const readerProgressFill = readerProgressBar?.querySelector(".progress-fill");

    // Modal elements
    const readerModalElement = document.getElementById("reader-modal");
    const modalTocContainer = readerModalElement ? readerModalElement.querySelector(".modal-toc") : null;
    const modalArticle = readerModalElement ? readerModalElement.querySelector(".modal-article") : null;
    const modalCloseElements = readerModalElement ? readerModalElement.querySelectorAll('[data-action="close-modal"]') : [];
    const modalProgressBar = document.querySelector('[data-progress="modal"]');
    const modalProgressFill = modalProgressBar?.querySelector(".progress-fill");
    const modalContent = readerModalElement ? readerModalElement.querySelector(".modal-content") : null;

    // Writer elements
    const tabs = document.querySelectorAll(".writer-tabs .tab");
    const panels = document.querySelectorAll(".writer-panels .panel");
    const noteList = document.querySelector(".note-list");
    const ideaToast = document.getElementById("idea-toast");
    const ideaButton = document.querySelector('[data-action="capture-idea"]');
    const autosaveStatus = document.getElementById("autosave-status");
    const exportButton = document.querySelector('[data-action="export-markdown"]');
    const importButton = document.querySelector('[data-action="import-markdown"]');
    const importInput = document.getElementById("import-file");
    const draftTitle = document.getElementById("draft-title");
    const draftTags = document.getElementById("draft-tags");
    const draftBody = document.getElementById("draft-body");
    const wordCountDisplay = document.getElementById("word-count");
    const previewTitle = document.getElementById("preview-title");
    const previewBody = document.getElementById("preview-body");
    const previewTags = document.getElementById("preview-tags");

    // Music player elements
    const musicSelect = document.getElementById("music-mood");
    const playMusicButton = document.querySelector('[data-action="play-music"]');
    const playMusicButtonLabel = playMusicButton?.querySelector(".btn-label");
    const volumeSlider = document.getElementById("music-volume");
    const volumeValue = document.getElementById("volume-value");

    // ======================
    // Create Progress Trackers
    // ======================

    const readerProgressTracker = createProgressTracker({
      container: readerContent,
      progressBar: readerProgressBar,
      progressFill: readerProgressFill,
      context: "reader",
      onProgress: (progress, detail) => {
        chapterManager?.handleReaderProgress(progress, detail);
      }
    });

    const modalProgressTracker = createProgressTracker({
      container: modalArticle,
      progressBar: modalProgressBar,
      progressFill: modalProgressFill,
      context: "modal"
    });

    // ======================
    // Create Reader View
    // ======================

    const readerView = createReaderView({
      readerContainer: readerContent,
      modalContainer: modalArticle,
      readerTracker: readerProgressTracker,
      modalTracker: modalProgressTracker
    });

    // ======================
    // Create TOC List
    // ======================

    const tocListController = createTocList({
      tocContainer: tocList,
      modalContainer: modalTocContainer,
      onChapterSelect: (index) => chapterManager?.selectChapter(index)
    });

    // ======================
    // Create Reader Modal
    // ======================

    const readerModalController = readerModalElement
      ? createReaderModal({
          modalElement: readerModalElement,
          modalContent,
          openButton: openReaderBtn,
          closeElements: modalCloseElements,
          progressTracker: modalProgressTracker,
          syncTheme: () => readerSettingsUI?.syncModalTheme()
        })
      : null;

    // ======================
    // Create Reader Settings UI
    // ======================

    const readerSettingsUI = createReaderSettingsUI({
      readerContent,
      modalArticle,
      fontSlider,
      lineSlider,
      readerThemeButtons,
      readerProgressTracker,
      modalProgressTracker,
      ReaderSettingsStore,
      themeService
    });

    // ======================
    // Initialize Theme Service
    // ======================

    themeService.init({ body, toggleButton: themeToggleBtn });
    themeService.applyStoredShellMode();
    readerSettingsUI?.initialize();

    // Theme toggle button
    themeToggleBtn?.addEventListener("click", () => {
      themeService.toggleShellMode();
      themeService.syncReaderTheme({
        readerSettings: readerSettingsUI?.getSettings(),
        applyReaderSettings: () => readerSettingsUI?.applySettings(),
        persistReaderSettings: () => {},
        syncModalTheme: () => readerSettingsUI?.syncModalTheme()
      });
    });

    // ======================
    // Create Chapter Manager
    // ======================

    const chapterManager = createChapterManager({
      chaptersRepo,
      readerView,
      tocListController,
      readerModalController,
      LastReadStore,
      router,
      syncModalTheme: () => readerSettingsUI?.syncModalTheme()
    });

    // ======================
    // Create UI Controllers
    // ======================

    const uiControllers = createUIControllers({
      scrollButtons,
      readerLayoutBtn,
      openReaderBtn,
      openWriterBtn,
      tabs,
      panels,
      ideaButton,
      noteList,
      ideaToast,
      readerGrid,
      readerContent,
      modalContent,
      readerProgressTracker,
      readerModalController,
      chapterManager,
      Strings
    });

    uiControllers?.initialize();

    // ======================
    // Create Writer Draft Manager
    // ======================

    const writerDraftManager = createWriterDraftManager({
      draftTitle,
      draftTags,
      draftBody,
      wordCountDisplay,
      previewTitle,
      previewBody,
      previewTags,
      autosaveStatus,
      DraftStore
    });

    writerDraftManager?.initialize();

    // ======================
    // Create Writer Import/Export
    // ======================

    const writerImportExport = createWriterImportExport({
      exportButton,
      importButton,
      importInput,
      draftTitle,
      draftTags,
      draftBody,
      buildDraftSnapshot: () => writerDraftManager?.buildDraftSnapshot(),
      getTagList: (raw, limit) => writerDraftManager?.getTagList(raw, limit),
      updateWordCount: () => writerDraftManager?.updateWordCount(),
      updatePreview: () => writerDraftManager?.updatePreview(),
      scheduleAutosave: (options) => writerDraftManager?.scheduleAutosave(options)
    });

    writerImportExport?.initialize();

    // ======================
    // Create Music Player UI
    // ======================

    const musicPlayerUI = createMusicPlayerUI({
      musicSelect,
      playMusicButton,
      playMusicButtonLabel,
      volumeSlider,
      volumeValue,
      audioPlayer,
      showToast: (msg) => uiControllers?.showToast(msg)
    });

    musicPlayerUI?.initialize();

    // ======================
    // Initialize Keyboard Shortcuts
    // ======================

    const shortcutsController = initShortcuts({
      onEscape: () => {
        if (readerModalController?.isOpen()) {
          readerModalController.close();
          return true;
        }
        return false;
      },
      onLeft: () => {
        if (!chapterManager?.isReady()) {
          return false;
        }
        const chapters = chapterManager.getChapters();
        const currentIndex = chapterManager.getCurrentIndex();
        if (currentIndex > 0) {
          chapterManager.selectChapter(currentIndex - 1);
          return true;
        }
        return false;
      },
      onRight: () => {
        if (!chapterManager?.isReady()) {
          return false;
        }
        const chapters = chapterManager.getChapters();
        const currentIndex = chapterManager.getCurrentIndex();
        if (currentIndex < chapters.length - 1) {
          chapterManager.selectChapter(currentIndex + 1);
          return true;
        }
        return false;
      },
      onScrollDown: () => {
        uiControllers?.scrollActiveContainer("down");
        return true;
      },
      onScrollUp: () => {
        uiControllers?.scrollActiveContainer("up");
        return true;
      }
    });

    // ======================
    // Initialize Router
    // ======================

    router.startRouter({
      onRoute: (route) => {
        chapterManager?.setRoute(route);
      }
    });

    // ======================
    // Initialize Chapters
    // ======================

    chapterManager?.initChapters();

    // ======================
    // Register Service Worker
    // ======================

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) {
        return;
      }
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
    }

    registerServiceWorker();
  });
}

export default {
  initApp
};
