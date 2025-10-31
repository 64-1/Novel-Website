import { escapeHtml } from "../utils/htmlSanitize.js";
import { sortResults } from "../search/popularity.js";
import { TIMING } from "../utils/constants.js";
import { createCatalogSearch } from "../services/SearchConfig.js";

export function initSiteSearch(strings = {}) {
  const input = document.getElementById("siteSearch");
  const panel = document.getElementById("searchResults");
  if (!input || !panel) {
    return;
  }

  const FuseConstructor = window.Fuse;
  const catalogUrl = "/data/books.json";
  const zeroLabel = strings.noResults || "未找到相关书籍";
  const debounceDelay = TIMING.CATALOG_SEARCH_DEBOUNCE;
  const telemetryUrl = "/analytics/search";

  let catalog = [];
  let fuse = null;
  let loadPromise = null;
  let debounceTimer = null;
  let activeIndex = -1;
  let currentItems = [];

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
        fuse = createCatalogSearch(FuseConstructor, catalog);
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
