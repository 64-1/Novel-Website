import Strings from "../strings.js";
import { sortResults } from "../search/popularity.js";

const searchStrings = Strings?.search || {};
const FuseConstructor = window.Fuse;
const catalogUrl = "/data/books.json";

const input = document.getElementById("searchPageInput");
const form = document.getElementById("searchPageForm");
const resultsContainer = document.getElementById("searchPageResults");
const statusEl = document.getElementById("searchPageStatus");
const sortSelect = document.getElementById("sortBy");

if (form && resultsContainer) {
  const initialParams = new URLSearchParams(window.location.search);
  const initialQuery = initialParams.get("q") || "";
  const allowedSortModes = new Set(["trending", "pop", "updated"]);
  const requestedSort = initialParams.get("sort") || "";
  const initialSortParam = allowedSortModes.has(requestedSort) ? requestedSort : "trending";
  if (input) {
    input.value = initialQuery;
    if (!input.placeholder && searchStrings.placeholder) {
      input.placeholder = searchStrings.placeholder;
    }
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  let catalog = [];
  let fuse = null;
  let loadPromise = null;
  let currentQuery = initialQuery.trim();
  let sortMode = initialSortParam;

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
          throw new Error(`Failed to load ${catalogUrl} (${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Catalog must be an array");
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
        console.warn("[SearchPage] Failed to load catalog:", error);
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
      return list;
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

  function updateStatus(count, query) {
    if (!statusEl) {
      return;
    }
    const safeQuery = escapeHtml(query);
    if (!catalog.length) {
      statusEl.textContent = "暂无可检索的书籍。";
      return;
    }
    if (!query) {
      statusEl.textContent = count ? `目前收录 ${count} 本书。` : "暂无可检索的书籍。";
      return;
    }
    if (count === 0) {
      const label = searchStrings.noResults || "无结果";
      statusEl.innerHTML = `${label}：未找到与 “${safeQuery}” 匹配的书籍。`;
      return;
    }
    statusEl.innerHTML = `关于 “${safeQuery}” 的 ${count} 条匹配结果。`;
  }

  function truncate(text, maxLength = 140) {
    if (!text) return "";
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength - 1).trimEnd()}…`;
  }

  function renderResults(items, query) {
    if (!resultsContainer) {
      return;
    }
    if (!items.length) {
      resultsContainer.innerHTML =
        `<div class="result-empty" role="listitem">${escapeHtml(searchStrings.noResults || "无结果")}</div>`;
      updateStatus(0, query);
      return;
    }

    const html = items
      .map((item) => {
        const title = escapeHtml(item.title || item.title_zh || item.title_en || item.slug);
        const author = escapeHtml(item.author || "");
        const tags = Array.isArray(item.tags)
          ? item.tags.map((tag) => escapeHtml(tag)).join(" / ")
          : "";
        const genres = Array.isArray(item.genres)
          ? item.genres.map((genre) => escapeHtml(genre)).join(" / ")
          : "";
        const summary = escapeHtml(truncate(item.summary || ""));
        const cover = escapeHtml(item.cover || "/icons/icon-192.png");
        const detailParts = [];
        if (author) {
          detailParts.push(author);
        }
        if (tags) {
          detailParts.push(tags);
        } else if (genres) {
          detailParts.push(genres);
        }
        const detailLine = detailParts.join(" · ");
        const slug = encodeURIComponent(item.slug);
        return `
          <a class="result-item result-block" role="listitem" href="/novel/${slug}">
            <img class="result-cover" src="${cover}" alt="">
            <div class="result-meta">
              <div class="result-title">${title}</div>
              <div class="result-sub">${detailLine}</div>
              <p class="result-desc">${summary}</p>
            </div>
          </a>
        `;
      })
      .join("");

    resultsContainer.innerHTML = html;
    updateStatus(items.length, query);
  }

  function updateUrlParams(queryValue, sortValue) {
    const params = new URLSearchParams(window.location.search);
    if (queryValue) {
      params.set("q", queryValue);
    } else {
      params.delete("q");
    }
    if (sortValue && sortValue !== "trending") {
      params.set("sort", sortValue);
    } else {
      params.delete("sort");
    }
    const serialized = params.toString();
    const newUrl = serialized ? `?${serialized}` : "";
    history.replaceState(null, "", `${window.location.pathname}${newUrl}`);
  }

  async function runSearch(query) {
    currentQuery = query.trim();
    const data = await ensureCatalog();
    if (!data.length) {
      renderResults([], currentQuery);
      return;
    }

    if (!currentQuery) {
      const sorted = sortResults(data, { mode: sortMode });
      renderResults(sorted, currentQuery);
      return;
    }

    if (fuse) {
      const results = fuse.search(currentQuery).map((entry) => entry.item);
      const sorted = sortResults(results, { mode: sortMode });
      renderResults(sorted, currentQuery);
    } else {
      const matches = basicMatch(data, currentQuery);
      const sortedMatches = sortResults(matches, { mode: sortMode });
      renderResults(sortedMatches, currentQuery);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input) {
      runSearch(input.value || "");
    }
  });

  input?.addEventListener("input", (event) => {
    const value = (event.target.value || "").trim();
    updateUrlParams(value, sortMode);
    runSearch(event.target.value || "");
  });

  if (sortSelect) {
    sortSelect.value = sortMode;
    sortSelect.addEventListener("change", (event) => {
      const raw = event.target.value;
      const value = allowedSortModes.has(raw) ? raw : "trending";
      sortMode = value;
      updateUrlParams(input?.value.trim() || "", sortMode);
      runSearch(input?.value || "");
    });
  }

  updateUrlParams(initialQuery.trim(), sortMode);
  ensureCatalog().then(() => runSearch(initialQuery));
}
