import { ReaderSettingsStore, LastReadStore, AnnotationStore } from "../services/Stores.js";
import ChaptersRepo from "../services/ChaptersRepo.js";
import UniverseCodex from "../services/UniverseCodex.js";
import ThemeService from "../services/ThemeService.js";
import { createTracker } from "../reader/ProgressTracker.js";
import { createReaderView } from "../reader/ReaderView.js";
import { createAnnotations } from "../reader/Annotations.js";
import Strings from "../strings.js";
import { escapeHtmlDom as escapeHtml } from "../utils/htmlSanitize.js";

const HIGHLIGHT_COLORS = ["ylw", "grn", "blu", "pnk"];
const HIGHLIGHT_COLOR_LABELS = Strings.annotations.highlightColors || {};
const THEME_LABELS = {
  sepia: "纸感",
  day: "晨光",
  night: "夜间",
  mint: "雾绿",
  ink: "墨青"
};
const FONT_STACKS = {
  serif: '"Noto Serif SC", "STZhongsong", serif',
  sans: '"Inter", "PingFang SC", "Source Han Sans", sans-serif'
};

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
  const topBookmarkButton = document.querySelector('[data-action="top-bookmark"]');
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

  const codexPopover = document.getElementById("codexPopover");
  const codexPopoverTag = codexPopover?.querySelector("[data-codex-tag]");
  const codexPopoverTitle = codexPopover?.querySelector("[data-codex-title]");
  const codexPopoverSummary = codexPopover?.querySelector("[data-codex-summary]");
  const codexPopoverDetails = codexPopover?.querySelector("[data-codex-details]");
  const codexPopoverTimeline = codexPopover?.querySelector("[data-codex-timeline]");
  const codexPopoverTags = codexPopover?.querySelector("[data-codex-tags]");
  const codexPopoverClose = codexPopover?.querySelector('[data-action="close-codex"]');

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
    bookmarks: annotationDrawer?.querySelector('[data-count="bookmarks"]') || null,
    codex: annotationDrawer?.querySelector('[data-count="codex"]') || null
  };
  const annotationDrawerTitle = document.getElementById("annotationDrawerTitle");

  const toastEl = document.getElementById("immersiveToast");
  const quickbar = document.querySelector(".reader-quickbar");
  const settingsQuickButton = quickbar?.querySelector(".quick-item[data-quick='settings']");
  const settingsDrawer = document.getElementById("readerSettings");
  const settingsPanel = document.getElementById("readerSettingsPanel");
  const settingsBackdrop = settingsDrawer?.querySelector(".reader-settings__backdrop");
  const settingsCloseButtons = settingsDrawer?.querySelectorAll('[data-action="close-settings"]');
  const settingsFontSlider = document.getElementById("settingsFontSize");
  const settingsFontValue = document.querySelector("[data-settings-font-display]");
  const settingsFontMinus = settingsDrawer?.querySelector('[data-action="font-smaller"]');
  const settingsFontPlus = settingsDrawer?.querySelector('[data-action="font-larger"]');
  const lineHeightButtons = settingsDrawer?.querySelectorAll("[data-line-height]");
  const swatchButtons = settingsDrawer?.querySelectorAll(".swatch");
  const fontButtons = settingsDrawer?.querySelectorAll(".settings-fonts .pill-btn");
  let lastSettingsTrigger = null;
  let chapterWordTotals = [];
  let cumulativeChapterWords = [];
  let totalBookWords = 0;
  let totalChapters = 0;

  if (!stage || !article || !scrollContainer || !progressBar || !progressFill) {
    throw new Error("必需的阅读容器缺失");
  }

  ThemeService.init({ body });
  ThemeService.applyStoredShellMode();

  const readerSettings = loadReaderSettings();
  let lastNonNightTheme = readerSettings.theme === "night" ? "sepia" : readerSettings.theme || "sepia";
  applyReaderSettings();
  updateThemeButtons();
  updateFontDisplay();
  updateQuickThemeLabel();

  const tracker = createTracker({
    container: scrollContainer,
    progressBar,
    progressFill,
    context: "reader",
    onProgress: handleProgress,
    renderProgress: updateBookProgress
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

  await UniverseCodex.load();
  await ChaptersRepo.load();
  const chapters = ChaptersRepo.list();
  if (!Array.isArray(chapters) || !chapters.length) {
    throw new Error("未找到章节内容");
  }
  chapterWordTotals = chapters.map((chapter) => {
    const stats = ChaptersRepo.getStats(chapter);
    return stats.words > 0 ? stats.words : 1;
  });
  cumulativeChapterWords = [];
  totalBookWords = 0;
  chapterWordTotals.forEach((count, index) => {
    totalBookWords += count;
    cumulativeChapterWords[index] = totalBookWords;
  });
  totalChapters = chapters.length;

  let currentChapterIndex = resolveInitialIndex(chapters);
  let currentChapterSlug = null;
  let drawerOpen = false;
  let highlightPopoverVisible = false;
  let codexPopoverVisible = false;
  let currentAnnotationsTab = "highlights";
  let toastTimer = null;
  let selectionHideTimer = null;
  let annotationUnsubscribe = null;
  let codexUnsubscribe = null;
  let activeCodexTrigger = null;
  let codexMentionElements = new Set();
  let currentCodexEntries = [];
  let codexEntryMap = new Map();
  let codexTermMatchers = [];

  stage.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    if (drawerOpen || highlightPopoverVisible || codexPopoverVisible) return;
    if (event.target.closest("[data-chrome-surface]")) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    setChromeVisible(!body.classList.contains("chrome-open"));
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.readerTheme || "sepia";
      if (readerSettings.theme === theme) return;
      if (theme !== "night") {
        lastNonNightTheme = theme;
      }
      ThemeService.handleReaderThemeSelection(theme, {
        readerSettings,
        applyReaderSettings,
        persistReaderSettings
      });
      updateThemeButtons();
      updateQuickThemeLabel();
    });
  });

  fontSlider?.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    readerSettings.fontSize = Math.min(Math.max(value, 16), 28);
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

  topBookmarkButton?.addEventListener("click", () => {
    topBookmarkButton.classList.add("is-pressed");
    handleBookmarkCreation();
    window.setTimeout(() => topBookmarkButton.classList.remove("is-pressed"), 420);
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

  codexPopoverClose?.addEventListener("click", () => {
    closeCodexPopover({ restoreFocus: true });
  });

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
    if (highlightPopoverVisible && highlightPopover && !highlightPopover.contains(event.target)) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          hideHighlightPopover();
        }
      }, 20);
    }
    if (
      codexPopoverVisible &&
      codexPopover &&
      !codexPopover.contains(event.target) &&
      !event.target.closest("[data-codex-mention]")
    ) {
      closeCodexPopover({ restoreFocus: false });
    }
  });

  window.addEventListener("resize", () => {
    if (highlightPopoverVisible) {
      hideHighlightPopover();
    }
    if (codexPopoverVisible) {
      closeCodexPopover({ restoreFocus: false });
    }
  });

  scrollContainer.addEventListener("scroll", () => {
    if (highlightPopoverVisible) {
      hideHighlightPopover();
    }
    if (codexPopoverVisible) {
      closeCodexPopover({ restoreFocus: false });
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

  annotationList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='codex-jump']");
    if (!button) return;
    const codexId = button.dataset.codexId;
    if (!codexId) return;
    event.preventDefault();
    closeAnnotationsDrawer();
    jumpToCodexMention(codexId);
  });

  let lastBookmarkKeyTime = 0;
  let lastTapTime = 0;
  let touchTapTimer = 0;

  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName;
    const isTypingContext =
      activeTag && ["INPUT", "TEXTAREA"].includes(activeTag) && !document.activeElement?.readOnly;

    if (event.key === "Escape") {
      if (isSettingsOpen()) {
        closeSettingsDrawer();
        event.preventDefault();
        return;
      }
      if (drawerOpen) {
        closeAnnotationsDrawer();
        event.preventDefault();
        return;
      }
      if (codexPopoverVisible) {
        closeCodexPopover({ restoreFocus: true });
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

    if (!isTypingContext && event.key === "ArrowLeft") {
      if (prevButton && !prevButton.disabled) {
        prevButton.click();
        event.preventDefault();
        return;
      }
    }

    if (!isTypingContext && event.key === "ArrowRight") {
      if (nextButton && !nextButton.disabled) {
        nextButton.click();
        event.preventDefault();
        return;
      }
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

  scrollContainer.addEventListener("dblclick", (event) => {
    if (event.defaultPrevented) return;
    if (event.target.closest("button, a, input, textarea, select, [data-codex-mention]")) {
      return;
    }
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }
    }
    handleBookmarkCreation();
  });

  scrollContainer.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "pen") {
      return;
    }
    if (event.target.closest("button, a, input, textarea, select, [data-codex-mention]")) {
      return;
    }
    if (window.getSelection && !window.getSelection().isCollapsed) {
      return;
    }
    const now = Date.now();
    if (now - lastTapTime <= 320) {
      handleBookmarkCreation();
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  });

  scrollContainer.addEventListener(
    "touchend",
    (event) => {
      if (event.defaultPrevented) return;
      if (event.touches && event.touches.length > 0) {
        return;
      }
      const target = event.target;
      if (target && target.closest("button, a, input, textarea, select, [data-codex-mention]")) {
        return;
      }
      if (typeof window.getSelection === "function") {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim()) {
          return;
        }
      }
      window.clearTimeout(touchTapTimer);
      if (touchTapTimer) {
        handleBookmarkCreation();
        touchTapTimer = 0;
      } else {
        touchTapTimer = window.setTimeout(() => {
          touchTapTimer = 0;
        }, 320);
      }
    },
    { passive: true }
  );

  quickbar?.addEventListener("click", (event) => {
    const button = event.target.closest(".quick-item");
    if (!button) return;
    const action = button.dataset.quick;
    if (!action) return;
    if (action === "toc") {
      // Let existing toggle handler manage drawer
      return;
    }
    event.preventDefault();
    switch (action) {
      case "font": {
        lastSettingsTrigger = button;
        toggleSettingsDrawer(true);
        const sliderWrap = settingsPanel?.querySelector(".settings-slider");
        sliderWrap?.classList.add("is-highlight");
        settingsFontSlider?.focus({ preventScroll: true });
        window.setTimeout(() => {
          sliderWrap?.classList.remove("is-highlight");
        }, 1400);
        button.classList.add("is-active");
        window.setTimeout(() => button.classList.remove("is-active"), 600);
        break;
      }
      case "theme": {
        const nextTheme = readerSettings.theme === "night" ? lastNonNightTheme || "sepia" : "night";
        if (nextTheme !== "night") {
          lastNonNightTheme = nextTheme;
        } else if (readerSettings.theme !== "night") {
          lastNonNightTheme = readerSettings.theme || "sepia";
        }
        const targetButton = Array.from(themeButtons).find(
          (btn) => btn.dataset.readerTheme === nextTheme
        );
        if (targetButton) {
          targetButton.click();
        } else {
          ThemeService.handleReaderThemeSelection(nextTheme, {
            readerSettings,
            applyReaderSettings,
            persistReaderSettings
          });
          updateThemeButtons();
        }
        updateQuickThemeLabel();
        const label = THEME_LABELS[nextTheme] || THEME_LABELS.sepia;
        showToast(nextTheme === "night" ? "夜间模式已开启" : `切换至${label}`);
        button.classList.add("is-active");
        window.setTimeout(() => button.classList.remove("is-active"), 600);
        break;
      }
      case "settings": {
        const targetState = !isSettingsOpen();
        lastSettingsTrigger = button;
        if (targetState) {
          toggleSettingsDrawer(true);
        } else {
          closeSettingsDrawer();
        }
        break;
      }
      default:
        break;
    }
  });

  settingsBackdrop?.addEventListener("click", closeSettingsDrawer);
  settingsCloseButtons?.forEach((btn) => btn.addEventListener("click", closeSettingsDrawer));

  settingsFontSlider?.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    readerSettings.fontSize = Math.min(Math.max(value, 16), 28);
    applyReaderSettings();
    persistReaderSettings();
    updateFontDisplay();
    updateSettingsFontControls();
  });

  settingsFontMinus?.addEventListener("click", () => {
    if (!settingsFontSlider) return;
    const value = Math.max(Number(settingsFontSlider.value) - 1, Number(settingsFontSlider.min) || 16);
    settingsFontSlider.value = String(value);
    settingsFontSlider.dispatchEvent(new Event("input", { bubbles: true }));
  });

  settingsFontPlus?.addEventListener("click", () => {
    if (!settingsFontSlider) return;
    const value = Math.min(Number(settingsFontSlider.value) + 1, Number(settingsFontSlider.max) || 28);
    settingsFontSlider.value = String(value);
    settingsFontSlider.dispatchEvent(new Event("input", { bubbles: true }));
  });

  lineHeightButtons?.forEach((btn) => {
    btn.addEventListener("click", () => {
      lineHeightButtons.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      const value = Number(btn.dataset.lineHeight) || 1.8;
      readerSettings.lineHeight = value;
      applyReaderSettings();
      persistReaderSettings();
    });
  });

  swatchButtons?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const theme = btn.dataset.theme;
      if (!theme) return;
      if (theme !== "night") {
        lastNonNightTheme = theme;
      }
      ThemeService.handleReaderThemeSelection(theme, {
        readerSettings,
        applyReaderSettings,
        persistReaderSettings
      });
      updateThemeButtons();
      updateQuickThemeLabel();
      swatchButtons.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
    });
  });

  fontButtons?.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selected = btn.dataset.font === "sans" ? "sans" : "serif";
      if (readerSettings.font === selected) return;
      readerSettings.font = selected;
      applyReaderSettings();
      persistReaderSettings();
    });
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

  codexUnsubscribe = UniverseCodex.subscribe(() => {
    if (!currentChapterSlug) return;
    refreshCodexEntries();
  });

  window.addEventListener("beforeunload", () => {
    if (typeof annotationUnsubscribe === "function") {
      annotationUnsubscribe();
    }
    if (typeof codexUnsubscribe === "function") {
      codexUnsubscribe();
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
    refreshCodexEntries({ refreshUI: false });
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

  function refreshCodexEntries({ refreshUI = true } = {}) {
    clearCodexMentions();
    closeCodexPopover();
    currentCodexEntries = currentChapterSlug ? UniverseCodex.getEntriesForSlug(currentChapterSlug) : [];
    codexEntryMap = new Map(currentCodexEntries.map((entry) => [entry.id, entry]));
    codexTermMatchers = buildCodexTermMatchers(currentCodexEntries);
    applyCodexMentions();
    if (refreshUI) {
      refreshAnnotationsUI();
    } else {
      updateAnnotationBadge(currentChapterSlug);
    }
  }

  function buildCodexTermMatchers(entries) {
    if (!Array.isArray(entries) || !entries.length) {
      return [];
    }
    const matchers = [];
    const seen = new Set();
    entries.forEach((entry) => {
      if (!Array.isArray(entry.terms)) return;
      entry.terms.forEach((term) => {
        const safeTerm = typeof term === "string" ? term.trim() : "";
        if (!safeTerm) return;
        const key = `${entry.id}::${safeTerm}`;
        if (seen.has(key)) return;
        seen.add(key);
        const lower = safeTerm.toLowerCase();
        matchers.push({
          term: safeTerm,
          termLower: lower,
          entryId: entry.id,
          length: safeTerm.length,
          requiresBoundary: /[a-zA-Z]/.test(safeTerm)
        });
      });
    });
    matchers.sort((a, b) => b.length - a.length || a.term.localeCompare(b.term, "zh-Hans"));
    return matchers;
  }

  function clearCodexMentions() {
    codexMentionElements.forEach((element) => {
      const textContent = element.textContent || "";
      if (element.parentNode) {
        const textNode = document.createTextNode(textContent);
        element.parentNode.replaceChild(textNode, element);
      }
    });
    codexMentionElements.clear();
  }

  function applyCodexMentions() {
    if (!article || !codexTermMatchers.length) {
      return;
    }

    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node || typeof node.nodeValue !== "string") {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest("[data-codex-mention]")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest("button, a, mark.hl, code, pre, textarea")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((textNode) => {
      const text = textNode.nodeValue;
      const matches = findCodexMatchesInText(text);
      if (!matches.length) {
        return;
      }
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      matches.forEach((match) => {
        if (match.start > cursor) {
          fragment.appendChild(document.createTextNode(text.slice(cursor, match.start)));
        }
        const entry = codexEntryMap.get(match.entryId);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "codex-term";
        button.dataset.codexId = match.entryId;
        button.dataset.codexTerm = match.term;
        button.setAttribute("data-codex-mention", "true");
        button.setAttribute("aria-haspopup", "dialog");
        button.textContent = match.term;
        if (entry) {
          const typeLabel = UniverseCodex.getTypeLabel(entry.type);
          button.setAttribute("aria-label", `${entry.name} · ${typeLabel}`);
        }
        button.addEventListener("click", handleCodexTermClick);
        button.addEventListener("keydown", handleCodexTermKeydown);
        codexMentionElements.add(button);
        fragment.appendChild(button);
        cursor = match.end;
      });
      if (cursor < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(cursor)));
      }
      textNode.parentNode?.replaceChild(fragment, textNode);
    });
  }

  function findCodexMatchesInText(text) {
    if (!text || !codexTermMatchers.length) {
      return [];
    }
    const matches = [];
    const lowerText = text.toLowerCase();

    codexTermMatchers.forEach((matcher) => {
      let fromIndex = 0;
      while (fromIndex <= lowerText.length) {
        const index = lowerText.indexOf(matcher.termLower, fromIndex);
        if (index === -1) break;
        const end = index + matcher.length;

        const overlaps = matches.some((existing) => index < existing.end && end > existing.start);
        if (overlaps) {
          fromIndex = end;
          continue;
        }

        if (matcher.requiresBoundary) {
          const prevChar = lowerText[index - 1];
          const nextChar = lowerText[end];
          if ((prevChar && /\w/.test(prevChar)) || (nextChar && /\w/.test(nextChar))) {
            fromIndex = end;
            continue;
          }
        }

        matches.push({
          start: index,
          end,
          term: text.slice(index, end),
          entryId: matcher.entryId
        });
        fromIndex = end;
      }
    });

    matches.sort((a, b) => a.start - b.start);
    return matches;
  }

  function handleCodexTermClick(event) {
    const target = event.currentTarget;
    if (!target || typeof target !== "object") return;
    const codexId = target.dataset.codexId;
    if (!codexId) return;
    event.preventDefault();
    if (codexPopoverVisible && codexPopover?.dataset.codexId === codexId) {
      closeCodexPopover({ restoreFocus: false });
      return;
    }
    openCodexPopover(codexId, target);
  }

  function handleCodexTermKeydown(event) {
    if (!event) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCodexTermClick(event);
    }
  }

  function openCodexPopover(entryId, trigger) {
    if (!codexPopover) return;
    const entry = codexEntryMap.get(entryId);
    if (!entry) return;

    if (activeCodexTrigger && activeCodexTrigger !== trigger) {
      activeCodexTrigger.classList.remove("is-active");
    }

    populateCodexPopover(entry);
    codexPopover.dataset.codexId = entryId;
    codexPopover.classList.add("is-visible");
    codexPopover.setAttribute("aria-hidden", "false");
    codexPopoverVisible = true;
    activeCodexTrigger = trigger || null;
    if (activeCodexTrigger) {
      activeCodexTrigger.classList.add("is-active");
    }

    const stageRect = stage.getBoundingClientRect();
    const triggerRect = trigger ? trigger.getBoundingClientRect() : null;
    const popoverWidth = codexPopover.offsetWidth || 320;
    const stageWidth = stageRect.width;
    let top = 0;
    let left = 0;

    if (triggerRect) {
      top = triggerRect.top - stageRect.top + scrollContainer.scrollTop - codexPopover.offsetHeight - 16;
      left = triggerRect.left - stageRect.left + triggerRect.width / 2 - popoverWidth / 2;
    } else {
      top = scrollContainer.scrollTop + 32;
      left = (stageWidth - popoverWidth) / 2;
    }

    const maxTop = scrollContainer.scrollHeight - codexPopover.offsetHeight - 24;
    top = Math.max(16, Math.min(top, maxTop));
    left = Math.max(16, Math.min(left, stageWidth - popoverWidth - 16));

    codexPopover.style.top = `${top}px`;
    codexPopover.style.left = `${left}px`;

    setChromeVisible(true, { force: true });
  }

  function populateCodexPopover(entry) {
    if (!codexPopover) return;
    if (codexPopoverTag) {
      codexPopoverTag.textContent = UniverseCodex.getTypeLabel(entry.type);
      codexPopoverTag.hidden = !codexPopoverTag.textContent;
    }
    if (codexPopoverTitle) {
      codexPopoverTitle.textContent = entry.name || "";
    }
    if (codexPopoverSummary) {
      codexPopoverSummary.textContent = entry.summary || "";
      codexPopoverSummary.hidden = !entry.summary;
    }

    if (codexPopoverDetails) {
      codexPopoverDetails.innerHTML = "";
      if (Array.isArray(entry.details) && entry.details.length) {
        entry.details.forEach((item) => {
          const li = document.createElement("li");
          li.className = "codex-popover__detail";
          if (item.label) {
            const label = document.createElement("strong");
            label.textContent = item.label;
            li.appendChild(label);
          }
          if (item.value) {
            const span = document.createElement("span");
            span.textContent = item.value;
            li.appendChild(span);
          }
          codexPopoverDetails.appendChild(li);
        });
        codexPopoverDetails.hidden = false;
      } else {
        codexPopoverDetails.hidden = true;
      }
    }

    if (codexPopoverTimeline) {
      codexPopoverTimeline.innerHTML = "";
      if (Array.isArray(entry.timeline) && entry.timeline.length) {
        entry.timeline.forEach((item) => {
          const li = document.createElement("li");
          li.className = "codex-popover__timeline-item";
          if (item.label) {
            const label = document.createElement("span");
            label.className = "codex-popover__timeline-label";
            label.textContent = item.label;
            li.appendChild(label);
          }
          if (item.value) {
            const desc = document.createElement("p");
            desc.textContent = item.value;
            li.appendChild(desc);
          }
          codexPopoverTimeline.appendChild(li);
        });
        codexPopoverTimeline.hidden = false;
      } else {
        codexPopoverTimeline.hidden = true;
      }
    }

    if (codexPopoverTags) {
      codexPopoverTags.innerHTML = "";
      if (Array.isArray(entry.tags) && entry.tags.length) {
        entry.tags.forEach((tag) => {
          const chip = document.createElement("span");
          chip.className = "codex-popover__tag";
          chip.textContent = tag;
          codexPopoverTags.appendChild(chip);
        });
        codexPopoverTags.hidden = false;
      } else {
        codexPopoverTags.hidden = true;
      }
    }
  }

  function closeCodexPopover({ restoreFocus = false } = {}) {
    if (!codexPopoverVisible || !codexPopover) return;
    codexPopover.classList.remove("is-visible");
    codexPopover.setAttribute("aria-hidden", "true");
    codexPopover.style.top = "";
    codexPopover.style.left = "";
    codexPopoverVisible = false;
    const trigger = activeCodexTrigger;
    activeCodexTrigger = null;
    trigger?.classList.remove("is-active");
    if (restoreFocus && trigger && typeof trigger.focus === "function") {
      trigger.focus({ preventScroll: true });
    }
  }

  function renderCodexList() {
    if (!annotationList) return;
    annotationList.innerHTML = "";
    annotationList.setAttribute("role", "list");

    if (!currentCodexEntries.length) {
      const empty = document.createElement("div");
      empty.className = "annotations-empty annotations-empty--codex";
      empty.textContent = Strings?.codex?.empty || "本章暂未收录世界观条目";
      annotationList.appendChild(empty);
      return;
    }

    const typeOrder = ["character", "location", "concept", "timeline", "artifact"];
    const sorted = currentCodexEntries.slice().sort((a, b) => {
      const typeRankA = typeOrder.indexOf(a.type) === -1 ? typeOrder.length : typeOrder.indexOf(a.type);
      const typeRankB = typeOrder.indexOf(b.type) === -1 ? typeOrder.length : typeOrder.indexOf(b.type);
      if (typeRankA !== typeRankB) {
        return typeRankA - typeRankB;
      }
      return a.name.localeCompare(b.name, "zh-Hans");
    });

    sorted.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "codex-card";
      card.dataset.codexId = entry.id;
      card.setAttribute("role", "listitem");

      const header = document.createElement("header");
      header.className = "codex-card__header";
      const badge = document.createElement("span");
      badge.className = "codex-card__badge";
      badge.textContent = UniverseCodex.getTypeLabel(entry.type);
      header.appendChild(badge);

      const title = document.createElement("h3");
      title.className = "codex-card__title";
      title.textContent = entry.name;
      header.appendChild(title);

      if (entry.origin === "user") {
        const origin = document.createElement("span");
        origin.className = "codex-card__origin";
        origin.textContent = Strings?.codex?.origin?.user || "本地草稿";
        header.appendChild(origin);
      }

      card.appendChild(header);

      if (entry.summary) {
        const summary = document.createElement("p");
        summary.className = "codex-card__summary";
        summary.textContent = entry.summary;
        card.appendChild(summary);
      }

      if (Array.isArray(entry.details) && entry.details.length) {
        const detailList = document.createElement("dl");
        detailList.className = "codex-card__details";
        entry.details.forEach((detail) => {
          const dt = document.createElement("dt");
          dt.textContent = detail.label;
          const dd = document.createElement("dd");
          dd.textContent = detail.value;
          detailList.appendChild(dt);
          detailList.appendChild(dd);
        });
        card.appendChild(detailList);
      }

      if (Array.isArray(entry.timeline) && entry.timeline.length) {
        const timeline = document.createElement("ul");
        timeline.className = "codex-card__timeline";
        entry.timeline.forEach((event) => {
          const li = document.createElement("li");
          const label = document.createElement("span");
          label.className = "codex-card__timeline-label";
          label.textContent = event.label;
          const value = document.createElement("p");
          value.textContent = event.value;
          li.appendChild(label);
          li.appendChild(value);
          timeline.appendChild(li);
        });
        card.appendChild(timeline);
      }

      if (Array.isArray(entry.tags) && entry.tags.length) {
        const tags = document.createElement("div");
        tags.className = "codex-card__tags";
        entry.tags.forEach((tag) => {
          const chip = document.createElement("span");
          chip.textContent = tag;
          tags.appendChild(chip);
        });
        card.appendChild(tags);
      }

      const footer = document.createElement("footer");
      footer.className = "codex-card__footer";
      const locateButton = document.createElement("button");
      locateButton.type = "button";
      locateButton.dataset.action = "codex-jump";
      locateButton.dataset.codexId = entry.id;
      locateButton.className = "codex-card__jump";
      locateButton.textContent = Strings?.codex?.jump || "定位正文";
      footer.appendChild(locateButton);
      card.appendChild(footer);

      annotationList.appendChild(card);
    });
  }

  function jumpToCodexMention(entryId) {
    if (!entryId || !article) {
      return false;
    }
    const mention = article.querySelector(`[data-codex-id="${entryId}"]`);
    if (!mention) {
      showToast(Strings?.codex?.noMention || "该条目在正文中暂未出现。");
      return false;
    }
    mention.classList.add("is-focused");
    mention.scrollIntoView({ behavior: "smooth", block: "center" });
    openCodexPopover(entryId, mention);
    setTimeout(() => {
      mention.classList.remove("is-focused");
    }, 2200);
    return true;
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
    updateBookProgress(value);
  }

  function updateBookProgress(chapterProgress) {
    if (!progressBar || !progressFill) return;
    const bookProgress = computeBookProgress(chapterProgress);
    const safeBookProgress = Math.min(Math.max(Number(bookProgress) || 0, 0), 1);
    const percent = Math.round(safeBookProgress * 100);
    progressFill.style.width = `${safeBookProgress * 100}%`;
    progressBar.setAttribute("aria-valuenow", `${percent}`);
    progressBar.setAttribute("aria-valuetext", `已阅读 ${percent}%`);
    if (progressLabel) {
      progressLabel.textContent = `${percent}%`;
    }
  }

  function computeBookProgress(chapterProgress) {
    const safeChapterProgress = Math.min(Math.max(Number(chapterProgress) || 0, 0), 1);
    if (totalChapters <= 0) {
      return safeChapterProgress;
    }
    const safeIndex = Math.max(0, Math.min(Number(currentChapterIndex) || 0, totalChapters - 1));
    if (!chapterWordTotals.length || totalBookWords <= 0) {
      const normalized =
        totalChapters > 0 ? (safeIndex + safeChapterProgress) / totalChapters : safeChapterProgress;
      return Math.min(Math.max(normalized, 0), 1);
    }
    const wordsBefore = safeIndex > 0 ? cumulativeChapterWords[safeIndex - 1] || 0 : 0;
    const currentChapterWords = chapterWordTotals[safeIndex] || 0;
    const absoluteWords = wordsBefore + currentChapterWords * safeChapterProgress;
    const ratio = totalBookWords > 0 ? absoluteWords / totalBookWords : 0;
    return Math.min(Math.max(ratio, 0), 1);
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
    closeCodexPopover({ restoreFocus: false });
    annotationDrawer.classList.add("is-open");
    annotationDrawer.setAttribute("aria-hidden", "false");
    annotationsButton?.setAttribute("aria-expanded", "true");
    annotationsButton?.classList.add("is-active");
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
    annotationsButton?.classList.remove("is-active");
    drawerOpen = false;
    body.classList.remove("drawer-open");
  }

  function renderAnnotationsDrawer(countsFromCaller) {
    if (!annotationList || !annotationsController || !currentChapterSlug) return;
    const counts = countsFromCaller || updateAnnotationBadge(currentChapterSlug);
    const bookmarkItems = counts.bookmarks;
    const highlightItems = counts.highlights;

    if (annotationDrawerTitle) {
      if (currentAnnotationsTab === "codex") {
        annotationDrawerTitle.textContent = Strings?.codex?.drawerTitle || "世界观手册";
      } else {
        const currentChapter = chapters[currentChapterIndex];
        annotationDrawerTitle.textContent = currentChapter?.title || "标注";
      }
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

    if (currentAnnotationsTab === "codex") {
      renderCodexList();
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
    if (!annotationsController || !slug) {
      return { bookmarks: [], highlights: [], codex: currentCodexEntries };
    }
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
    if (drawerCountBadges.codex) {
      drawerCountBadges.codex.textContent = currentCodexEntries.length;
    }
    return { bookmarks, highlights, codex: currentCodexEntries };
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

  function updateFontSliderVisual(value) {
    const sliders = [];
    if (fontSlider) sliders.push(fontSlider);
    if (settingsFontSlider && !sliders.includes(settingsFontSlider)) sliders.push(settingsFontSlider);
    if (!sliders.length) return;
    const min = Number(fontSlider?.min) || Number(settingsFontSlider?.min) || 16;
    const max = Number(fontSlider?.max) || Number(settingsFontSlider?.max) || 28;
    const clamped = Math.min(Math.max(Number(value) || min, min), max);
    const percent = ((clamped - min) / (max - min || 1)) * 100;
    const theme = body.dataset.readerTheme || readerSettings.theme || "sepia";
    let startColor = "rgba(124,58,237,0.6)";
    let midColor = "rgba(236,196,121,0.6)";
    let endColor = "rgba(226,232,240,0.35)";
    if (theme === "night") {
      startColor = "rgba(59,130,246,0.6)";
      midColor = "rgba(147,197,253,0.6)";
      endColor = "rgba(30,41,59,0.55)";
    } else if (theme === "day") {
      startColor = "rgba(96,165,250,0.5)";
      midColor = "rgba(165,180,252,0.55)";
      endColor = "rgba(226,232,240,0.45)";
    } else if (theme === "sepia") {
      startColor = "rgba(186,142,96,0.55)";
      midColor = "rgba(224,180,110,0.6)";
      endColor = "rgba(224,200,166,0.4)";
    } else if (theme === "mint") {
      startColor = "rgba(94,180,142,0.5)";
      midColor = "rgba(178,230,201,0.6)";
      endColor = "rgba(210,236,223,0.4)";
    } else if (theme === "ink") {
      startColor = "rgba(56,189,248,0.55)";
      midColor = "rgba(125,211,252,0.55)";
      endColor = "rgba(22,32,48,0.6)";
    }
    const gradient = `linear-gradient(90deg, ${startColor} 0%, ${midColor} ${percent}%, ${endColor} ${percent}%, ${endColor} 100%)`;
    sliders.forEach((slider) => {
      slider.style.background = gradient;
    });
  }

  function updateQuickThemeLabel() {
    const quickThemeButton = document.querySelector(".quick-item[data-quick='theme']");
    if (!quickThemeButton) return;
    const label = quickThemeButton.querySelector(".quick-item__label");
    if (!label) return;
    const theme = readerSettings.theme || "sepia";
    const labelText = THEME_LABELS[theme] || THEME_LABELS.sepia;
    const isDark = theme === "night" || theme === "ink";
    quickThemeButton.classList.toggle("is-day", !isDark);
    label.textContent = labelText;
  }

  function applyReaderSettings() {
    if (scrollContainer) {
      scrollContainer.style.fontSize = `${readerSettings.fontSize}px`;
      const lineHeight = Number(readerSettings.lineHeight) || 1.8;
      scrollContainer.style.lineHeight = lineHeight;
    }
    const selectedFont = readerSettings.font === "sans" ? "sans" : "serif";
    readerSettings.font = selectedFont;
    if (article) {
      article.style.fontFamily = FONT_STACKS[selectedFont] || FONT_STACKS.serif;
    }
    const theme = readerSettings.theme || "sepia";
    body.dataset.readerTheme = theme;
    updateFontSliderVisual(readerSettings.fontSize);
    updateQuickThemeLabel();
    updateSettingsFontControls();
  }

  function persistReaderSettings() {
    ReaderSettingsStore.save({
      fontSize: Math.min(Math.max(Number(readerSettings.fontSize) || 20, 16), 28),
      lineHeight: Number(readerSettings.lineHeight) || 1.8,
      theme: readerSettings.theme || "sepia",
      font: readerSettings.font === "sans" ? "sans" : "serif"
    });
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
      updateFontSliderVisual(readerSettings.fontSize);
    }
  }

  function isSettingsOpen() {
    return settingsDrawer?.getAttribute("aria-hidden") === "false";
  }

  function toggleSettingsDrawer(forceOpen) {
    if (!settingsDrawer || !settingsPanel) return;
    const shouldOpen = forceOpen ?? settingsDrawer.getAttribute("aria-hidden") !== "false";
    settingsDrawer.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    settingsQuickButton?.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    settingsQuickButton?.classList.toggle("is-active", shouldOpen);
    if (shouldOpen) {
      if (!lastSettingsTrigger) {
        lastSettingsTrigger = settingsQuickButton;
      }
      settingsPanel.focus({ preventScroll: true });
      updateSettingsFontControls();
      swatchButtons?.forEach((btn) => {
        btn.setAttribute("aria-pressed", btn.dataset.theme === readerSettings.theme ? "true" : "false");
      });
      lineHeightButtons?.forEach((btn) => {
        btn.setAttribute(
          "aria-pressed",
          Number(btn.dataset.lineHeight) === Number(readerSettings.lineHeight) ? "true" : "false"
        );
      });
      const usingSans = readerSettings.font === "sans";
      fontButtons?.forEach((btn) => {
        const isSans = btn.dataset.font === "sans";
        btn.setAttribute("aria-pressed", isSans === usingSans ? "true" : "false");
      });
    }
  }

  function closeSettingsDrawer() {
    toggleSettingsDrawer(false);
    if (lastSettingsTrigger) {
      lastSettingsTrigger.focus({ preventScroll: true });
      lastSettingsTrigger = null;
    }
  }

  function updateSettingsFontControls() {
    if (!settingsFontValue || !settingsFontSlider) return;
    const value = Math.round(readerSettings.fontSize);
    settingsFontValue.textContent = `${value}px`;
    settingsFontSlider.value = String(value);
    updateFontSliderVisual(value);
    lineHeightButtons?.forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        Number(btn.dataset.lineHeight) === Number(readerSettings.lineHeight) ? "true" : "false"
      );
    });
    swatchButtons?.forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.theme === readerSettings.theme ? "true" : "false");
    });
    const usingSans = readerSettings.font === "sans";
    fontButtons?.forEach((btn) => {
      const isSans = btn.dataset.font === "sans";
      btn.setAttribute("aria-pressed", isSans === usingSans ? "true" : "false");
    });
  }

  function loadReaderSettings() {
    const stored = ReaderSettingsStore.load();
    if (stored && typeof stored === "object") {
      return {
        fontSize: Math.min(Math.max(Number(stored.fontSize) || 20, 16), 28),
        lineHeight: Number(stored.lineHeight) || 1.8,
        theme: stored.theme || "sepia",
        font: stored.font === "sans" ? "sans" : "serif"
      };
    }
    return { fontSize: 20, lineHeight: 1.8, theme: "sepia", font: "serif" };
  }

  function setChromeVisible(visible, { force = false } = {}) {
    if (!force && !visible && (drawerOpen || highlightPopoverVisible || codexPopoverVisible)) {
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

  function themeLabel(theme) {
    return THEME_LABELS[theme] || THEME_LABELS.sepia;
  }

}
