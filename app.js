import {
  ReaderSettingsStore,
  DraftStore,
  ProgressStore
} from "./js/services/Stores.js";
import ChaptersRepo from "./js/services/ChaptersRepo.js";
import ThemeService from "./js/services/ThemeService.js";
import { createTracker } from "./js/reader/ProgressTracker.js";
import { createReaderView } from "./js/reader/ReaderView.js";
import { createTocList } from "./js/reader/TocList.js";
import { createReaderModal } from "./js/modal/ReaderModal.js";
import { initShortcuts } from "./js/services/Shortcuts.js";
import { startRouter, linkToChapter } from "./js/router.js";
import Strings from "./js/strings.js";
import { initApp } from "./js/app/initApp.js";

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

export default {
  initApp
};
