import ApiClient from "./ApiClient.js";
import { ProgressStore } from "./Stores.js";

const pendingHydrations = new Map();
const pendingUpdates = new Map();

function resolveBackendRefs(chapterMeta) {
  if (!chapterMeta || typeof chapterMeta !== "object") {
    return null;
  }
  const backend = chapterMeta.backend || {};
  const bookId =
    backend.bookId || chapterMeta.bookId || (chapterMeta.book && chapterMeta.book.id) || null;
  const chapterId =
    backend.chapterId ||
    chapterMeta.chapterId ||
    backend.id ||
    chapterMeta._id ||
    chapterMeta.id ||
    null;
  if (!bookId || !chapterId) {
    return null;
  }
  return { bookId, chapterId };
}

export async function hydrateChapterProgress(slug, chapterMeta, { context = "reader" } = {}) {
  if (!slug || !ApiClient.isAuthenticated()) {
    return null;
  }
  if (pendingHydrations.has(slug)) {
    return pendingHydrations.get(slug);
  }
  const request = ApiClient.getProgress(slug)
    .then((result) => {
      const progress = result?.progress;
      if (!progress) {
        return null;
      }
      const percent = Math.min(Math.max(Number(progress.percentage) || 0, 0), 100) / 100;
      ProgressStore.save(slug, context, percent);
      return percent;
    })
    .catch((error) => {
      console.warn("[ProgressService] Failed to hydrate progress", error);
      return null;
    })
    .finally(() => {
      pendingHydrations.delete(slug);
    });

  pendingHydrations.set(slug, request);
  return request;
}

export function queueProgressUpdate({
  slug,
  progress,
  scrollTop = 0,
  chapterMeta = null,
  context = "reader"
} = {}) {
  if (!slug) return;
  ProgressStore.save(slug, context, progress);
  if (!ApiClient.isAuthenticated()) return;
  const refs = resolveBackendRefs(chapterMeta);
  if (!refs) return;

  const payload = {
    bookId: refs.bookId,
    chapterId: refs.chapterId,
    percentage: Math.round(Math.min(Math.max(progress * 100, 0), 100)),
    scrollPosition: Math.max(Number(scrollTop) || 0, 0)
  };

  if (pendingUpdates.has(slug)) {
    pendingUpdates.set(slug, payload);
    return;
  }

  const send = async () => {
    const latest = pendingUpdates.get(slug) || payload;
    pendingUpdates.delete(slug);
    try {
      await ApiClient.updateProgress(slug, latest);
    } catch (error) {
      console.warn("[ProgressService] Failed to update remote progress", error);
    }
  };

  pendingUpdates.set(slug, payload);
  // Send after microtask to allow batching
  queueMicrotask(send);
}

export default {
  hydrateChapterProgress,
  queueProgressUpdate
};
