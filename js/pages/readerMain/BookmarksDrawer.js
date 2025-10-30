/**
 * BookmarksDrawer
 * Manages the bookmarks drawer UI for viewing and managing bookmarks
 */

import { escapeHtmlDom as escapeHtml } from "../../utils/htmlSanitize.js";
import { formatRelativeTime } from "../../utils/formatters.js";

/**
 * Creates a bookmarks drawer controller
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.drawerElement - The drawer container element
 * @param {HTMLElement} config.drawerList - The list element for bookmarks
 * @param {HTMLElement} config.triggerElement - Button to open drawer
 * @param {NodeList} config.closeElements - Elements that close the drawer
 * @param {NodeList} config.tabElements - Tab elements for filtering
 * @param {Function} config.getBookmarks - Function to get all bookmarks
 * @param {Function} config.getChapters - Function to get all chapters
 * @param {Function} config.getCurrentChapterSlug - Function to get current chapter slug
 * @param {Function} config.onBookmarkClick - Callback when bookmark is clicked
 * @param {Function} config.onBookmarkDelete - Callback when bookmark is deleted
 * @param {Function} config.onOpen - Callback when drawer opens
 * @param {Function} config.onClose - Callback when drawer closes
 * @param {Object} config.strings - Localized strings
 * @returns {Object} Bookmarks drawer public API
 */
export function createBookmarksDrawer(config) {
  const {
    drawerElement,
    drawerList,
    triggerElement,
    closeElements,
    tabElements,
    getBookmarks,
    getChapters,
    getCurrentChapterSlug,
    onBookmarkClick,
    onBookmarkDelete,
    onOpen,
    onClose,
    strings = {}
  } = config;

  if (!drawerElement || !drawerList) {
    console.warn("[BookmarksDrawer] Missing required elements");
    return { open: () => {}, close: () => {}, render: () => {} };
  }

  let currentFilter = "all"; // "all" or "current"

  /**
   * Opens the bookmarks drawer
   */
  function open() {
    drawerElement.setAttribute("aria-hidden", "false");
    render();
    if (onOpen) {
      onOpen();
    }
  }

  /**
   * Closes the bookmarks drawer
   */
  function close() {
    drawerElement.setAttribute("aria-hidden", "true");
    if (onClose) {
      onClose();
    }
  }

  /**
   * Checks if drawer is currently open
   * @returns {boolean} True if drawer is open
   */
  function isOpen() {
    return drawerElement.getAttribute("aria-hidden") === "false";
  }

  /**
   * Renders the bookmarks list
   */
  function render() {
    const allBookmarks = getBookmarks ? getBookmarks() : [];
    const chapters = getChapters ? getChapters() : [];
    const currentSlug = getCurrentChapterSlug ? getCurrentChapterSlug() : "";

    // Filter based on currentFilter
    let displayedBookmarks = allBookmarks;
    if (currentFilter === "current") {
      displayedBookmarks = allBookmarks.filter((bm) => bm.slug === currentSlug);
    }

    drawerList.innerHTML = "";

    if (displayedBookmarks.length === 0) {
      const empty = document.createElement("div");
      empty.className = "drawer-empty";
      empty.textContent =
        currentFilter === "current"
          ? (strings.emptyCurrent || "当前章节无书签")
          : (strings.emptyAll || "暂无书签");
      drawerList.appendChild(empty);
      return;
    }

    displayedBookmarks.forEach((bookmark) => {
      const chapter = chapters.find((ch) => ch.slug === bookmark.slug) || null;
      const chapterTitle = chapter?.title || bookmark.slug;

      const item = document.createElement("div");
      item.className = "drawer-bookmark-item";
      item.dataset.bookmarkId = bookmark.id;
      item.setAttribute("role", "listitem");
      item.setAttribute("tabindex", "0");

      const percent = Math.round(bookmark.percent * 100);
      const timeStr = formatRelativeTime(bookmark.createdAt, {
        justNow: "刚刚",
        minutesAgo: " 分钟前",
        hoursAgo: " 小时前",
        daysAgo: " 天前"
      });

      item.innerHTML = `
        <div class="drawer-bookmark-content">
          <div class="drawer-bookmark-title">${escapeHtml(chapterTitle)}</div>
          ${bookmark.note ? `<div class="drawer-bookmark-note">${escapeHtml(bookmark.note)}</div>` : ""}
          <div class="drawer-bookmark-meta">
            <span>${percent}%</span>
            <span>·</span>
            <span>${timeStr}</span>
          </div>
        </div>
        <div class="drawer-bookmark-actions">
          <button class="drawer-bookmark-locate" data-action="locate" aria-label="${strings.locate || '定位'}">›</button>
          <button class="drawer-bookmark-delete" data-action="delete-drawer" aria-label="${strings.delete || '删除'}">🗑</button>
        </div>
      `;

      drawerList.appendChild(item);
    });
  }

  /**
   * Handles click events on the drawer list (delegated)
   */
  function handleListClick(e) {
    const item = e.target.closest(".drawer-bookmark-item");
    if (!item) return;

    const bookmarkId = item.dataset.bookmarkId;
    const action = e.target.closest("[data-action]")?.dataset.action;

    if (action === "delete-drawer") {
      e.stopPropagation();
      if (onBookmarkDelete) {
        onBookmarkDelete(bookmarkId);
      }
      return;
    }

    if (action === "locate" || !action) {
      if (onBookmarkClick) {
        onBookmarkClick(bookmarkId);
      }
    }
  }

  /**
   * Handles tab switching
   */
  function handleTabClick(e) {
    const tab = e.target.closest("[data-filter]");
    if (!tab) return;

    const filter = tab.dataset.filter;
    if (!filter) return;

    currentFilter = filter;
    tabElements.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    render();
  }

  /**
   * Checks for pending bookmark scroll from navigation
   */
  function checkPendingScroll(scrollContainer) {
    if (!scrollContainer) return;

    try {
      const stored = sessionStorage.getItem("pendingBookmarkScroll");
      if (!stored) return;

      const { percent, scrollTop } = JSON.parse(stored);
      sessionStorage.removeItem("pendingBookmarkScroll");

      // Wait for render to complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const maxScroll = Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 1);
          let targetScroll = 0;

          if (typeof scrollTop === "number" && scrollTop >= 0) {
            targetScroll = Math.min(scrollTop, maxScroll);
          } else if (typeof percent === "number") {
            targetScroll = percent * maxScroll;
          }

          scrollContainer.scrollTo({
            top: targetScroll,
            behavior: "smooth"
          });
        });
      });
    } catch (e) {
      // Ignore errors
      console.warn("[BookmarksDrawer] Error checking pending scroll:", e);
    }
  }

  /**
   * Initializes the drawer controller
   */
  function initialize() {
    // Set up list click handler (delegated)
    drawerList.addEventListener("click", handleListClick);

    // Set up tab click handlers
    if (tabElements) {
      tabElements.forEach((tab) => {
        tab.addEventListener("click", handleTabClick);
      });
    }

    // Set up trigger button
    if (triggerElement) {
      triggerElement.addEventListener("click", open);
    }

    // Set up close buttons
    if (closeElements) {
      closeElements.forEach((el) => {
        el.addEventListener("click", close);
      });
    }
  }

  /**
   * Sets the current filter
   * @param {string} filter - "all" or "current"
   */
  function setFilter(filter) {
    currentFilter = filter;
    render();
  }

  // Public API
  return {
    open,
    close,
    isOpen,
    render,
    checkPendingScroll,
    setFilter,
    initialize
  };
}
