import { ReaderSettingsStore, LastReadStore, AnnotationStore } from "../services/Stores.js";
import ChaptersRepo from "../services/ChaptersRepo.js";
import ThemeService from "../services/ThemeService.js";
import { createTracker } from "../reader/ProgressTracker.js";
import { createReaderView } from "../reader/ReaderView.js";
import { createAnnotations } from "../reader/Annotations.js";
import Strings from "../strings.js";

const HIGHLIGHT_COLORS = ["ylw", "grn", "blu", "pnk"];
const HIGHLIGHT_COLOR_LABELS = Strings.annotations.highlightColors || {};

document.addEventListener("DOMContentLoaded", () => {
  initImmersiveReader().catch((error) => {
    console.error("[ImmersiveReader] 初始化失败", error);
    renderFallback(error);
  });
});

function renderFallback(error) {
  const article = document.getElementById("immersiveArticle");
  if (!article) return;
  const message = document.createElement("p");
  message.textContent = `加载阅读内容时出错：${error?.message || "未知错误"}`;
  message.className = "immersive-fallback-message";
  article.innerHTML = "";
  article.appendChild(message);
}

async function initImmersiveReader() {
  const body = document.body;
  const stage = document.querySelector("[data-stage]");
  const chromeElements = document.querySelectorAll("[data-layer='chrome']");
  const article = document.getElementById("immersiveArticle");
  const scrollContainer = document.getElementById("immersiveScroll");

  const topbarTitle = document.querySelector("[data-chapter-title]");
  const topbarIndex = document.querySelector("[data-chapter-index]");
  const topbarMeta = document.querySelector("[data-chapter-meta]");
  const backButton = document.querySelector('[data-action="back"]');
  const shareButton = document.querySelector('[data-action="share"]');
  const prevButton = document.querySelector('[data-action="prev-chapter"]');
  const nextButton = document.querySelector('[data-action="next-chapter"]');
  const themeButtons = document.querySelectorAll("[data-reader-theme]");
  const fontSlider = document.querySelector('[data-action="font-size"]');
  const fontDisplay = document.querySelector("[data-font-size-display]");
  const themeGroup = document.querySelector(".theme-group");

  const progressBar = document.querySelector('[data-progress="immersive"]');
  const progressFill = progressBar?.querySelector(".progress-fill");
  const progressLabel = document.querySelector("[data-progress-label]");

  const annotationsButton = document.querySelector('[data-action="toggle-annotations"]');
  const annotationBadge = document.querySelector("[data-annotation-count]");

  const highlightPopover = document.getElementById("highlightPopover");
  const highlightColorButtons = highlightPopover
    ? highlightPopover.querySelectorAll("[data-color]")
    : [];

  const annotationDrawer = document.getElementById("annotationDrawer");
  const annotationDrawerPanel = document.getElementById("annotationDrawerPanel");
  const annotationBackdrop = annotationDrawer?.querySelector(".annotations-drawer__backdrop");
  const annotationList = document.getElementById("annotationList");
  const annotationTabs = annotationDrawer
    ? annotationDrawer.querySelectorAll("[data-annotation-tab]")
    : [];
  const drawerAddBookmarkButton = annotationDrawer?.querySelector('[data-action="drawer-add-bookmark"]');
  const drawerCountBadges = {
    highlights: annotationDrawer?.querySelector('[data-count="highlights"]') || null,
    bookmarks: annotationDrawer?.querySelector('[data-count="bookmarks"]') || null
  };
  const annotationDrawerTitle = document.getElementById("annotationDrawerTitle");

  const toastEl = document.getElementById("immersiveToast");

  if (!stage || !article || !scrollContainer || !progressBar || !progressFill) {
    throw new Error("必需的阅读容器缺失");
  }

  ThemeService.init({ body });
  ThemeService.applyStoredShellMode();

  const readerSettings = loadReaderSettings();
  applyReaderSettings();
  updateThemeButtons();
  updateFontDisplay();

  const tracker = createTracker({
    container: scrollContainer,
    progressBar,
    progressFill,
    context: "reader",
    onProgress: handleProgress
  });

  const readerView = createReaderView({
    readerContainer: article,
    modalContainer: null,
    readerTracker: tracker,
    modalTracker: null
  });

  const annotationsController = createAnnotations({
    articleEl: article,
    store: AnnotationStore
  });

  await ChaptersRepo.load();
  const chapters = ChaptersRepo.list();
  if (!Array.isArray(chapters) || !chapters.length) {
    throw new Error("未找到章节内容");
  }

  let currentChapterIndex = resolveInitialIndex(chapters);
  let currentChapterSlug = null;
  let drawerOpen = false;
  let highlightPopoverVisible = false;
  let currentAnnotationsTab = "highlights";
  let toastTimer = null;
  let selectionHideTimer = null;
  let annotationUnsubscribe = null;

  stage.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    if (drawerOpen || highlightPopoverVisible) return;
    if (event.target.closest("[data-chrome-surface]")) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    setChromeVisible(!body.classList.contains("chrome-open"));
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.readerTheme || "sepia";
      if (readerSettings.theme === theme) return;
      readerSettings.theme = theme;
      applyReaderSettings();
      persistReaderSettings();
      updateThemeButtons();
    });
  });

  fontSlider?.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    readerSettings.fontSize = Math.min(Math.max(value, 16), 26);
    applyReaderSettings();
    persistReaderSettings();
    updateFontDisplay();
  });

  prevButton?.addEventListener("click", () => {
    if (currentChapterIndex <= 0) return;
    selectChapter(currentChapterIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    if (currentChapterIndex >= chapters.length - 1) return;
    selectChapter(currentChapterIndex + 1);
  });

  backButton?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "/index.html";
  });

  shareButton?.addEventListener("click", () => {
    if (!currentChapterSlug) return;
    const chapter = chapters[currentChapterIndex];
    const shareUrl = buildShareUrl(currentChapterSlug);
    const shareData = {
      title: chapter?.title || Strings.meta.siteName,
      text: Strings.meta.defaultDescription,
      url: shareUrl
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        copyToClipboard(shareUrl);
        showToast("链接已复制");
      });
    } else {
      copyToClipboard(shareUrl);
      showToast("链接已复制");
    }
  });

  annotationsButton?.addEventListener("click", () => {
    if (drawerOpen) {
      closeAnnotationsDrawer();
    } else {
      openAnnotationsDrawer();
    }
  });

  drawerAddBookmarkButton?.addEventListener("click", () => {
    handleBookmarkCreation({ fromDrawer: true });
  });
  if (highlightPopover && highlightColorButtons.length) {
    highlightColorButtons.forEach((button) => {
      const color = button.dataset.color;
      if (color && HIGHLIGHT_COLORS.includes(color)) {
        const label = HIGHLIGHT_COLOR_LABELS[color] || `${Strings.annotations.highlight}`;
        button.setAttribute("aria-label", label);
        button.addEventListener("click", () => {
          handleHighlightCreation(color);
        });
      }
    });
  }

  function handleSelectionPopover(event) {
    if (!highlightPopover || !article) return;
    clearTimeout(selectionHideTimer);

    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      selection.rangeCount === 0 ||
      !article.contains(selection.anchorNode) ||
      !article.contains(selection.focusNode)
    ) {
      hideHighlightPopover();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range || range.collapsed) {
      hideHighlightPopover();
      return;
    }

    showHighlightPopover(range);
  }

  scrollContainer.addEventListener("mouseup", handleSelectionPopover);
  scrollContainer.addEventListener("touchend", handleSelectionPopover);

  document.addEventListener("selectionchange", () => {
    if (!highlightPopoverVisible) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      selectionHideTimer = window.setTimeout(() => {
        hideHighlightPopover();
      }, 80);
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (!highlightPopoverVisible) return;
    if (!highlightPopover.contains(event.target)) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          hideHighlightPopover();
        }
      }, 20);
    }
  });

  window.addEventListener("resize", () => {
    if (highlightPopoverVisible) {
      hideHighlightPopover();
    }
  });

  scrollContainer.addEventListener("scroll", () => {
    if (highlightPopoverVisible) {
      hideHighlightPopover();
    }
  });

  annotationBackdrop?.addEventListener("click", () => closeAnnotationsDrawer());
  annotationDrawer
    ?.querySelectorAll("[data-action='close-annotations']")
    .forEach((btn) => btn.addEventListener("click", () => closeAnnotationsDrawer()));

  annotationTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.annotationTab;
      if (!tabName || currentAnnotationsTab === tabName) return;
      currentAnnotationsTab = tabName;
      annotationTabs.forEach((t) => t.classList.toggle("active", t === tab));
      annotationTabs.forEach((t) =>
        t.setAttribute("aria-selected", t.dataset.annotationTab === currentAnnotationsTab ? "true" : "false")
      );
      if (drawerOpen) {
        renderAnnotationsDrawer();
      }
    });
  });

  annotationList?.addEventListener("click", (event) => {
    const target = event.target;
    const item = target.closest("[data-ann-id]");
    if (!item) return;
    const id = item.dataset.annId;
    if (!id || !annotationsController) return;

    if (target.closest("[data-action='delete']")) {
      event.stopPropagation();
      if (annotationsController.remove(id)) {
        if (currentChapterSlug) {
          annotationsController.applyForChapter(currentChapterSlug);
        }
        showToast(Strings.annotations.removed);
        refreshAnnotationsUI();
      }
      return;
    }

    if (id.startsWith("bm_")) {
      const jumped = annotationsController.jumpToBookmark(id, scrollContainer);
      if (jumped) {
        closeAnnotationsDrawer();
      }
    } else if (id.startsWith("hl_")) {
      const jumped = annotationsController.jumpToHighlight(id);
      if (jumped) {
        closeAnnotationsDrawer();
      }
    }
  });

  let lastBookmarkKeyTime = 0;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (drawerOpen) {
        closeAnnotationsDrawer();
        event.preventDefault();
        return;
      }
      if (highlightPopoverVisible) {
        hideHighlightPopover();
        window.getSelection()?.removeAllRanges();
        event.preventDefault();
      }
      return;
    }

    if (event.key.toLowerCase() === "b" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const now = Date.now();
      if (now - lastBookmarkKeyTime <= 400) {
        event.preventDefault();
        handleBookmarkCreation();
        lastBookmarkKeyTime = 0;
      } else {
        lastBookmarkKeyTime = now;
      }
    }
  });

  window.addEventListener("popstate", () => {
    const slug = readSlugFromUrl();
    if (!slug) return;
    const index = ChaptersRepo.getIndexBySlug(slug);
    if (Number.isInteger(index) && index !== currentChapterIndex) {
      selectChapter(index, { updateUrl: false, preserveChrome: true });
    }
  });

  annotationUnsubscribe = AnnotationStore.subscribe(() => {
    refreshAnnotationsUI();
  });

  window.addEventListener("beforeunload", () => {
    if (typeof annotationUnsubscribe === "function") {
      annotationUnsubscribe();
    }
  });

  const initialResult = selectChapter(currentChapterIndex, { updateUrl: false, preserveChrome: false });
  if (!initialResult) {
    throw new Error("无法渲染章节内容");
  }
  setChromeVisible(false, { force: true });

  function selectChapter(index, { updateUrl = true, preserveChrome = false } = {}) {
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = readerView.render(safeIndex);
    if (!chapter) {
      return false;
    }

    currentChapterIndex = safeIndex;
    currentChapterSlug = chapter.slug;

    if (!preserveChrome) {
      setChromeVisible(false, { force: true });
    }
    hideHighlightPopover();

    const ordinal = safeIndex + 1;
    const stats = ChaptersRepo.getStats(chapter);
    if (topbarTitle) {
      topbarTitle.textContent = chapter.title || `章节 ${ordinal}`;
    }
    if (topbarIndex) {
      topbarIndex.textContent = `第 ${ordinal} 章`;
    }
    if (topbarMeta) {
      const minutes = Math.max(1, Math.round(stats.minutes || 1));
      const words = Math.max(0, Math.round(stats.words || 0));
      topbarMeta.textContent = `≈ ${minutes} 分钟 · ${words} 字`;
    }

    annotationsController.applyForChapter(chapter.slug);
    refreshAnnotationsUI();
    updateNavButtons();
    updateDocumentMeta(chapter);
    LastReadStore.set({ slug: chapter.slug });

    if (updateUrl) {
      pushUrlWithSlug(chapter.slug);
    }

    return true;
  }

  function refreshAnnotationsUI() {
    const counts = updateAnnotationBadge(currentChapterSlug);
    if (drawerOpen) {
      renderAnnotationsDrawer(counts);
    }
  }

  function updateNavButtons() {
    if (prevButton) {
      prevButton.disabled = currentChapterIndex <= 0;
    }
    if (nextButton) {
      nextButton.disabled = currentChapterIndex >= chapters.length - 1;
    }
  }

  function handleProgress(value) {
    if (!progressLabel) return;
    const percent = Math.round((Number(value) || 0) * 100);
    progressLabel.textContent = `${percent}%`;
  }

  function handleBookmarkCreation({ fromDrawer = false } = {}) {
    if (!annotationsController || !currentChapterSlug) {
      showToast(Strings.annotations.bookmarkFailed);
      return;
    }
    const maxScroll = Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 1);
    const percent = maxScroll > 0 ? scrollContainer.scrollTop / maxScroll : 0;
    const bookmark = annotationsController.createBookmark({
      slug: currentChapterSlug,
      percent,
      scrollTop: scrollContainer.scrollTop
    });
    if (!bookmark) {
      showToast(Strings.annotations.bookmarkFailed);
      return;
    }
    const chapterNumber = currentChapterIndex + 1;
    const percentLabel = Math.round(percent * 100);
    refreshAnnotationsUI();
    showToast(
      Strings.annotations.fab?.bookmarkAdded
        ? Strings.annotations.fab.bookmarkAdded(chapterNumber, percentLabel)
        : Strings.annotations.addedBookmark
    );
  }

  function handleHighlightCreation(color) {
    if (!annotationsController || !currentChapterSlug) {
      showToast(Strings.annotations.highlightFailed);
      return;
    }
    const highlight = annotationsController.createHighlightFromSelection({
      slug: currentChapterSlug,
      color,
      note: ""
    });
    if (!highlight) {
      showToast(Strings.annotations.highlightFailed);
      return;
    }
    annotationsController.applyForChapter(currentChapterSlug);
    refreshAnnotationsUI();
    hideHighlightPopover();
    window.getSelection()?.removeAllRanges();
    showToast(Strings.annotations.addedHighlight);
  }

  function showHighlightPopover(range) {
    if (!highlightPopover) return;
    const stageRect = stage.getBoundingClientRect();
    const rect = range.getBoundingClientRect();
    const top = rect.top - stageRect.top + scrollContainer.scrollTop;
    const left = rect.left - stageRect.left + rect.width / 2 + scrollContainer.scrollLeft;
    highlightPopover.style.top = `${top}px`;
    highlightPopover.style.left = `${left}px`;
    highlightPopover.classList.add("is-visible");
    highlightPopover.setAttribute("aria-hidden", "false");
    highlightPopoverVisible = true;
    setChromeVisible(true, { force: true });
  }

  function hideHighlightPopover() {
    if (!highlightPopover) return;
    clearTimeout(selectionHideTimer);
    selectionHideTimer = null;
    if (!highlightPopoverVisible) return;
    highlightPopover.classList.remove("is-visible");
    highlightPopover.setAttribute("aria-hidden", "true");
    highlightPopoverVisible = false;
  }

  function openAnnotationsDrawer() {
    if (!annotationDrawer) return;
    annotationDrawer.classList.add("is-open");
    annotationDrawer.setAttribute("aria-hidden", "false");
    annotationsButton?.setAttribute("aria-expanded", "true");
    drawerOpen = true;
    body.classList.add("drawer-open");
    setChromeVisible(true, { force: true });
    renderAnnotationsDrawer();
    annotationDrawerPanel?.focus({ preventScroll: true });
  }

  function closeAnnotationsDrawer() {
    if (!annotationDrawer) return;
    annotationDrawer.classList.remove("is-open");
    annotationDrawer.setAttribute("aria-hidden", "true");
    annotationsButton?.setAttribute("aria-expanded", "false");
    drawerOpen = false;
    body.classList.remove("drawer-open");
  }

  function renderAnnotationsDrawer(countsFromCaller) {
    if (!annotationList || !annotationsController || !currentChapterSlug) return;
    const counts = countsFromCaller || updateAnnotationBadge(currentChapterSlug);
    const bookmarkItems = counts.bookmarks;
    const highlightItems = counts.highlights;

    if (annotationDrawerTitle) {
      const currentChapter = chapters[currentChapterIndex];
      annotationDrawerTitle.textContent = currentChapter?.title || "标注";
    }

    annotationList.innerHTML = "";
    annotationList.setAttribute("role", "list");

    annotationTabs.forEach((tab) => {
      const tabName = tab.dataset.annotationTab;
      const isActive = tabName === currentAnnotationsTab;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (currentAnnotationsTab === "toc") {
      renderTocList();
      return;
    }

    const items = currentAnnotationsTab === "highlights" ? highlightItems : bookmarkItems;

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "annotations-empty";
      empty.textContent =
        currentAnnotationsTab === "highlights" ? Strings.annotations.noHighlights : Strings.annotations.noBookmarks;
      annotationList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const container = document.createElement("div");
      container.className = "annotation-item";
      container.dataset.annId = item.id;
      container.setAttribute("role", "listitem");
      container.setAttribute("tabindex", "0");

      if (item.id.startsWith("hl_")) {
        const createdAt = new Date(item.createdAt);
        const timeStr = createdAt.toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric"
        });
        container.innerHTML = `
          <div class="annotation-content">
            <div class="annotation-snippet">高亮片段</div>
            ${
              item.note
                ? `<div class="annotation-note">${escapeHtml(String(item.note))}</div>`
                : ""
            }
            <div class="annotation-meta">${timeStr}</div>
          </div>
          <button class="annotation-delete" type="button" data-action="delete" aria-label="${Strings.annotations.delete}">×</button>
        `;
      } else {
        const percent = Math.round((item.percent || 0) * 100);
        const createdAt = new Date(item.createdAt);
        const timeStr = createdAt.toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric"
        });
        container.innerHTML = `
          <div class="annotation-content">
            <div class="annotation-snippet">${percent}%</div>
            ${
              item.note
                ? `<div class="annotation-note">${escapeHtml(String(item.note))}</div>`
                : ""
            }
            <div class="annotation-meta">${timeStr}</div>
          </div>
          <button class="annotation-delete" type="button" data-action="delete" aria-label="${Strings.annotations.delete}">×</button>
        `;
      }

      annotationList.appendChild(container);
    });

    if (currentAnnotationsTab === "highlights" && highlightItems.length) {
      populateHighlightSnippets(highlightItems);
    }
  }

  function renderTocList() {
    if (!annotationList) return;
    annotationList.innerHTML = "";
    annotationList.setAttribute("role", "list");

    chapters.forEach((chapter, index) => {
      const button = document.createElement("button");
      button.className = "annotation-item annotation-item--toc";
      button.type = "button";
      button.dataset.chapterIndex = String(index);
      button.setAttribute("role", "listitem");
      button.setAttribute("tabindex", "0");

      if (index === currentChapterIndex) {
        button.classList.add("is-active");
        button.setAttribute("aria-current", "true");
      }

      button.innerHTML = `
        <div class="annotation-content">
          <div class="annotation-snippet">${escapeHtml(chapter.title || `第 ${index + 1} 章`)}</div>
          <div class="annotation-meta">${index + 1} / ${chapters.length}</div>
        </div>
        <span class="annotation-toc-arrow">›</span>
      `;

      button.addEventListener("click", () => {
        if (index === currentChapterIndex) {
          closeAnnotationsDrawer();
          return;
        }
        selectChapter(index, { updateUrl: true, preserveChrome: true });
        closeAnnotationsDrawer();
      });

      annotationList.appendChild(button);
    });
  }

  async function populateHighlightSnippets(highlights) {
    if (!Array.isArray(highlights) || !highlights.length) return;
    try {
      const { buildTextMap } = await import("../reader/TextMap.js");
      const textMap = buildTextMap(article);
      highlights.forEach((item) => {
        const range = textMap.offsetsToRange(item.start, item.end);
        if (!range) return;
        const snippet = range.toString().trim();
        const target = annotationList?.querySelector(`[data-ann-id="${item.id}"] .annotation-snippet`);
        if (target) {
          const formatted = snippet.length > 60 ? `${snippet.slice(0, 60)}…` : snippet;
          target.textContent = formatted || "高亮片段";
        }
      });
    } catch (error) {
      console.warn("[ImmersiveReader] 生成高亮摘要失败", error);
    }
  }

  function updateAnnotationBadge(slug) {
    if (!annotationsController || !slug) return { bookmarks: [], highlights: [] };
    const { bookmarks, highlights } = annotationsController.list(slug);
    const total = bookmarks.length + highlights.length;
    if (annotationBadge) {
      annotationBadge.textContent = String(total);
      annotationBadge.hidden = total === 0;
    }
    if (drawerCountBadges.highlights) {
      drawerCountBadges.highlights.textContent = highlights.length;
    }
    if (drawerCountBadges.bookmarks) {
      drawerCountBadges.bookmarks.textContent = bookmarks.length;
    }
    return { bookmarks, highlights };
  }

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.setAttribute("aria-hidden", "false");
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
      toastEl.setAttribute("aria-hidden", "true");
    }, 2400);
  }

  function applyReaderSettings() {
    if (scrollContainer) {
      scrollContainer.style.fontSize = `${readerSettings.fontSize}px`;
      const lineHeight = Number(readerSettings.lineHeight) || 1.8;
      scrollContainer.style.lineHeight = lineHeight;
    }
    const theme = readerSettings.theme || "sepia";
    body.dataset.readerTheme = theme;
  }

  function persistReaderSettings() {
    ReaderSettingsStore.save(readerSettings);
  }

  function updateThemeButtons() {
    const activeTheme = readerSettings.theme || "sepia";
    themeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.readerTheme === activeTheme);
    });
    if (themeGroup) {
      themeGroup.setAttribute("aria-label", `当前主题：${themeLabel(activeTheme)}`);
    }
  }

  function updateFontDisplay() {
    if (fontDisplay) {
      fontDisplay.textContent = `${Math.round(readerSettings.fontSize)}px`;
    }
    if (fontSlider) {
      fontSlider.value = String(Math.round(readerSettings.fontSize));
    }
  }

  function loadReaderSettings() {
    const stored = ReaderSettingsStore.load();
    if (stored && typeof stored === "object") {
      return {
        fontSize: Number(stored.fontSize) || 20,
        lineHeight: Number(stored.lineHeight) || 1.8,
        theme: stored.theme || "sepia"
      };
    }
    return { fontSize: 20, lineHeight: 1.8, theme: "sepia" };
  }

  function setChromeVisible(visible, { force = false } = {}) {
    if (!force && !visible && (drawerOpen || highlightPopoverVisible)) {
      return;
    }
    body.classList.toggle("chrome-open", visible);
    chromeElements.forEach((element) => {
      element.hidden = !visible;
    });
  }

  function resolveInitialIndex(chaptersList) {
    const { slug, source } = readSlugInfo();
    if (slug) {
      const index = ChaptersRepo.getIndexBySlug(slug);
      if (Number.isInteger(index) && index >= 0) {
        if (source === "path") {
          const chapter = chaptersList[index];
          if (chapter) {
            pushUrlWithSlug(chapter.slug);
          }
        }
        return index;
      }
    }
    const last = LastReadStore.get();
    if (last?.slug) {
      const index = ChaptersRepo.getIndexBySlug(last.slug);
      if (Number.isInteger(index) && index >= 0) {
        return index;
      }
    }
    return 0;
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

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (error) {
      console.warn("复制链接失败", error);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  function themeLabel(theme) {
    switch (theme) {
      case "night":
        return "夜间";
      case "day":
        return "晨光";
      case "sepia":
      default:
        return "纸感";
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }
}
