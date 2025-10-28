import {
  ReaderSettingsStore,
  DraftStore,
  ProgressStore,
  LastReadStore
} from "./services/Stores.js";
import ChaptersRepo from "./services/ChaptersRepo.js";
import ThemeService from "./services/ThemeService.js";
import { createTracker } from "./reader/ProgressTracker.js";
import { createReaderView } from "./reader/ReaderView.js";
import { createTocList } from "./reader/TocList.js";
import { createReaderModal } from "./modal/ReaderModal.js";
import { initShortcuts } from "./services/Shortcuts.js";
import { startRouter, linkToChapter } from "./router.js";
import Strings from "./strings.js";
import { initApp } from "./app/initApp.js";

const stores = {
  ReaderSettingsStore,
  DraftStore,
  ProgressStore,
  LastReadStore
};

const router = {
  startRouter,
  linkToChapter
};

initApp({
  stores,
  chaptersRepo: ChaptersRepo,
  themeService: ThemeService,
  createProgressTracker: createTracker,
  createReaderView,
  createTocList,
  createReaderModal,
  initShortcuts,
  router,
  strings: Strings
});

document.addEventListener("DOMContentLoaded", () => {
  const slot = document.getElementById("continue-reading-slot");
  if (!slot) {
    return;
  }

  const record = LastReadStore.get();
  if (!record || !record.slug) {
    return;
  }

  (async () => {
    await ChaptersRepo.load();
    const index = ChaptersRepo.getIndexBySlug(record.slug);
    if (typeof index !== "number" || index < 0) {
      LastReadStore.clear();
      return;
    }
    const chapter = ChaptersRepo.getByIndex(index);
    if (!chapter) {
      LastReadStore.clear();
      return;
    }
    const progress = ProgressStore.load(record.slug) || 0;
    const percent = Math.round(Math.max(0, Math.min(progress, 1)) * 100);
    const href = `read.html#novel/${encodeURIComponent(record.slug)}`;

    const card = document.createElement("div");
    card.className = "sidebar-card continue-reading-card";

    const heading = document.createElement("h4");
    heading.textContent = "继续阅读";

    const title = document.createElement("p");
    title.className = "continue-reading-title";
    title.textContent = chapter.title;

    const meta = document.createElement("div");
    meta.className = "continue-reading-meta";
    meta.textContent = `已读 ${percent}%`;

    const link = document.createElement("a");
    link.className = "btn primary";
    link.href = href;
    link.textContent = "继续";

    card.append(heading, title, meta, link);

    slot.appendChild(card);
  })();
});
