import { createFocusTrap } from "../a11y/FocusTrap.js";

const INPUT_THROTTLE_MS = 120;

/**
 * Creates a global search overlay with keyboard navigation
 */
export function createGlobalSearch({
  openKey = "CtrlOrMeta+K",
  mountTo = document.body,
  onNavigate, // (slug, query) => void
  strings = {}
} = {}) {
  const {
    placeholder = "搜索全书…",
    noResults = "无结果",
    chaptersMatched = (count) => `共 ${count} 章命中`
  } = strings;

  let overlay = null;
  let backdrop = null;
  let panel = null;
  let input = null;
  let status = null;
  let resultsList = null;
  let focusTrap = null;
  let index = null;
  let indexPromise = null;
  let searchThrottle = null;
  let currentResults = [];
  let selectedIndex = -1;
  let previousActiveElement = null;
  let isOpen = false;

  function createOverlay() {
    backdrop = document.createElement("div");
    backdrop.className = "gs-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.setAttribute("tabindex", "-1");

    panel = document.createElement("div");
    panel.className = "gs-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "全书搜索");

    input = document.createElement("input");
    input.type = "text";
    input.className = "gs-input";
    input.setAttribute("placeholder", placeholder);
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-label", placeholder);

    status = document.createElement("div");
    status.className = "gs-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");

    resultsList = document.createElement("ul");
    resultsList.className = "gs-results";
    resultsList.setAttribute("role", "listbox");

    panel.appendChild(input);
    panel.appendChild(status);
    panel.appendChild(resultsList);

    backdrop.appendChild(panel);
    overlay = backdrop;

    focusTrap = createFocusTrap({
      container: panel,
      fallback: input
    });

    // Event listeners
    input.addEventListener("input", handleInput);
    input.addEventListener("keydown", handleInputKeydown);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        close();
      }
    });
    resultsList.addEventListener("click", handleResultClick);
    document.addEventListener("keydown", handleDocumentKeydown);
  }

  function handleInput(event) {
    const query = event.target.value.trim();

    if (searchThrottle) {
      clearTimeout(searchThrottle);
    }

    // Store chaptersRepo reference for performSearch
    let chaptersRepoRef = null;
    if (typeof getChaptersRepo === "function") {
      chaptersRepoRef = getChaptersRepo();
    }

    searchThrottle = setTimeout(() => {
      performSearch(query, chaptersRepoRef);
      searchThrottle = null;
    }, INPUT_THROTTLE_MS);
  }

  function handleInputKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (currentResults.length > 0) {
        selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1);
        updateSelection();
        scrollToSelected();
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (selectedIndex >= 0) {
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection();
        scrollToSelected();
        if (selectedIndex < 0) {
          input.focus();
        }
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < currentResults.length) {
        navigateToResult(currentResults[selectedIndex], input.value.trim());
      }
    }
  }

  function handleDocumentKeydown(event) {
    if (!isOpen) return;
    // Prevent conflict with other shortcuts when overlay is open
    if (event.key === "/" || event.key === "?" || event.key === "n" || event.key === "N") {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target;
        if (
          !target ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        event.stopPropagation();
      }
    }
  }

  function handleResultClick(event) {
    const item = event.target.closest(".gs-result-item");
    if (!item) return;
    const slug = item.dataset.slug;
    if (!slug) return;
    const result = currentResults.find((r) => r.slug === slug);
    if (result) {
      navigateToResult(result, input.value.trim());
    }
  }

  function navigateToResult(result, query) {
    if (typeof onNavigate === "function") {
      onNavigate(result.slug, query);
    }
    close();
  }

  function updateSelection() {
    const items = resultsList.querySelectorAll(".gs-result-item");
    items.forEach((item, idx) => {
      item.classList.toggle("is-selected", idx === selectedIndex);
    });
  }

  function scrollToSelected() {
    const items = resultsList.querySelectorAll(".gs-result-item");
    const selected = items[selectedIndex];
    if (selected) {
      selected.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  async function buildIndexIfNeeded(chaptersRepo) {
    if (index) {
      return index;
    }
    if (indexPromise) {
      return indexPromise;
    }

    indexPromise = (async () => {
      try {
        const { buildIndex } = await import("./indexer.js");
        let chapters;
        if (typeof chaptersRepo.list === "function") {
          chapters = chaptersRepo.list();
        } else if (Array.isArray(chaptersRepo)) {
          chapters = chaptersRepo;
        } else {
          return null;
        }
        index = buildIndex(chapters);
        return index;
      } catch (error) {
        console.error("[GlobalSearch] Failed to build index:", error);
        return null;
      } finally {
        indexPromise = null;
      }
    })();

    return indexPromise;
  }

  async function performSearch(query, chaptersRepo = null) {
    if (!query) {
      currentResults = [];
      selectedIndex = -1;
      renderResults([]);
      updateStatus("");
      return;
    }

    // Ensure index is built - wait if building
    let currentIndex = index;
    if (!currentIndex) {
      if (indexPromise) {
        updateStatus("索引加载中…");
        currentIndex = await indexPromise;
      } else if (chaptersRepo) {
        updateStatus("索引加载中…");
        currentIndex = await buildIndexIfNeeded(chaptersRepo);
      } else {
        updateStatus("索引加载中…");
        return;
      }
    }

    if (!currentIndex) {
      updateStatus("索引加载失败");
      return;
    }

    try {
      const { searchIndex } = await import("./indexer.js");
      const results = searchIndex(currentIndex, query);
      currentResults = results;
      selectedIndex = -1;
      renderResults(results);
      updateStatus(
        results.length > 0
          ? chaptersMatched(results.length)
          : noResults
      );
    } catch (error) {
      console.error("[GlobalSearch] Search failed:", error);
      updateStatus("搜索出错");
    }
  }

  function renderResults(results) {
    resultsList.innerHTML = "";
    if (results.length === 0) {
      return;
    }

    results.forEach((result) => {
      const item = document.createElement("li");
      item.className = "gs-result-item";
      item.setAttribute("role", "option");
      item.dataset.slug = result.slug;

      const header = document.createElement("div");
      header.className = "gs-result-header";

      const title = document.createElement("span");
      title.className = "gs-result-title";
      title.textContent = result.title;

      const count = document.createElement("span");
      count.className = "gs-result-count";
      count.textContent = `${result.count} 处命中`;

      header.appendChild(title);
      header.appendChild(count);

      item.appendChild(header);

      const snippetsContainer = document.createElement("div");
      snippetsContainer.className = "gs-result-snippets";

      result.snippets.forEach((snippet) => {
        const snippetEl = document.createElement("div");
        snippetEl.className = "gs-snippet";
        snippetEl.innerHTML = `${snippet.before}<mark>${snippet.match}</mark>${snippet.after}`;
        snippetsContainer.appendChild(snippetEl);
      });

      item.appendChild(snippetsContainer);
      resultsList.appendChild(item);
    });
  }

  function updateStatus(text) {
    if (status) {
      status.textContent = text;
    }
  }

  function open(chaptersRepo) {
    if (isOpen) return;

    if (!overlay) {
      createOverlay();
    }

    previousActiveElement = document.activeElement;
    mountTo.appendChild(overlay);
    overlay.setAttribute("aria-hidden", "false");
    isOpen = true;

    // Lazy-build index on first open
    if (!index) {
      if (chaptersRepo) {
        // Use requestIdleCallback if available
        const buildTask = () => {
          buildIndexIfNeeded(chaptersRepo).then(() => {
            const currentQuery = input?.value?.trim();
            if (currentQuery && isOpen) {
              performSearch(currentQuery, chaptersRepo);
            }
          });
        };

        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(buildTask, { timeout: 200 });
        } else {
          setTimeout(buildTask, 0);
        }
      }
    }

    // Focus input
    requestAnimationFrame(() => {
      input?.focus();
      focusTrap?.activate();
    });
  }

  function close() {
    if (!isOpen) return;

    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay?.setAttribute("aria-hidden", "true");
    isOpen = false;
    focusTrap?.deactivate();

    // Clear search state
    if (input) {
      input.value = "";
    }
    currentResults = [];
    selectedIndex = -1;
    renderResults([]);
    updateStatus("");

    // Restore focus
    if (previousActiveElement && typeof previousActiveElement.focus === "function") {
      previousActiveElement.focus();
    }
    previousActiveElement = null;
  }

  function isOpenState() {
    return isOpen;
  }

  // Store getChaptersRepo function for lazy building during search
  let getChaptersRepo = null;
  function setChaptersRepoGetter(fn) {
    getChaptersRepo = fn;
  }

  return {
    open,
    close,
    isOpen: isOpenState,
    setChaptersRepoGetter
  };
}

