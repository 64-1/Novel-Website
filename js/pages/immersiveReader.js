import { ReaderSettingsStore, LastReadStore } from "../services/Stores.js";
import ChaptersRepo from "../services/ChaptersRepo.js";
import ThemeService from "../services/ThemeService.js";
import { createTracker } from "../reader/ProgressTracker.js";
import { createReaderView } from "../reader/ReaderView.js";
import Strings from "../strings.js";

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

  await ChaptersRepo.load();
  const chapters = ChaptersRepo.list();
  if (!Array.isArray(chapters) || !chapters.length) {
    throw new Error("未找到章节内容");
  }

  let currentChapterIndex = resolveInitialIndex(chapters);

  selectChapter(currentChapterIndex, { updateUrl: false });
  setChromeVisible(false);

  stage.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
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
    const chapter = chapters[currentChapterIndex];
    if (!chapter) return;
    const shareUrl = buildShareUrl(chapter.slug);
    const shareData = {
      title: chapter.title,
      text: Strings?.share?.description || "我正在星海小说阅读这篇章节，一起来看看吧！",
      url: shareUrl
    };
    if (navigator.share) {
      navigator
        .share(shareData)
        .catch(() => {
          copyToClipboard(shareUrl);
        });
    } else {
      copyToClipboard(shareUrl);
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

  function selectChapter(index, options = {}) {
    const { updateUrl = true, preserveChrome = false } = options;
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = readerView.render(safeIndex);
    if (!chapter) {
      throw new Error(`无法渲染章节索引 ${safeIndex}`);
    }

    currentChapterIndex = safeIndex;
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

    if (!preserveChrome) {
      setChromeVisible(false);
    }

    updateNavButtons();
    updateDocumentMeta(chapter);
    LastReadStore.set({ slug: chapter.slug });

    if (updateUrl) {
      pushUrlWithSlug(chapter.slug);
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

  function setChromeVisible(visible) {
    body.classList.toggle("chrome-open", visible);
    chromeElements.forEach((element) => {
      element.hidden = !visible;
    });
  }

  function applyReaderSettings() {
    if (scrollContainer) {
      scrollContainer.style.fontSize = `${readerSettings.fontSize}px`;
      const lineHeight = Number(readerSettings.lineHeight) || 1.7;
      scrollContainer.style.lineHeight = lineHeight;
    }
    const theme = readerSettings.theme || "sepia";
    body.dataset.readerTheme = theme;
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

  function persistReaderSettings() {
    ReaderSettingsStore.save(readerSettings);
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
    let element = document.querySelector(`meta[${selector}]`);
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
}
