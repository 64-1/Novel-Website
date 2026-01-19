import { ProgressStore } from "../services/Stores.js";

function clampProgress(value) {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(Number(value) || 0, 0), 1);
}

export function createTracker({
  container,
  progressBar,
  progressFill,
  context = "reader",
  onProgress,
  renderProgress: renderProgressOverride,
  onPersist
} = {}) {
  if (!container || !progressBar || !progressFill) {
    return null;
  }

  let chapterSlug = null;
  let storedProgress = 0;
  let lastRun = 0;
  let trailingTimeout = null;
  const interval = 110;

  const onScroll = () => scheduleUpdate();
  container.addEventListener("scroll", onScroll, { passive: true });

  const onResize = () => refresh({ fromStorage: true });
  window.addEventListener("resize", onResize);

  let resizeObserver;
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => refresh());
    resizeObserver.observe(container);
  }

  function scheduleUpdate(force = false) {
    if (force) {
      clearTimeout(trailingTimeout);
      trailingTimeout = null;
      runUpdate();
      return;
    }
    const now = performance.now();
    const remaining = interval - (now - lastRun);
    if (remaining <= 0) {
      clearTimeout(trailingTimeout);
      trailingTimeout = null;
      runUpdate();
    } else if (!trailingTimeout) {
      trailingTimeout = window.setTimeout(() => {
        trailingTimeout = null;
        runUpdate();
      }, remaining);
    }
  }

  function runUpdate() {
    lastRun = performance.now();
    const progress = getProgressFromScroll();
    renderProgressInternal(progress);
    persistProgress(progress);
    notifyProgress(progress);
  }

  function getProgressFromScroll() {
    const { maxScroll, canScroll } = getScrollMetrics();
    if (!canScroll) {
      return 1;
    }
    const raw = maxScroll <= 0 ? 1 : container.scrollTop / maxScroll;
    return clampProgress(raw);
  }

  function getScrollMetrics() {
    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 1);
    const canScroll = container.scrollHeight - container.clientHeight > 0;
    return { maxScroll, canScroll };
  }

  function renderProgressInternal(progress) {
    const safeProgress = clampProgress(progress);
    if (typeof renderProgressOverride === "function") {
      renderProgressOverride(safeProgress, { progressBar, progressFill });
      return;
    }
    const percent = safeProgress * 100;
    progressFill.style.width = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", `${Math.round(percent)}`);
    progressBar.setAttribute("aria-valuetext", `已阅读 ${Math.round(percent)}%`);
  }

  function persistProgress(progress) {
    storedProgress = clampProgress(progress);
    if (ProgressStore && typeof ProgressStore.save === "function") {
      ProgressStore.save(chapterSlug, context, storedProgress);
    }
    if (typeof onPersist === "function" && chapterSlug) {
      const { maxScroll } = getScrollMetrics();
      onPersist({
        slug: chapterSlug,
        progress: storedProgress,
        scrollTop: container.scrollTop,
        maxScroll,
        context
      });
    }
  }

  function readStoredProgress() {
    if (!ProgressStore || typeof ProgressStore.load !== "function") {
      return 0;
    }
    return clampProgress(ProgressStore.load(chapterSlug, context));
  }

  function applyStoredScroll() {
    requestAnimationFrame(() => {
      const { maxScroll, canScroll } = getScrollMetrics();
      const targetProgress = canScroll ? storedProgress : 1;
      const targetScroll = canScroll ? targetProgress * maxScroll : 0;
      container.scrollTop = targetScroll;
      renderProgressInternal(targetProgress);
      notifyProgress(targetProgress);
      requestAnimationFrame(() => scheduleUpdate(true));
    });
  }

  function onChapterRendered(slug) {
    chapterSlug = slug;
    storedProgress = readStoredProgress();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyStoredScroll();
      });
    });
  }

  function refresh(options = {}) {
    const { fromStorage = false } = options;
    if (fromStorage) {
      storedProgress = readStoredProgress();
      applyStoredScroll();
    } else {
      scheduleUpdate(true);
    }
  }

  function notifyProgress(progress) {
    if (typeof onProgress === "function" && chapterSlug) {
      onProgress(clampProgress(progress), { slug: chapterSlug, context });
    }
  }

  return {
    onChapterRendered,
    refresh
  };
}

export default {
  createTracker
};
