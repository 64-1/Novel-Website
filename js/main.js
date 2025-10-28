import {
  ReaderSettingsStore,
  DraftStore,
  ProgressStore
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
  ProgressStore
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
