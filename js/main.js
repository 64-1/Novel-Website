import {
  ReaderSettingsStore,
  DraftStore,
  ProgressStore,
  LastReadStore,
  CodexStore
} from "./services/Stores.js";
import ChaptersRepo from "./services/ChaptersRepo.js";
import ThemeService from "./services/ThemeService.js";
import AudioPlayer from "./services/AudioPlayer.js";
import { createTracker } from "./reader/ProgressTracker.js";
import { createReaderView } from "./reader/ReaderView.js";
import { createTocList } from "./reader/TocList.js";
import { createReaderModal } from "./modal/ReaderModal.js";
import { initShortcuts } from "./services/Shortcuts.js";
import { startRouter, linkToChapter } from "./router.js";
import Strings from "./strings.js";
import { initApp } from "./app/initApp.js";
import { initSiteSearch } from "./modules/SiteSearch.js";
import { initTrendingSection } from "./modules/TrendingSection.js";
import { initServiceWorkerUpdates } from "./modules/ServiceWorkerUpdates.js";
import { initContinueReading } from "./modules/ContinueReading.js";
import { createUserAvatarMenu } from "./components/UserAvatarMenu.js";
import { initAuthGuards } from "./modules/AuthGuard.js";

const stores = {
  ReaderSettingsStore,
  DraftStore,
  ProgressStore,
  LastReadStore,
  CodexStore
};

const router = {
  startRouter,
  linkToChapter
};

const shouldInitLandingApp = Boolean(
  document.getElementById("continue-reading-slot") || document.querySelector(".writer-studio")
);

if (shouldInitLandingApp) {
  initApp({
    stores,
    chaptersRepo: ChaptersRepo,
    themeService: ThemeService,
    audioPlayer: AudioPlayer,
    createProgressTracker: createTracker,
    createReaderView,
    createTocList,
    createReaderModal,
    initShortcuts,
    router,
    strings: Strings
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSiteSearch(Strings?.search || {});
  initTrendingSection();
  initContinueReading();
  initAuthGuards();

  // Initialize header auth menu
  const headerAuth = document.getElementById('headerAuth');
  if (headerAuth) {
    createUserAvatarMenu({
      container: headerAuth,
      onNavigate: (action, href) => {
        if (action === 'logout') {
          // Refresh the page after logout
          window.location.reload();
        } else if (href) {
          window.location.href = href;
        }
      }
    });
  }
});

initServiceWorkerUpdates(Strings?.updates || {});
