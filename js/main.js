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

const shouldInitLandingApp = Boolean(document.getElementById("continue-reading-slot"));

if (shouldInitLandingApp) {
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
}

initServiceWorkerUpdates();

document.addEventListener("DOMContentLoaded", () => {
  // Initialize global search overlay
  let globalSearchController = null;
  (async () => {
    const { createGlobalSearch } = await import("./search/GlobalSearch.js");
    globalSearchController = createGlobalSearch({
      onNavigate: (slug, query) => {
        const url = `/novel/${encodeURIComponent(slug)}?q=${encodeURIComponent(query)}`;
        location.href = url;
      },
      strings: Strings.search
    });
    // Set chapters repo getter for lazy loading during search
    globalSearchController.setChaptersRepoGetter(() => ChaptersRepo);

    // Add Ctrl/⌘ K shortcut handler
    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      const isModKey = event.metaKey || event.ctrlKey;
      const isK = event.key === "k" || event.key === "K";
      
      if (isModKey && isK && !event.altKey) {
        // Only open if overlay is not already open
        if (!globalSearchController?.isOpen()) {
          event.preventDefault();
          // Ensure chapters are loaded before opening
          ChaptersRepo.load().then(() => {
            globalSearchController?.open(ChaptersRepo);
          });
        }
      }
    });

    // Add click handler for search button
    const searchButton = document.querySelector('[data-action="open-global-search"]');
    searchButton?.addEventListener("click", () => {
      ChaptersRepo.load().then(() => {
        globalSearchController?.open(ChaptersRepo);
      });
    });
  })();

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
    const href = `/novel/${encodeURIComponent(record.slug)}`;

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

function initServiceWorkerUpdates() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  if (window.__SW_UPDATE_PROMPT_READY__) {
    return;
  }
  window.__SW_UPDATE_PROMPT_READY__ = true;

  const updateStrings = Strings?.updates || {};
  const messageText = updateStrings.available || "有更新";
  const refreshLabel = updateStrings.refresh || "刷新";
  const laterLabel = updateStrings.later || "稍后";

  let toastEl = null;
  let toastVisible = false;
  let dismissed = false;
  let currentWaiting = null;
  let pendingRegistration = null;
  let reloadRequested = false;
  const trackedRegistrations = new WeakSet();

  function ensureToast() {
    if (toastEl) {
      return toastEl;
    }
    if (!document.body) {
      return null;
    }
    const container = document.createElement("div");
    container.className = "update-toast";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-hidden", "true");

    const message = document.createElement("span");
    message.className = "update-toast__message";
    message.textContent = messageText;

    const actions = document.createElement("div");
    actions.className = "update-toast__actions";

    const laterButton = document.createElement("button");
    laterButton.type = "button";
    laterButton.className = "update-toast__action update-toast__action--secondary";
    laterButton.textContent = laterLabel;

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "update-toast__action update-toast__action--primary";
    refreshButton.textContent = refreshLabel;

    actions.append(laterButton, refreshButton);
    container.append(message, actions);
    document.body.appendChild(container);

    laterButton.addEventListener("click", () => {
      dismissed = true;
      hideToast();
    });

    refreshButton.addEventListener("click", () => {
      if (!pendingRegistration?.waiting) {
        hideToast();
        return;
      }
      reloadRequested = true;
      pendingRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      hideToast();
    });

    toastEl = container;
    return toastEl;
  }

  function hideToast() {
    if (!toastEl) {
      return;
    }
    toastVisible = false;
    toastEl.classList.remove("is-visible");
    toastEl.setAttribute("aria-hidden", "true");
  }

  function showToast(registration) {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) {
      return;
    }
    if (currentWaiting !== waitingWorker) {
      currentWaiting = waitingWorker;
      dismissed = false;
    }
    if (dismissed) {
      return;
    }
    pendingRegistration = registration;

    const toast = ensureToast();
    if (!toast) {
      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            showToast(registration);
          },
          { once: true }
        );
      }
      return;
    }

    if (toastVisible) {
      return;
    }
    toastVisible = true;
    toast.classList.add("is-visible");
    toast.setAttribute("aria-hidden", "false");
  }

  function attachRegistrationListeners(registration) {
    if (!registration || trackedRegistrations.has(registration)) {
      return;
    }
    trackedRegistrations.add(registration);
    if (registration.waiting) {
      showToast(registration);
    }
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) {
        return;
      }
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && registration.waiting) {
          showToast(registration);
        }
      });
    });
  }

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_WAITING") {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration?.waiting) {
            showToast(registration);
          }
        })
        .catch(() => {});
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloadRequested || window.__SW_UPDATE_RELOADED__) {
      return;
    }
    window.__SW_UPDATE_RELOADED__ = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .getRegistration()
    .then((existingRegistration) => {
      if (existingRegistration) {
        attachRegistrationListeners(existingRegistration);
        return existingRegistration;
      }
      return navigator.serviceWorker.register("/service-worker.js").then((registration) => {
        attachRegistrationListeners(registration);
        return registration;
      });
    })
    .catch((error) => {
      console.warn("Service worker registration failed:", error);
    });

  navigator.serviceWorker.ready
    .then((registration) => {
      attachRegistrationListeners(registration);
    })
    .catch(() => {});
}
