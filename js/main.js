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
import { sortResults, trendingScore } from "./search/popularity.js";

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

function initSiteSearch(strings = {}) {
  const input = document.getElementById("siteSearch");
  const panel = document.getElementById("searchResults");
  if (!input || !panel) {
    return;
  }

  const FuseConstructor = window.Fuse;
  const catalogUrl = "/data/books.json";
  const zeroLabel = strings.noResults || "未找到相关书籍";
  const debounceDelay = 220;
  const telemetryUrl = "/analytics/search";

  let catalog = [];
  let fuse = null;
  let loadPromise = null;
  let debounceTimer = null;
  let activeIndex = -1;
  let currentItems = [];

  function escapeHtml(value) {
    if (value === null || value === undefined) {
      return "";
    }
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  if (!input.placeholder && strings.placeholder) {
    input.placeholder = strings.placeholder;
  }

  function updateExpanded(expanded) {
    input.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (!expanded) {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function hidePanel() {
    panel.classList.remove("open", "scrollable");
    panel.innerHTML = "";
    panel.hidden = true;
    updateExpanded(false);
    activeIndex = -1;
    currentItems = [];
  }

  function showPanel() {
    panel.hidden = false;
    updateExpanded(true);
  }

  function ensureItemArray(result) {
    if (!result) {
      return null;
    }
    if (result.item) {
      return result.item;
    }
    return result;
  }

  function setActive(index) {
    const options = Array.from(panel.querySelectorAll(".result-item"));
    if (!options.length) {
      activeIndex = -1;
      input.removeAttribute("aria-activedescendant");
      return;
    }
    const clamped = Math.max(0, Math.min(index, options.length - 1));
    options.forEach((option, optionIndex) => {
      const isActive = optionIndex === clamped;
      option.classList.toggle("active", isActive);
      if (isActive) {
        option.setAttribute("aria-selected", "true");
        input.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      } else {
        option.setAttribute("aria-selected", "false");
      }
    });
    activeIndex = clamped;
  }

  function clearActive() {
    const options = panel.querySelectorAll(".result-item");
    options.forEach((option) => {
      option.classList.remove("active");
      option.setAttribute("aria-selected", "false");
    });
    activeIndex = -1;
    input.removeAttribute("aria-activedescendant");
  }

  function renderResults(results) {
    panel.classList.remove("open", "scrollable");
    panel.innerHTML = "";

    const items = Array.isArray(results)
      ? results.slice(0, 10).map((entry) => ensureItemArray(entry)).filter(Boolean)
      : [];
    currentItems = items;

    if (!items.length) {
      panel.innerHTML = `<div class="result-empty" role="option" aria-disabled="true">${zeroLabel}</div>`;
      panel.classList.add("open");
      showPanel();
      clearActive();
      return;
    }

    const template = items
      .map((item, index) => {
        const titleText = item.title || item.title_zh || item.title_en || item.slug;
        const safeTitle = escapeHtml(titleText);
        const rawAuthor = typeof item.author === "string" ? item.author.trim() : "";
        const safeAuthor = rawAuthor ? escapeHtml(rawAuthor) : "";
        const tags = Array.isArray(item.tags)
          ? item.tags.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)
          : [];
        const genres = Array.isArray(item.genres)
          ? item.genres.map((genre) => (typeof genre === "string" ? genre.trim() : "")).filter(Boolean)
          : [];
        const safeTags = tags.map((tag) => escapeHtml(tag));
        const safeGenres = genres.map((genre) => escapeHtml(genre));
        const detailParts = [];
        if (safeAuthor) {
          detailParts.push(safeAuthor);
        }
        if (safeTags.length) {
          detailParts.push(safeTags.join(" / "));
        } else if (safeGenres.length) {
          detailParts.push(safeGenres.join(" / "));
        }
        const detailLine = detailParts.join(" · ");
        const coverUrl = escapeHtml(item.cover || "/icons/icon-192.png");
        const optionId = `search-option-${index}`;
        const dataSlug = escapeHtml(item.slug);
        return `
          <a class="result-item" id="${optionId}" role="option" data-index="${index}" data-slug="${dataSlug}" href="/novel/${encodeURIComponent(item.slug)}">
            <img class="result-cover" src="${coverUrl}" alt="">
            <div class="result-meta">
              <div class="result-title">${safeTitle}</div>
              <div class="result-sub">${detailLine}</div>
            </div>
          </a>
        `;
      })
      .join("");
    panel.innerHTML = template;
    clearActive();
    panel.classList.add("open");
    showPanel();

    panel.querySelectorAll(".result-item").forEach((option) => {
      option.addEventListener("mouseenter", () => {
        const index = Number.parseInt(option.dataset.index || "-1", 10);
        if (Number.isFinite(index) && index >= 0) {
          setActive(index);
        }
      });
    });

    requestAnimationFrame(() => {
      if (panel.hidden) {
        return;
      }
      const needsScroll = panel.scrollHeight > panel.clientHeight + 2;
      panel.classList.toggle("scrollable", needsScroll);
    });
  }

  async function ensureCatalog() {
    if (catalog.length) {
      return catalog;
    }
    if (loadPromise) {
      return loadPromise;
    }
    loadPromise = fetch(catalogUrl, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load catalog (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Catalog response must be an array");
        }
        catalog = data.filter((entry) => entry && entry.slug);
        if (FuseConstructor && typeof FuseConstructor === "function") {
          fuse = new FuseConstructor(catalog, {
            includeScore: true,
            threshold: 0.32,
            ignoreLocation: true,
            keys: [
              { name: "title", weight: 0.6 },
              { name: "title_zh", weight: 0.6 },
              { name: "title_en", weight: 0.45 },
              { name: "author", weight: 0.5 },
              { name: "tags", weight: 0.3 },
              { name: "genres", weight: 0.2 },
              { name: "summary", weight: 0.15 }
            ]
          });
        }
        return catalog;
      })
      .catch((error) => {
        console.warn("[SiteSearch] Failed to load catalog:", error);
        catalog = [];
        fuse = null;
        return catalog;
      })
      .finally(() => {
        loadPromise = null;
      });
    return loadPromise;
  }

  function basicMatch(list, query) {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return [];
    }
    return list.filter((item) => {
      const title = `${item.title || ""} ${item.title_zh || ""} ${item.title_en || ""}`.toLowerCase();
      const author = (item.author || "").toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.join(" ").toLowerCase() : "";
      const genres = Array.isArray(item.genres) ? item.genres.join(" ").toLowerCase() : "";
      const summary = (item.summary || "").toLowerCase();
      return (
        title.includes(keyword) ||
        author.includes(keyword) ||
        tags.includes(keyword) ||
        genres.includes(keyword) ||
        summary.includes(keyword)
      );
    });
  }

  function sendTelemetry(query, resultCount) {
    if (!query || resultCount !== 0) {
      return;
    }
    try {
      if (typeof window.fetch !== "function") {
        return;
      }
      fetch(telemetryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, ts: Date.now() })
      }).catch(() => {});
    } catch {
      // Ignore telemetry failures
    }
  }

  async function runSearch(rawQuery) {
    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
    if (!query) {
      hidePanel();
      return;
    }
    const data = await ensureCatalog();
    if (!data.length) {
      renderResults([]);
      sendTelemetry(query, 0);
      return;
    }
    if (fuse) {
      const results = fuse.search(query);
      const sorted = sortResults(results, { mode: "trending", isFuse: true });
      renderResults(sorted);
      sendTelemetry(query, sorted.length);
    } else {
      const matches = basicMatch(data, query).map((item) => ({ item }));
      const sortedMatches = sortResults(matches, { mode: "trending", isFuse: true });
      renderResults(sortedMatches);
      sendTelemetry(query, sortedMatches.length);
    }
  }

  input.addEventListener("input", (event) => {
    clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      runSearch(event.target.value);
    }, debounceDelay);
  });

  input.addEventListener("focus", () => {
    ensureCatalog();
    if (input.value.trim()) {
      runSearch(input.value);
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hidePanel();
      input.blur();
      return;
    }
    if (event.key === "ArrowDown") {
      if (panel.hidden) {
        runSearch(input.value);
        return;
      }
      event.preventDefault();
      if (activeIndex < currentItems.length - 1) {
        setActive(activeIndex + 1);
      } else {
        setActive(0);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      if (panel.hidden) {
        runSearch(input.value);
        return;
      }
      event.preventDefault();
      if (activeIndex <= 0) {
        setActive(currentItems.length - 1);
      } else {
        setActive(activeIndex - 1);
      }
      return;
    }
    if (event.key === "Enter") {
      if (!panel.hidden && activeIndex >= 0 && currentItems[activeIndex]) {
        event.preventDefault();
        const slug = currentItems[activeIndex].slug;
        if (slug) {
          hidePanel();
          window.location.href = `/novel/${encodeURIComponent(slug)}`;
          return;
        }
      }
      const query = input.value.trim();
      if (query) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
    }
  });

  panel.addEventListener("click", (event) => {
    const option = event.target.closest(".result-item");
    if (option) {
      hidePanel();
    }
  });

  input.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (!panel.contains(document.activeElement)) {
        hidePanel();
      }
    }, 150);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !event.target.closest(".search-wrap")) {
      hidePanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) {
      return;
    }
    const isModKey = event.metaKey || event.ctrlKey;
    const isK = event.key === "k" || event.key === "K";
    if (isModKey && isK && !event.altKey) {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });
}

