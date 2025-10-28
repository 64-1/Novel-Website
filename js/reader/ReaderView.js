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

export function createReaderView({ readerContainer, modalContainer, readerTracker, modalTracker } = {}) {
  function render(index) {
    const chapter = ChaptersRepo.getByIndex(index);
    if (!chapter) {
      return null;
    }

    if (readerContainer) {
      renderChapterContent(readerContainer, chapter, { includeSummary: false });
    }
    if (modalContainer) {
      renderChapterContent(modalContainer, chapter, { includeSummary: true });
    }

    if (readerTracker && typeof readerTracker.onChapterRendered === "function") {
      readerTracker.onChapterRendered(chapter.slug);
    }
    if (modalTracker && typeof modalTracker.onChapterRendered === "function") {
      modalTracker.onChapterRendered(chapter.slug);
    }

    return chapter;
  }

  return {
    render
  };
}

const ReaderView = {
  createReaderView,
  formatReadingTime
};

export default ReaderView;
