import ApiClient from "./ApiClient.js";
import { AnnotationStore } from "./Stores.js";

function resolveBackendRefs(chapterMeta) {
  if (!chapterMeta || typeof chapterMeta !== "object") return null;
  const backend = chapterMeta.backend || {};
  const chapterId = backend.chapterId || chapterMeta.chapterId || chapterMeta._id || null;
  const bookId = backend.bookId || chapterMeta.bookId || (chapterMeta.book && chapterMeta.book.id) || null;
  if (!chapterId || !bookId) {
    return null;
  }
  return { chapterId, bookId };
}

function normalizeBookmark(data = {}, slug) {
  return {
    id: `bm_remote_${data.id || Date.now()}`,
    remoteId: data.id,
    slug,
    percent: Math.min(Math.max(Number(data.position) || 0, 0), 1),
    bookPercent: null,
    scrollTop: data.scrollPosition || null,
    snippet: data.snippet || "",
    note: "",
    createdAt: data.createdAt ? Date.parse(data.createdAt) : Date.now()
  };
}

function normalizeHighlight(data = {}, slug) {
  const range = data.rangeData || {};
  return {
    id: `hl_remote_${data.id || Date.now()}`,
    remoteId: data.id,
    slug,
    start: Number(range.start) || 0,
    end: Number(range.end) || 0,
    color: data.color || "ylw",
    note: data.note || "",
    selectedText: data.selectedText || "",
    createdAt: data.createdAt ? Date.parse(data.createdAt) : Date.now()
  };
}

export async function hydrateAnnotations({ slug, chapterMeta }) {
  if (!slug || !ApiClient.isAuthenticated()) {
    return;
  }
  try {
    const [bookmarkData, highlightData] = await Promise.all([
      ApiClient.getBookmarks({ chapterSlug: slug }),
      ApiClient.getHighlights(slug)
    ]);
    if (bookmarkData?.bookmarks) {
      AnnotationStore.setBookmarksForSlug(
        slug,
        bookmarkData.bookmarks.map((item) => normalizeBookmark(item, slug))
      );
    }
    if (highlightData?.highlights) {
      AnnotationStore.setHighlightsForSlug(
        slug,
        highlightData.highlights.map((item) => normalizeHighlight(item, slug))
      );
    }
  } catch (error) {
    console.warn("[AnnotationService] Failed to hydrate annotations", error);
  }
}

export async function createRemoteBookmark(bookmark, chapterMeta) {
  if (!bookmark || !ApiClient.isAuthenticated()) return;
  const refs = resolveBackendRefs(chapterMeta);
  if (!refs) return;
  try {
    const result = await ApiClient.createBookmark({
      chapterId: refs.chapterId,
      chapterSlug: bookmark.slug,
      position: bookmark.percent,
      scrollPosition: bookmark.scrollTop || 0
    });
    if (result?.bookmark?.id) {
      AnnotationStore.updateBookmark(bookmark.id, { remoteId: result.bookmark.id });
    }
  } catch (error) {
    console.warn("[AnnotationService] Failed to sync bookmark", error);
  }
}

export async function deleteRemoteBookmark(id, slug) {
  if (!ApiClient.isAuthenticated()) return;
  const bookmarks = AnnotationStore.getBookmarks(slug || "");
  const bookmark = bookmarks.find((bm) => bm.id === id);
  if (!bookmark?.remoteId) {
    return;
  }
  try {
    await ApiClient.deleteBookmark(bookmark.remoteId);
  } catch (error) {
    console.warn("[AnnotationService] Failed to delete remote bookmark", error);
  }
}

export async function createRemoteHighlight(highlight, chapterMeta) {
  if (!highlight || !ApiClient.isAuthenticated()) return;
  const refs = resolveBackendRefs(chapterMeta);
  if (!refs) return;
  try {
    const payload = {
      chapterId: refs.chapterId,
      chapterSlug: highlight.slug,
      color: highlight.color || "ylw",
      note: highlight.note || "",
      selectedText: highlight.selectedText || "",
      rangeData: {
        start: highlight.start,
        end: highlight.end
      }
    };
    const result = await ApiClient.createHighlight(payload);
    if (result?.highlight?.id) {
      AnnotationStore.updateHighlight(highlight.id, { remoteId: result.highlight.id });
    }
  } catch (error) {
    console.warn("[AnnotationService] Failed to sync highlight", error);
  }
}

export async function deleteRemoteHighlight(id, slug) {
  if (!ApiClient.isAuthenticated()) return;
  const highlights = AnnotationStore.getHighlights(slug || "");
  const highlight = highlights.find((hl) => hl.id === id);
  if (!highlight?.remoteId) {
    return;
  }
  try {
    await ApiClient.deleteHighlight(highlight.remoteId);
  } catch (error) {
    console.warn("[AnnotationService] Failed to delete remote highlight", error);
  }
}

export default {
  hydrateAnnotations,
  createRemoteBookmark,
  deleteRemoteBookmark,
  createRemoteHighlight,
  deleteRemoteHighlight
};
