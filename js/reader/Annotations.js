import { buildTextMap } from "./TextMap.js";
import { escapeHtmlDom as escapeHtml } from "../utils/htmlSanitize.js";
import { LIMITS, TIMING } from "../utils/constants.js";

const MAX_HIGHLIGHTS_PER_CHAPTER = LIMITS.MAX_HIGHLIGHTS_PER_CHAPTER;

/**
 * Unwraps all highlight marks
 */
function unwrapHighlights(root) {
  const marks = root.querySelectorAll("mark.hl");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

/**
 * Creates the annotations controller
 */
export function createAnnotations({ articleEl, store, textMapBuilder = buildTextMap } = {}) {
  if (!articleEl) {
    throw new Error("createAnnotations requires articleEl");
  }
  if (!store) {
    throw new Error("createAnnotations requires store");
  }

  let currentSlug = null;
  let textMap = null;
  let appliedHighlights = new Map(); // id -> mark element

  /**
   * Builds or refreshes the text map
   */
  function refreshTextMap() {
    try {
      textMap = textMapBuilder(articleEl);
    } catch (error) {
      console.warn("[Annotations] Failed to build text map:", error);
      textMap = null;
    }
  }

  /**
   * Applies highlights for a chapter
   */
  function applyForChapter(slug) {
    if (!slug) {
      clearApplied();
      return 0;
    }

    currentSlug = slug;
    clearApplied();
    refreshTextMap();

    if (!textMap) {
      return 0;
    }

    const highlights = store.getHighlights(slug);
    if (!Array.isArray(highlights) || highlights.length === 0) {
      return 0;
    }

    // Cap highlights
    const highlightsToApply = highlights.slice(0, MAX_HIGHLIGHTS_PER_CHAPTER);
    let appliedCount = 0;

    // Apply highlights in reverse order to maintain offsets
    const sorted = highlightsToApply.slice().sort((a, b) => b.start - a.start);

    for (const hl of sorted) {
      if (typeof hl.start !== "number" || typeof hl.end !== "number" || hl.start >= hl.end) {
        continue;
      }

      const range = textMap.offsetsToRange(hl.start, hl.end);
      if (!range || range.collapsed) {
        continue;
      }

      try {
        const mark = document.createElement("mark");
        mark.className = `hl hl--${hl.color || "ylw"}`;
        mark.dataset.hlId = hl.id;
        mark.setAttribute("tabindex", "-1");
        mark.setAttribute("aria-label", `高亮: ${escapeHtml(hl.note || "")}`.trim() || "高亮");

        const contents = range.extractContents();
        mark.appendChild(contents);
        range.insertNode(mark);

        appliedHighlights.set(hl.id, mark);
        appliedCount++;
      } catch (error) {
        console.warn("[Annotations] Failed to apply highlight:", hl.id, error);
      }
    }

    return appliedCount;
  }

  /**
   * Clears all applied highlights
   */
  function clearApplied() {
    unwrapHighlights(articleEl);
    appliedHighlights.clear();
    currentSlug = null;
  }

  /**
   * Jumps to a highlight by ID
   */
  function jumpToHighlight(id) {
    if (!id || typeof id !== "string") return false;

    const mark = appliedHighlights.get(id) || articleEl.querySelector(`mark.hl[data-hl-id="${id}"]`);
    if (!mark) {
      return false;
    }

    // Remove current class from all
    articleEl.querySelectorAll("mark.hl.is-current").forEach((m) => {
      m.classList.remove("is-current");
    });

    mark.classList.add("is-current");
    mark.scrollIntoView({ behavior: "smooth", block: "center" });
    mark.focus({ preventScroll: true });

    // Remove current class after a delay
    setTimeout(() => {
      mark.classList.remove("is-current");
    }, TIMING.HIGHLIGHT_FLASH_DURATION);

    return true;
  }

  /**
   * Creates a highlight from current selection
   */
  function createHighlightFromSelection({ slug, color = "ylw", note = "" } = {}) {
    if (!slug || typeof slug !== "string") {
      return null;
    }

    refreshTextMap();
    if (!textMap) {
      return null;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    const range = selection.getRangeAt(0);
    if (!range || !articleEl.contains(range.commonAncestorContainer)) {
      return null;
    }

    const offsets = textMap.rangeToOffsets(range);
    if (!offsets || offsets.start >= offsets.end) {
      return null;
    }

    // Check for existing highlights at same location
    const existing = store.getHighlights(slug);
    const hasOverlap = existing.some((hl) => {
      return (
        (offsets.start >= hl.start && offsets.start < hl.end) ||
        (offsets.end > hl.start && offsets.end <= hl.end) ||
        (offsets.start <= hl.start && offsets.end >= hl.end)
      );
    });

    if (hasOverlap) {
      // Don't create duplicate highlights
      return null;
    }

    // Check highlight cap
    if (existing.length >= MAX_HIGHLIGHTS_PER_CHAPTER) {
      return null;
    }

    const id = `hl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const highlight = {
      id,
      slug,
      start: offsets.start,
      end: offsets.end,
      color,
      note: String(note || "").trim(),
      createdAt: Date.now()
    };

    if (!store.addHighlight(highlight)) {
      return null;
    }

    // Reapply highlights for this chapter (this will include the new one)
    if (slug === currentSlug) {
      applyForChapter(slug);
      // Jump to the new highlight
      setTimeout(() => {
        jumpToHighlight(id);
      }, 50);
    }

    return highlight;
  }

  /**
   * Creates a bookmark
   */
  function createBookmark({ slug, percent, scrollTop = null, note = "" } = {}) {
    if (!slug || typeof slug !== "string" || typeof percent !== "number" || percent < 0 || percent > 1) {
      return null;
    }

    const id = `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const bookmark = {
      id,
      slug,
      percent: Math.max(0, Math.min(1, percent)),
      scrollTop: typeof scrollTop === "number" ? scrollTop : null,
      note: String(note || "").trim(),
      createdAt: Date.now()
    };

    if (!store.addBookmark(bookmark)) {
      return null;
    }

    return bookmark;
  }

  /**
   * Lists all annotations for a chapter
   */
  function list(slug) {
    if (!slug || typeof slug !== "string") {
      return { bookmarks: [], highlights: [] };
    }

    return {
      bookmarks: store.getBookmarks(slug) || [],
      highlights: store.getHighlights(slug) || []
    };
  }

  /**
   * Removes an annotation by ID
   */
  function remove(id) {
    if (!id || typeof id !== "string") {
      return false;
    }

    const success = store.remove(id);
    if (success) {
      // If it's a highlight and currently applied, reapply to remove it
      if (id.startsWith("hl_") && currentSlug) {
        applyForChapter(currentSlug);
      }
    }

    return success;
  }

  /**
   * Jumps to a bookmark by ID
   */
  function jumpToBookmark(id, container) {
    if (!id || typeof id !== "string" || !container) return false;

    const bookmarks = store.getBookmarks(currentSlug || "");
    const bookmark = bookmarks.find((bm) => bm.id === id);
    if (!bookmark) {
      return false;
    }

    const { maxScroll, canScroll } = (() => {
      const max = Math.max(container.scrollHeight - container.clientHeight, 1);
      return { maxScroll: max, canScroll: container.scrollHeight - container.clientHeight > 0 };
    })();

    if (canScroll && bookmark.scrollTop !== null && bookmark.scrollTop >= 0) {
      // Use exact scroll position if available
      container.scrollTo({
        top: Math.min(bookmark.scrollTop, maxScroll),
        behavior: "smooth"
      });
    } else if (canScroll) {
      // Use percent
      const targetScroll = bookmark.percent * maxScroll;
      container.scrollTo({
        top: targetScroll,
        behavior: "smooth"
      });
    }

    return true;
  }

  return {
    applyForChapter,
    clearApplied,
    jumpToHighlight,
    createHighlightFromSelection,
    createBookmark,
    list,
    remove,
    jumpToBookmark
  };
}

export default {
  createAnnotations
};

