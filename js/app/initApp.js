export function initApp({
  stores,
  chaptersRepo,
  themeService,
  createProgressTracker,
  createReaderView,
  createTocList,
  createReaderModal,
  initShortcuts,
  router,
  strings
} = {}) {
  if (!stores) {
    throw new Error("initApp requires stores dependency");
  }
  const { ReaderSettingsStore, DraftStore } = stores;
  if (!ReaderSettingsStore || !DraftStore) {
    throw new Error("stores missing ReaderSettingsStore or DraftStore");
  }
  if (!chaptersRepo) {
    throw new Error("initApp requires chaptersRepo");
  }
  if (!themeService) {
    throw new Error("initApp requires themeService");
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
    const body = document.body;
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
    const readerModalElement = document.getElementById("reader-modal");
    const modalTocContainer = readerModalElement ? readerModalElement.querySelector(".modal-toc") : null;
    const modalArticle = readerModalElement ? readerModalElement.querySelector(".modal-article") : null;
    const modalCloseElements = readerModalElement ? readerModalElement.querySelectorAll('[data-action="close-modal"]') : [];
    const modalProgressBar = document.querySelector('[data-progress="modal"]');
    const modalProgressFill = modalProgressBar?.querySelector(".progress-fill");
    const modalContent = readerModalElement ? readerModalElement.querySelector(".modal-content") : null;
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

    themeService.init({ body, toggleButton: themeToggleBtn });
    themeService.applyStoredShellMode();
    themeService.syncReaderTheme({
      readerSettings,
      applyReaderSettings,
      persistReaderSettings,
      syncModalTheme,
      respectOverride: false
    });

    readerProgressTracker = createProgressTracker({
      container: readerContent,
      progressBar: readerProgressBar,
      progressFill: readerProgressFill,
      context: "reader"
    });

    modalProgressTracker = createProgressTracker({
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

    const shortcutsController = initShortcuts({
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
      }
    });

    router.startRouter({
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

    themeToggleBtn?.addEventListener("click", () => {
      themeService.toggleShellMode();
      themeService.syncReaderTheme({
        readerSettings,
        applyReaderSettings,
        persistReaderSettings,
        syncModalTheme
      });
    });

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
        themeService.handleReaderThemeSelection(selectedTheme, {
          readerSettings,
          applyReaderSettings,
          persistReaderSettings,
          syncModalTheme
        });
      });
    });

    function updateReaderLayoutLabel() {
      if (!readerLayoutBtn) return;
      const labels = Strings?.buttons?.toggleWide || {};
      const expandedLabel = labels.expanded || "切换常规";
      const collapsedLabel = labels.collapsed || "切换宽屏";
      readerLayoutBtn.textContent = readerLayoutBtn.classList.contains("active")
        ? expandedLabel
        : collapsedLabel;
    }

    readerLayoutBtn?.addEventListener("click", () => {
      readerGrid?.classList.toggle("expanded");
      readerLayoutBtn.classList.toggle("active");
      updateReaderLayoutLabel();
      readerProgressTracker?.refresh({ fromStorage: true });
    });
    updateReaderLayoutLabel();

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
      showToast(Strings?.toasts?.ideaCaptured || "灵感已捕捉，稍后可在“章节笔记”查看。");
    });

    playMusicButton?.addEventListener("click", () => {
      const mood = musicSelect?.options[musicSelect.selectedIndex]?.text || "氛围配乐";
      const musicMessage =
        (Strings?.toasts?.musicLoading && Strings.toasts.musicLoading(mood)) ||
        `已为你准备「${mood}」氛围音轨，正式版即将上线。`;
      showToast(musicMessage);
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

    async function initChapters() {
      await chaptersRepo.load();
      chapters = chaptersRepo.list();

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
        const initialSlug = chaptersRepo.getSlugByIndex(currentChapterIndex);
        if (!window.location.hash || window.location.hash.startsWith("#novel/")) {
          router.linkToChapter(initialSlug);
          lastRoute = {
            type: "novel",
            slug: initialSlug,
            encodedSlug: encodeURIComponent(initialSlug),
            initial: false
          };
        }
      }
    }

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
        chapters = chaptersRepo.list();
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
        router.linkToChapter(chapter.slug);
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

    function scrollToSection(id, behavior = "smooth") {
      const section = document.getElementById(id);
      if (!section) return;
      section.scrollIntoView({ behavior, block: "start" });
    }

    function scrollActiveContainer(direction) {
      const container = readerModalController?.isOpen() && modalArticle ? modalArticle : readerContent;
      if (!container) return;
      const amount = Math.max(container.clientHeight * 0.9, 200);
      const offset = direction === "down" ? amount : -amount;
      container.scrollBy({ top: offset, behavior: "smooth" });
    }

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
        `title: "${escapeYamlString(exportTitle || "未命名草稿" )}"`
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

    registerServiceWorker();
  });
}

export default {
  initApp
};
