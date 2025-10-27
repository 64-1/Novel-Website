document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  if (!window.NovelStores) {
    throw new Error("NovelStores not initialised. Ensure js/services/Stores.js is loaded before app.js");
  }
  if (!window.NovelChaptersRepo) {
    throw new Error("NovelChaptersRepo not initialised. Ensure js/services/ChaptersRepo.js is loaded before app.js");
  }
  if (!window.NovelReaderProgressTracker) {
    throw new Error("NovelReaderProgressTracker not initialised. Ensure js/reader/ProgressTracker.js is loaded before app.js");
  }
  if (!window.NovelReaderView) {
    throw new Error("NovelReaderView not initialised. Ensure js/reader/ReaderView.js is loaded before app.js");
  }
  if (!window.NovelThemeService) {
    throw new Error("NovelThemeService not initialised. Ensure js/services/ThemeService.js is loaded before app.js");
  }
  if (!window.NovelTocList) {
    throw new Error("NovelTocList not initialised. Ensure js/reader/TocList.js is loaded before app.js");
  }
  if (!window.NovelRouter) {
    throw new Error("NovelRouter not initialised. Ensure js/router.js is loaded before app.js");
  }
  if (!window.NovelFocusTrap) {
    throw new Error("NovelFocusTrap not initialised. Ensure js/a11y/FocusTrap.js is loaded before app.js");
  }
  if (!window.NovelReaderModal) {
    throw new Error("NovelReaderModal not initialised. Ensure js/modal/ReaderModal.js is loaded before app.js");
  }
  const {
    ReaderSettingsStore,
    DraftStore
  } = window.NovelStores;
  const ChaptersRepo = window.NovelChaptersRepo;
  const ThemeService = window.NovelThemeService;
  const ProgressTrackerFactory = window.NovelReaderProgressTracker;
  const ReaderViewFactory = window.NovelReaderView;
  const TocListFactory = window.NovelTocList;
  const Router = window.NovelRouter;
  const ReaderModalFactory = window.NovelReaderModal;

  const themeToggleBtn = document.querySelector('[data-action="toggle-theme"]');
  const scrollButtons = document.querySelectorAll('[data-action="scroll"]');
  const readerLayoutBtn = document.querySelector('[data-action="toggle-reader-layout"]');
  const openReaderBtn = document.querySelector('[data-action="open-reader"]');
  const openWriterBtn = document.querySelector('[data-action="open-writer"]');
  const readerGrid = document.querySelector(".reader-grid");
  const readerContent = document.querySelector(".reader-content");
  const fontSlider = document.querySelector('input[data-action="font-size"]');
  const lineSlider = document.querySelector('input[data-action="line-height"]');
  const readerThemeButtons = document.querySelectorAll(".theme-toggle .pill");
  const tocList = document.querySelector(".toc ol");
  const readerProgressBar = document.querySelector('[data-progress="reader"]');
  const readerProgressFill = readerProgressBar?.querySelector(".progress-fill");
  const readerModal = document.getElementById("reader-modal");
  const modalTocContainer = readerModal ? readerModal.querySelector(".modal-toc") : null;
  const modalArticle = readerModal ? readerModal.querySelector(".modal-article") : null;
  const modalCloseElements = readerModal ? readerModal.querySelectorAll('[data-action="close-modal"]') : [];
  const modalProgressBar = document.querySelector('[data-progress="modal"]');
  const modalProgressFill = modalProgressBar?.querySelector(".progress-fill");
  const modalContent = readerModal ? readerModal.querySelector(".modal-content") : null;
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
  const musicSelect = document.getElementById("music-mood");
  const playMusicButton = document.querySelector('[data-action="play-music"]');

  let toastTimeout;
  let currentChapterIndex = 0;
  let readerProgressTracker;
  let modalProgressTracker;
  let autosaveTimer = null;
  let lastSavedSnapshot = "";
  const AUTOSAVE_DELAY = 1000;
  let chaptersReady = false;
  let pendingRoute = null;
  let lastRoute = null;
  let readerModalController = null;

  let chapters = [];

  const readerSettings = loadReaderSettings();
  applyReaderSettings();

  ThemeService.init({ body, toggleButton: themeToggleBtn });
  ThemeService.applyStoredShellMode();
  ThemeService.syncReaderTheme({
    readerSettings,
    applyReaderSettings,
    persistReaderSettings,
    syncModalTheme,
    respectOverride: false
  });

  readerProgressTracker = ProgressTrackerFactory.createTracker({
    container: readerContent,
    progressBar: readerProgressBar,
    progressFill: readerProgressFill,
    context: "reader"
  });

  modalProgressTracker = ProgressTrackerFactory.createTracker({
    container: modalArticle,
    progressBar: modalProgressBar,
    progressFill: modalProgressFill,
    context: "modal"
  });

  const readerView = ReaderViewFactory.create({
    readerContainer: readerContent,
    modalContainer: modalArticle,
    readerTracker: readerProgressTracker,
    modalTracker: modalProgressTracker
  });

  readerModalController = readerModal
    ? ReaderModalFactory.create({
        modalElement: readerModal,
        modalContent,
        openButton: openReaderBtn,
        closeElements: modalCloseElements,
        progressTracker: modalProgressTracker,
        syncTheme: syncModalTheme
      })
    : null;

  const tocListController = TocListFactory.create({
    tocContainer: tocList,
    modalContainer: modalTocContainer,
    onChapterSelect: (index) => selectChapter(index)
  });

  Router.start({
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

  loadDraftFromStorage();
  updateWordCount();
  updatePreview();
  initChapters();

  // ---------- Theme & Shell ----------
  themeToggleBtn?.addEventListener("click", () => {
    ThemeService.toggleShellMode();
    ThemeService.syncReaderTheme({
      readerSettings,
      applyReaderSettings,
      persistReaderSettings,
      syncModalTheme
    });
  });

  async function initChapters() {
    await ChaptersRepo.load();
    chapters = ChaptersRepo.list();

    tocListController.render();
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
      const initialSlug = ChaptersRepo.getSlugByIndex(currentChapterIndex);
      if (!window.location.hash || window.location.hash.startsWith("#novel/")) {
        Router.linkToChapter(initialSlug);
        lastRoute = {
          type: "novel",
          slug: initialSlug,
          encodedSlug: encodeURIComponent(initialSlug),
          initial: false
        };
      }
    }
  }

  // ---------- Smooth scroll ----------
  scrollButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = button.getAttribute("data-target");
      if (!target) return;
      event.preventDefault();
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  openWriterBtn?.addEventListener("click", () => {
    document.getElementById("writer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- Reader controls ----------
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

  readerLayoutBtn?.addEventListener("click", () => {
    readerGrid?.classList.toggle("expanded");
    readerLayoutBtn.classList.toggle("active");
    readerLayoutBtn.textContent = readerLayoutBtn.classList.contains("active") ? "切换常规" : "切换宽屏";
    readerProgressTracker?.refresh({ fromStorage: true });
  });
  document.addEventListener("keydown", handleGlobalKeydown);

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
  }

  function syncModalTheme() {
    if (modalArticle) {
      modalArticle.dataset.theme = readerSettings.theme;
    }
  }

  function selectChapter(index, options = {}) {
    const { updateHash = true } = options;
    if (!chapters.length) {
      chapters = ChaptersRepo.list();
    }
    if (!chapters.length) {
      return;
    }
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = readerView.render(safeIndex);
    if (!chapter) return;
    currentChapterIndex = safeIndex;
    tocListController.setActive(safeIndex);
    readerModalController?.refreshFocusTrap();
    syncModalTheme();
    if (updateHash) {
      Router.linkToChapter(chapter.slug);
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

  function scrollToSection(id, behavior = "smooth") {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior, block: "start" });
  }

  function handleGlobalKeydown(event) {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    const tagName = target?.tagName;
    if (
      target &&
      (target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT")
    ) {
      return;
    }

    if (event.key === "Escape") {
      if (readerModalController?.isOpen()) {
        event.preventDefault();
        readerModalController.close();
      }
      return;
    }

    if (!chapters.length) return;

    switch (event.key) {
      case "ArrowRight":
        if (currentChapterIndex < chapters.length - 1) {
          event.preventDefault();
          selectChapter(currentChapterIndex + 1);
        }
        break;
      case "ArrowLeft":
        if (currentChapterIndex > 0) {
          event.preventDefault();
          selectChapter(currentChapterIndex - 1);
        }
        break;
      case "j":
      case "J":
        event.preventDefault();
        scrollActiveContainer("down");
        break;
      case "k":
      case "K":
        event.preventDefault();
        scrollActiveContainer("up");
        break;
      default:
        break;
    }
  }

  function scrollActiveContainer(direction) {
    const container = readerModalController?.isOpen() && modalArticle ? modalArticle : readerContent;
    if (!container) return;
    const amount = Math.max(container.clientHeight * 0.9, 200);
    const offset = direction === "down" ? amount : -amount;
    container.scrollBy({ top: offset, behavior: "smooth" });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
  }

  // ---------- Writer studio ----------
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const panelId = tab.dataset.panel;
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${panelId}`)?.classList.add("active");
    });
  });

  ideaButton?.addEventListener("click", () => {
    const idea = window.prompt("记录下此刻的灵感片段：");
    if (!idea) return;
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = "灵感快照";
    const paragraph = document.createElement("p");
    paragraph.textContent = idea;
    item.appendChild(strong);
    item.appendChild(paragraph);
    noteList?.prepend(item);
    showToast("灵感已捕捉，稍后可在“章节笔记”查看。");
  });

  playMusicButton?.addEventListener("click", () => {
    const mood = musicSelect?.options[musicSelect.selectedIndex]?.text || "氛围配乐";
    showToast(`已为你准备「${mood}」氛围音轨，正式版即将上线。`);
    playMusicButton.textContent = "播放中...";
    playMusicButton.disabled = true;
    setTimeout(() => {
      playMusicButton.textContent = "播放预设";
      playMusicButton.disabled = false;
    }, 2200);
  });

  [draftTitle, draftTags, draftBody].forEach((input) => {
    input?.addEventListener("input", () => {
      updateWordCount();
      updatePreview();
      scheduleAutosave();
    });
  });

  exportButton?.addEventListener("click", handleExportMarkdown);
  importButton?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", handleImportMarkdown);

  function loadDraftFromStorage() {
    const draft = readDraftSnapshot();
    if (!draft) return;
    if (draftTitle) draftTitle.value = draft.title || "";
    if (draftTags) draftTags.value = draft.tags || "";
    if (draftBody) draftBody.value = draft.body || "";
    lastSavedSnapshot = JSON.stringify(buildDraftSnapshot());
    setAutosaveStatus("已自动保存");
  }

  function updateWordCount() {
    if (!wordCountDisplay) return;
    const text = draftBody?.value || "";
    const normalized = text.replace(/\s+/g, "");
    wordCountDisplay.textContent = normalized.length.toString();
  }

  function updatePreview() {
    if (previewTitle) {
      previewTitle.textContent = draftTitle?.value?.trim() || "第十三章 · 标题预览";
    }
    if (previewBody) {
      previewBody.textContent =
        draftBody?.value?.trim() || "你在写作空间中输入的内容会即时排版呈现，方便你检查节奏与段落流动。";
    }
    if (previewTags) {
      const tagsInput = draftTags?.value ?? "";
      const tagsForPreview = tagsInput ? getTagList(tagsInput, 6) : ["软科幻", "群像", "治愈"];
      const tagsFragment = document.createDocumentFragment();
      tagsForPreview.forEach((tag) => {
        const span = document.createElement("span");
        span.textContent = tag;
        tagsFragment.appendChild(span);
      });
      previewTags.innerHTML = "";
      previewTags.appendChild(tagsFragment);
    }
  }

  function scheduleAutosave(options = {}) {
    const { immediate = false } = options;
    if (!draftTitle && !draftTags && !draftBody) return;
    if (immediate) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
      performAutosave();
      return;
    }
    clearTimeout(autosaveTimer);
    setAutosaveStatus("保存中…", true);
    autosaveTimer = window.setTimeout(() => {
      performAutosave();
    }, AUTOSAVE_DELAY);
  }

  function performAutosave() {
    autosaveTimer = null;
    const snapshot = buildDraftSnapshot();
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSavedSnapshot) {
      setAutosaveStatus("已自动保存");
      return;
    }
    try {
      const success = DraftStore.save(snapshot);
      if (success === false) {
        throw new Error("DraftStore.save returned false");
      }
      lastSavedSnapshot = serialized;
      setAutosaveStatus("已自动保存");
    } catch (error) {
      console.error("草稿自动保存失败：", error);
      setAutosaveStatus("自动保存失败", false);
    }
  }

  function buildDraftSnapshot() {
    return {
      title: draftTitle?.value?.trim() || "",
      tags: draftTags?.value?.trim() || "",
      body: draftBody?.value || ""
    };
  }

  function readDraftSnapshot() {
    const draft = DraftStore.load();
    if (!draft || typeof draft !== "object") {
      return null;
    }
    return {
      title: typeof draft.title === "string" ? draft.title : "",
      tags: Array.isArray(draft.tags) ? draft.tags.join(", ") : typeof draft.tags === "string" ? draft.tags : "",
      body: typeof draft.body === "string" ? draft.body : ""
    };
  }

  function setAutosaveStatus(message, saving = false) {
    if (!autosaveStatus) return;
    autosaveStatus.textContent = message;
    autosaveStatus.classList.toggle("saving", Boolean(saving));
  }

  function getTagList(raw, limit) {
    const tags = (raw || "")
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (typeof limit === "number") {
      return tags.slice(0, limit);
    }
    return tags;
  }

  function handleExportMarkdown() {
    const snapshot = buildDraftSnapshot();
    const tags = getTagList(snapshot.tags);
    const exportTitle = (snapshot.title || "未命名草稿").replace(/\r?\n/g, " ").trim();
    const frontMatter = [
      "---",
      `title: "${escapeYamlString(exportTitle || "未命名草稿")}"`
    ];
    if (tags.length) {
      frontMatter.push("tags:");
      tags.forEach((tag) => {
        frontMatter.push(`  - "${escapeYamlString(tag)}"`);
      });
    } else {
      frontMatter.push("tags: []");
    }
    frontMatter.push("---", "");

    const body = snapshot.body || "";
    const content = `${frontMatter.join("\n")}${body}`;
    const filename = `${createFileSlug(exportTitle || "draft")}_${formatDate(new Date())}.md`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleImportMarkdown(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseMarkdownFile(text);
      if (draftTitle) draftTitle.value = imported.title || "";
      if (draftTags) draftTags.value = imported.tags.length ? imported.tags.join(", ") : "";
      if (draftBody) draftBody.value = imported.body || "";
      updateWordCount();
      updatePreview();
      scheduleAutosave({ immediate: true });
    } catch (error) {
      console.error("导入 Markdown 失败：", error);
    } finally {
      if (importInput) {
        importInput.value = "";
      }
    }
  }

  function parseMarkdownFile(content) {
    const sanitized = content.replace(/^\uFEFF/, "");
    const { meta, body } = parseFrontMatter(sanitized);
    const tags = Array.isArray(meta.tags) ? meta.tags : getTagList(meta.tags || "");
    return {
      title: meta.title || "",
      tags,
      body
    };
  }

  function parseFrontMatter(text) {
    const lines = text.split(/\r?\n/);
    if (lines[0]?.trim() !== "---") {
      return { meta: {}, body: text };
    }
    const metaLines = [];
    let index = 1;
    let hasClosingFence = false;
    for (; index < lines.length; index++) {
      if (lines[index].trim() === "---") {
        index++;
        hasClosingFence = true;
        break;
      }
      metaLines.push(lines[index]);
    }
    if (!hasClosingFence) {
      return { meta: {}, body: text };
    }
    const meta = extractMeta(metaLines);
    const body = lines.slice(index).join("\n").replace(/^\n/, "");
    return { meta, body };
  }

  function extractMeta(lines) {
    const meta = {};
    const collectedTagLines = [];
    let collectingTags = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      if (collectingTags) {
        if (trimmed.startsWith("-")) {
          collectedTagLines.push(stripQuotes(trimmed.slice(1).trim()));
          continue;
        }
        collectingTags = false;
      }
      if (trimmed.startsWith("title:")) {
        meta.title = stripQuotes(trimmed.slice(6).trim());
      } else if (trimmed.startsWith("tags:")) {
        const value = trimmed.slice(5).trim();
        if (!value) {
          collectingTags = true;
          continue;
        } else if (value.startsWith("[") && value.endsWith("]")) {
          meta.tags = value
            .slice(1, -1)
            .split(/[,，]/)
            .map((tag) => stripQuotes(tag.trim()))
            .filter(Boolean);
        } else {
          meta.tags = value
            .split(/[,，]/)
            .map((tag) => stripQuotes(tag.trim()))
            .filter(Boolean);
        }
      }
    }
    if (collectedTagLines.length) {
      meta.tags = collectedTagLines;
    }
    return meta;
  }

  function stripQuotes(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  function escapeYamlString(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function createFileSlug(value) {
    const normalized = (value || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\u4e00-\u9fa5-]+/g, "_");
    return normalized || "draft";
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function showToast(message) {
    if (!ideaToast) return;
    ideaToast.textContent = message;
    ideaToast.classList.add("active");
    clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      ideaToast.classList.remove("active");
    }, 2400);
  }

  registerServiceWorker();
});
