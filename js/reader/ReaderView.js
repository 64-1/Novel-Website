import ChaptersRepo from "../services/ChaptersRepo.js";

export function formatReadingTime(minutes, words) {
  const safeMinutes = Math.max(1, Math.round(minutes || 1));
  const safeWords = Math.max(0, Math.round(words || 0));
  const wordSuffix = safeWords ? ` · ${safeWords} 字` : "";
  return `≈ ${safeMinutes} 分钟读完${wordSuffix}`;
}

function renderParagraph(target, paragraph) {
  if (!target) return;
  if (typeof paragraph === "string") {
    const p = document.createElement("p");
    p.textContent = paragraph;
    target.appendChild(p);
    return;
  }
  if (paragraph && paragraph.type === "blockquote" && typeof paragraph.text === "string") {
    const block = document.createElement("blockquote");
    block.textContent = paragraph.text;
    target.appendChild(block);
    return;
  }
  if (paragraph && typeof paragraph.text === "string") {
    const p = document.createElement("p");
    p.textContent = paragraph.text;
    target.appendChild(p);
  }
}

function renderChapterContent(target, chapter, { includeSummary = false } = {}) {
  if (!target || !chapter) return;
  target.innerHTML = "";
  target.dataset.slug = chapter.slug;

  const title = document.createElement("h3");
  title.textContent = chapter.title;
  target.appendChild(title);

  const stats = ChaptersRepo.getStats(chapter);
  const readingMeta = document.createElement("div");
  readingMeta.className = "reading-meta";
  const timeBadge = document.createElement("span");
  timeBadge.className = "reading-time";
  timeBadge.textContent = formatReadingTime(stats.minutes, stats.words);
  readingMeta.appendChild(timeBadge);
  target.appendChild(readingMeta);

  if (includeSummary && chapter.summary) {
    const summary = document.createElement("p");
    summary.className = "chapter-summary";
    summary.textContent = chapter.summary;
    target.appendChild(summary);
  }

  chapter.paragraphs.forEach((paragraph) => renderParagraph(target, paragraph));
}

const MAX_CACHE_SIZE = 2;

export function createReaderView({ readerContainer, modalContainer, readerTracker, modalTracker } = {}) {
  const fragmentCache = new Map();

  function cacheFragments(slug, fragments) {
    if (!slug) return;
    if (fragmentCache.has(slug)) {
      fragmentCache.delete(slug);
    }
    fragmentCache.set(slug, fragments);
    enforceCacheLimit();
  }

  function enforceCacheLimit() {
    while (fragmentCache.size > MAX_CACHE_SIZE) {
      const oldestKey = fragmentCache.keys().next().value;
      fragmentCache.delete(oldestKey);
    }
  }

  function takeCachedFragments(slug) {
    if (!slug) return null;
    if (!fragmentCache.has(slug)) {
      return null;
    }
    const fragments = fragmentCache.get(slug);
    fragmentCache.delete(slug);
    return fragments;
  }

  function prepare(target) {
    const index =
      typeof target === "number"
        ? target
        : ChaptersRepo.getIndexBySlug(target);
    if (!Number.isFinite(index) || index < 0) {
      return false;
    }
    const chapter = ChaptersRepo.getByIndex(index);
    if (!chapter) {
      return false;
    }
    const fragments = {
      readerFragment: readerContainer ? buildFragment(chapter, { includeSummary: false }) : null,
      modalFragment: modalContainer ? buildFragment(chapter, { includeSummary: true }) : null
    };
    if (!fragments.readerFragment && !fragments.modalFragment) {
      return false;
    }
    cacheFragments(chapter.slug, fragments);
    return true;
  }

  function buildFragment(chapter, options) {
    const wrapper = document.createElement("div");
    renderChapterContent(wrapper, chapter, options);
    const fragment = document.createDocumentFragment();
    while (wrapper.firstChild) {
      fragment.appendChild(wrapper.firstChild);
    }
    return fragment;
  }

  function render(index) {
    const chapter = ChaptersRepo.getByIndex(index);
    if (!chapter) {
      return null;
    }

    const cached = takeCachedFragments(chapter.slug);

    if (readerContainer) {
      readerContainer.innerHTML = "";
      readerContainer.dataset.slug = chapter.slug;
      if (cached && cached.readerFragment) {
        readerContainer.appendChild(cached.readerFragment);
      } else {
        renderChapterContent(readerContainer, chapter, { includeSummary: false });
      }
    }

    if (modalContainer) {
      modalContainer.innerHTML = "";
      modalContainer.dataset.slug = chapter.slug;
      if (cached && cached.modalFragment) {
        modalContainer.appendChild(cached.modalFragment);
      } else {
        renderChapterContent(modalContainer, chapter, { includeSummary: true });
      }
    }

    if (readerTracker && typeof readerTracker.onChapterRendered === "function") {
      readerTracker.onChapterRendered(chapter.slug);
    }
    if (modalTracker && typeof modalTracker.onChapterRendered === "function") {
      modalTracker.onChapterRendered(chapter.slug);
    }

    return chapter;
  }

  function clearCache() {
    fragmentCache.clear();
  }

  return {
    render,
    prepare,
    clearCache
  };
}

const ReaderView = {
  createReaderView,
  formatReadingTime
};

export default ReaderView;
