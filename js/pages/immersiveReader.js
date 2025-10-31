import { LastReadStore, AnnotationStore } from "../services/Stores.js";
import ChaptersRepo from "../services/ChaptersRepo.js";
import ThemeService from "../services/ThemeService.js";
import { createTracker } from "../reader/ProgressTracker.js";
import { createReaderView } from "../reader/ReaderView.js";
import { createAnnotations } from "../reader/Annotations.js";
import Strings from "../strings.js";
import { createReaderSettingsController } from "./immersiveReader/ReaderSettingsController.js";
import { createChromeController } from "./immersiveReader/ChromeController.js";
import { createToastController } from "./immersiveReader/ToastController.js";
import { createDrawerController } from "./immersiveReader/DrawerController.js";
import { createPopoverController } from "./immersiveReader/PopoverController.js";
import { createNavigationController } from "./immersiveReader/NavigationController.js";
import { copyToClipboard, populateHighlightSnippets } from "./immersiveReader/utils.js";

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

  const settingsController = createReaderSettingsController({ scrollContainer, body });
  settingsController.apply();
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

  const chromeController = createChromeController({ body, chromeElements });
  const toastController = createToastController({ toastElement: toastEl });
  const navigationController = createNavigationController();

  const drawerController = createDrawerController({
    drawer: annotationDrawer,
    drawerPanel: annotationDrawerPanel,
    annotationList,
    annotationsButton,
    drawerCountBadges,
    drawerTitle: annotationDrawerTitle,
    body,
    onOpen: () => {
      chromeController.setDrawerState(true);
      chromeController.setVisible(true, { force: true });
    },
    onClose: () => {
      chromeController.setDrawerState(false);
    }
  });

  const popoverController = createPopoverController({
    popover: highlightPopover,
    stage,
    scrollContainer,
    onShow: () => {
      chromeController.setPopoverState(true);
      chromeController.setVisible(true, { force: true });
    },
    onHide: () => {
      chromeController.setPopoverState(false);
    }
  });

  await ChaptersRepo.load();
  const chapters = ChaptersRepo.list();
  if (!Array.isArray(chapters) || !chapters.length) {
    throw new Error("未找到章节内容");
  }

  let currentChapterIndex = resolveInitialIndex(chapters);
  let currentChapterSlug = null;
  let lastBookmarkKeyTime = 0;
  let annotationUnsubscribe = null;

  stage.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    if (drawerController.isOpen() || popoverController.isVisible()) return;
    if (event.target.closest("[data-chrome-surface]")) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    chromeController.setVisible(!body.classList.contains("chrome-open"));
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = button.dataset.readerTheme || "sepia";
      if (settingsController.setTheme(theme)) {
        updateThemeButtons();
      }
    });
  });

  fontSlider?.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    settingsController.setFontSize(value);
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
    const shareUrl = navigationController.buildShareUrl(currentChapterSlug);
    const shareData = {
      title: chapter?.title || Strings.meta.siteName,
      text: Strings.meta.defaultDescription,
      url: shareUrl
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        copyToClipboard(shareUrl);
        toastController.show("链接已复制");
      });
    } else {
      copyToClipboard(shareUrl);
      toastController.show("链接已复制");
    }
  });

  annotationsButton?.addEventListener("click", () => {
    drawerController.toggle();
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
    popoverController.cancelHide();

    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      selection.rangeCount === 0 ||
      !article.contains(selection.anchorNode) ||
      !article.contains(selection.focusNode)
    ) {
      popoverController.hide();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range || range.collapsed) {
      popoverController.hide();
      return;
    }

    popoverController.show(range);
  }

  scrollContainer.addEventListener("mouseup", handleSelectionPopover);
  scrollContainer.addEventListener("touchend", handleSelectionPopover);

  document.addEventListener("selectionchange", () => {
    if (!popoverController.isVisible()) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      popoverController.scheduleHide(80);
    }
  });

  document.addEventListener("mousedown", (event) => {
    if (!popoverController.isVisible()) return;
    if (!highlightPopover.contains(event.target)) {
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          popoverController.hide();
        }
      }, 20);
    }
  });

  window.addEventListener("resize", () => {
    if (popoverController.isVisible()) {
      popoverController.hide();
    }
  });

  scrollContainer.addEventListener("scroll", () => {
    if (popoverController.isVisible()) {
      popoverController.hide();
    }
  });

  annotationBackdrop?.addEventListener("click", () => drawerController.close());
  annotationDrawer
    ?.querySelectorAll("[data-action='close-annotations']")
    .forEach((btn) => btn.addEventListener("click", () => drawerController.close()));

  annotationTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.annotationTab;
      if (!tabName) return;
      if (drawerController.setTab(tabName)) {
        annotationTabs.forEach((t) => t.classList.toggle("active", t === tab));
        annotationTabs.forEach((t) =>
          t.setAttribute("aria-selected", t.dataset.annotationTab === tabName ? "true" : "false")
        );
        if (drawerController.isOpen()) {
          renderAnnotationsDrawer();
        }
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
        toastController.show(Strings.annotations.removed);
        refreshAnnotationsUI();
      }
      return;
    }

    if (id.startsWith("bm_")) {
      const jumped = annotationsController.jumpToBookmark(id, scrollContainer);
      if (jumped) {
        drawerController.close();
      }
    } else if (id.startsWith("hl_")) {
      const jumped = annotationsController.jumpToHighlight(id);
      if (jumped) {
        drawerController.close();
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (drawerController.isOpen()) {
        drawerController.close();
        event.preventDefault();
        return;
      }
      if (popoverController.isVisible()) {
        popoverController.hide();
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
    const slug = navigationController.readSlugFromUrl();
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
  chromeController.setVisible(false, { force: true });

  function selectChapter(index, { updateUrl = true, preserveChrome = false } = {}) {
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = readerView.render(safeIndex);
    if (!chapter) {
      return false;
    }

    currentChapterIndex = safeIndex;
    currentChapterSlug = chapter.slug;

    if (!preserveChrome) {
      chromeController.setVisible(false, { force: true });
    }
    popoverController.hide();

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
    navigationController.updateDocumentMeta(chapter);
    LastReadStore.set({ slug: chapter.slug });

    if (updateUrl) {
      navigationController.pushUrlWithSlug(chapter.slug);
    }

    return true;
  }

  function refreshAnnotationsUI() {
    const counts = updateAnnotationBadge(currentChapterSlug);
    if (drawerController.isOpen()) {
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
      toastController.show(Strings.annotations.bookmarkFailed);
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
      toastController.show(Strings.annotations.bookmarkFailed);
      return;
    }
    const chapterNumber = currentChapterIndex + 1;
    const percentLabel = Math.round(percent * 100);
    refreshAnnotationsUI();
    toastController.show(
      Strings.annotations.fab?.bookmarkAdded
        ? Strings.annotations.fab.bookmarkAdded(chapterNumber, percentLabel)
        : Strings.annotations.addedBookmark
    );
  }

  function handleHighlightCreation(color) {
    if (!annotationsController || !currentChapterSlug) {
      toastController.show(Strings.annotations.highlightFailed);
      return;
    }
    const highlight = annotationsController.createHighlightFromSelection({
      slug: currentChapterSlug,
      color,
      note: ""
    });
    if (!highlight) {
      toastController.show(Strings.annotations.highlightFailed);
      return;
    }
    annotationsController.applyForChapter(currentChapterSlug);
    refreshAnnotationsUI();
    popoverController.hide();
    window.getSelection()?.removeAllRanges();
    toastController.show(Strings.annotations.addedHighlight);
  }

  function renderAnnotationsDrawer(countsFromCaller) {
    if (!annotationList || !annotationsController || !currentChapterSlug) return;
    const counts = countsFromCaller || updateAnnotationBadge(currentChapterSlug);
    const bookmarkItems = counts.bookmarks;
    const highlightItems = counts.highlights;

    const currentChapter = chapters[currentChapterIndex];
    drawerController.setTitle(currentChapter?.title || "标注");
    drawerController.clearList();

    const currentTab = drawerController.getCurrentTab();
    annotationTabs.forEach((tab) => {
      const tabName = tab.dataset.annotationTab;
      const isActive = tabName === currentTab;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    if (currentTab === "toc") {
      renderTocList();
      return;
    }

    const items = currentTab === "highlights" ? highlightItems : bookmarkItems;

    if (!items.length) {
      drawerController.renderEmpty(currentTab);
      return;
    }

    const listElement = drawerController.getListElement();
    items.forEach((item) => {
      const container = drawerController.renderAnnotationItem(item);
      listElement?.appendChild(container);
    });

    if (currentTab === "highlights" && highlightItems.length) {
      populateHighlightSnippets(highlightItems, article, annotationList);
    }
  }

  function renderTocList() {
    const listElement = drawerController.getListElement();
    if (!listElement) return;

    chapters.forEach((chapter, index) => {
      const button = drawerController.renderTocItem(chapter, index, index === currentChapterIndex, chapters.length);

      button.addEventListener("click", () => {
        if (index === currentChapterIndex) {
          drawerController.close();
          return;
        }
        selectChapter(index, { updateUrl: true, preserveChrome: true });
        drawerController.close();
      });

      listElement.appendChild(button);
    });
  }

  function updateAnnotationBadge(slug) {
    if (!annotationsController || !slug) return { bookmarks: [], highlights: [] };
    const { bookmarks, highlights } = annotationsController.list(slug);
    const total = bookmarks.length + highlights.length;
    if (annotationBadge) {
      annotationBadge.textContent = String(total);
      annotationBadge.hidden = total === 0;
    }
    drawerController.updateCounts({ bookmarks: bookmarks.length, highlights: highlights.length });
    return { bookmarks, highlights };
  }

  function updateThemeButtons() {
    const activeTheme = settingsController.settings.theme || "sepia";
    themeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.readerTheme === activeTheme);
    });
    if (themeGroup) {
      themeGroup.setAttribute("aria-label", `当前主题：${settingsController.getThemeLabel(activeTheme)}`);
    }
  }

  function updateFontDisplay() {
    if (fontDisplay) {
      fontDisplay.textContent = `${Math.round(settingsController.settings.fontSize)}px`;
    }
    if (fontSlider) {
      fontSlider.value = String(Math.round(settingsController.settings.fontSize));
    }
  }

  function resolveInitialIndex(chaptersList) {
    const { slug, source } = navigationController.readSlugInfo();
    if (slug) {
      const index = ChaptersRepo.getIndexBySlug(slug);
      if (Number.isInteger(index) && index >= 0) {
        if (source === "path") {
          const chapter = chaptersList[index];
          if (chapter) {
            navigationController.pushUrlWithSlug(chapter.slug);
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
}