function formatRelativeUpdate(updatedValue) {
  if (!updatedValue) {
    return "暂无更新";
  }
  const timestamp = Date.parse(updatedValue);
  if (!Number.isFinite(timestamp)) {
    return "暂无更新";
  }
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) {
    return "刚刚更新";
  }
  if (days === 1) {
    return "1 天前更新";
  }
  if (days < 30) {
    return `${days} 天前更新`;
  }
  const months = Math.floor(days / 30);
  if (months <= 1) {
    return "1 个月前更新";
  }
  return `${months} 个月前更新`;
}

async function initTrendingSection() {
  const container = document.getElementById("trendingList");
  if (!container) {
    return;
  }

  const section = container.closest(".trending-section");
  if (section) {
    section.setAttribute("aria-busy", "true");
  }

  try {
    const response = await fetch("/data/books.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to fetch books (${response.status})`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div class="trending-empty" role="listitem">暂未收录数据</div>`;
      return;
    }

    const ranked = data
      .slice()
      .sort((a, b) => trendingScore(b) - trendingScore(a))
      .slice(0, 10);

    container.innerHTML = ranked
      .map((item) => {
        const cover = item.cover || "/icons/icon-192.png";
        const title = item.title || item.title_zh || item.title_en || item.slug;
        const slug = encodeURIComponent(item.slug);
        const meta = formatRelativeUpdate(item.updated_at);
        return `
          <a class="trending-card" role="listitem" href="/novel/${slug}">
            <div class="trending-cover">
              <img src="${cover}" alt="">
            </div>
            <div class="trending-meta">
              <span class="trending-title">${title}</span>
              <span class="trending-updated">${meta}</span>
            </div>
          </a>
        `;
      })
      .join("");
  } catch (error) {
    console.warn("[Trending] failed to render trending section", error);
    container.innerHTML = `<div class="trending-empty" role="listitem">加载趋势数据时出错</div>`;
  } finally {
    if (section) {
      section.setAttribute("aria-busy", "false");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initSiteSearch(Strings?.search || {});
  initTrendingSection();

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
