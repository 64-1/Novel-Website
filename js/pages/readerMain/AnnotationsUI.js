/**
 * AnnotationsUI
 * Manages annotations panel, selection popover, and annotation interactions
 */

import { escapeHtmlDom as escapeHtml } from "../../utils/htmlSanitize.js";
import { TIMING } from "../../utils/constants.js";

/**
 * Creates an annotations UI controller
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.readerContent - Main reader content container
 * @param {HTMLElement} config.annotationsList - Annotations list element
 * @param {HTMLElement} config.selectionPopover - Selection popover element
 * @param {HTMLElement} config.addBookmarkBtn - Add bookmark button
 * @param {HTMLElement} config.highlightSelectionBtn - Highlight selection button
 * @param {HTMLElement} config.addNoteBtn - Add note button
 * @param {HTMLElement} config.bookmarkCount - Bookmark count display
 * @param {HTMLElement} config.highlightCount - Highlight count display
 * @param {NodeList} config.tabElements - Tab elements for switching views
 * @param {Object} config.annotationsController - Annotations controller instance
 * @param {Function} config.getCurrentChapter - Function to get current chapter
 * @param {Object} config.strings - Localized strings
 * @returns {Object} Annotations UI public API
 */
export function createAnnotationsUI(config) {
  const {
    readerContent,
    annotationsList,
    selectionPopover,
    addBookmarkBtn,
    highlightSelectionBtn,
    addNoteBtn,
    bookmarkCount,
    highlightCount,
    tabElements,
    annotationsController,
    getCurrentChapter,
    strings = {}
  } = config;

  if (!readerContent || !annotationsList) {
    console.warn("[AnnotationsUI] Missing required elements");
    return { updatePanel: () => {}, initialize: () => {} };
  }

  let currentTab = "bookmarks"; // "bookmarks" or "highlights"
  let selectionPopoverTimeout = null;

  /**
   * Shows the selection popover near the selected text
   * @param {Range} range - The text selection range
   */
  function showSelectionPopover(range) {
    if (!selectionPopover || !readerContent) return;

    const rect = range.getBoundingClientRect();
    const containerRect = readerContent.getBoundingClientRect();

    selectionPopover.style.top = `${rect.top - containerRect.top - 40}px`;
    selectionPopover.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
    selectionPopover.setAttribute("aria-hidden", "false");
    selectionPopover.style.display = "flex";
  }

  /**
   * Hides the selection popover
   */
  function hideSelectionPopover() {
    if (!selectionPopover) return;
    selectionPopover.setAttribute("aria-hidden", "true");
    selectionPopover.style.display = "none";
  }

  /**
   * Handles text selection in reader content
   */
  function handleSelection() {
    if (!readerContent || !selectionPopover) return;

    clearTimeout(selectionPopoverTimeout);
    const selection = window.getSelection();

    if (
      !selection ||
      selection.isCollapsed ||
      !readerContent.contains(selection.anchorNode) ||
      !readerContent.contains(selection.focusNode)
    ) {
      hideSelectionPopover();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range || range.collapsed) {
      hideSelectionPopover();
      return;
    }

    showSelectionPopover(range);
  }

  /**
   * Handles highlight creation from selection
   */
  function handleHighlightSelection() {
    const chapter = getCurrentChapter ? getCurrentChapter() : null;
    if (!chapter || !annotationsController) return;

    const highlight = annotationsController.createHighlightFromSelection({
      slug: chapter.slug,
      color: "ylw",
      note: ""
    });

    if (highlight) {
      updatePanel(chapter.slug);
      hideSelectionPopover();
      window.getSelection()?.removeAllRanges();
    }
  }

  /**
   * Handles note creation from selection
   */
  function handleAddNote() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const chapter = getCurrentChapter ? getCurrentChapter() : null;
    if (!chapter || !annotationsController) return;

    const notePrompt = strings.addNote ? `${strings.addNote}:` : "添加笔记:";
    const note = window.prompt(notePrompt, "");
    if (note === null) return; // User cancelled

    const highlight = annotationsController.createHighlightFromSelection({
      slug: chapter.slug,
      color: "ylw",
      note: note.trim()
    });

    if (highlight) {
      updatePanel(chapter.slug);
      hideSelectionPopover();
      window.getSelection()?.removeAllRanges();
    }
  }

  /**
   * Handles bookmark creation
   */
  function handleAddBookmark() {
    const chapter = getCurrentChapter ? getCurrentChapter() : null;
    if (!chapter || !annotationsController || !readerContent) return;

    // Get current scroll progress
    const container = readerContent;
    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 1);
    const percent = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
    const scrollTop = container.scrollTop;

    const bookmark = annotationsController.createBookmark({
      slug: chapter.slug,
      percent,
      scrollTop,
      note: ""
    });

    if (bookmark) {
      updatePanel(chapter.slug);

      // Announce to screen readers
      const announcement = document.createElement("div");
      announcement.className = "visually-hidden";
      announcement.setAttribute("role", "status");
      announcement.setAttribute("aria-live", "polite");
      announcement.textContent = `${strings.addBookmark || "书签"}已添加`;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), TIMING.ANNOUNCEMENT_DURATION);
    }
  }

  /**
   * Handles annotation deletion
   * @param {string} id - Annotation ID
   */
  function handleDelete(id) {
    if (!annotationsController || !id) return;

    if (annotationsController.remove(id)) {
      const chapter = getCurrentChapter ? getCurrentChapter() : null;
      if (chapter) {
        updatePanel(chapter.slug);
      }
    }
  }

  /**
   * Handles annotation click (jump to annotation)
   * @param {string} id - Annotation ID
   */
  function handleAnnotationClick(id) {
    if (!id || !annotationsController) return;

    if (id.startsWith("bm_")) {
      annotationsController.jumpToBookmark(id, readerContent);
    } else if (id.startsWith("hl_")) {
      annotationsController.jumpToHighlight(id);
    }
  }

  /**
   * Handles tab switching
   * @param {string} tabName - Tab name ("bookmarks" or "highlights")
   */
  function switchTab(tabName) {
    currentTab = tabName;

    if (tabElements) {
      tabElements.forEach((t) => t.classList.remove("active"));
      const activeTab = Array.from(tabElements).find(t => t.dataset.tab === tabName);
      if (activeTab) {
        activeTab.classList.add("active");
      }
    }

    const chapter = getCurrentChapter ? getCurrentChapter() : null;
    if (chapter) {
      updatePanel(chapter.slug);
    }
  }

  /**
   * Updates the annotations panel
   * @param {string} slug - Chapter slug
   */
  function updatePanel(slug) {
    if (!annotationsController || !slug || !annotationsList) return;

    const { bookmarks, highlights } = annotationsController.list(slug);

    // Update counts
    if (bookmarkCount) {
      bookmarkCount.textContent = bookmarks.length;
    }
    if (highlightCount) {
      highlightCount.textContent = highlights.length;
    }

    // Get items based on current tab
    const items = currentTab === "bookmarks" ? bookmarks : highlights;
    annotationsList.innerHTML = "";

    // Show empty state if no items
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "annotations-empty";
      empty.textContent =
        currentTab === "bookmarks"
          ? (strings.noBookmarks || "暂无书签")
          : (strings.noHighlights || "暂无高亮");
      annotationsList.appendChild(empty);
      return;
    }

    // Render items
    items.forEach((item) => {
      const li = document.createElement("div");
      li.className = "annotation-item";
      li.dataset.annId = item.id;
      li.setAttribute("role", "listitem");
      li.setAttribute("tabindex", "0");

      if (item.id.startsWith("bm_")) {
        // Bookmark
        const percent = Math.round(item.percent * 100);
        const date = new Date(item.createdAt);
        const timeStr = date.toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric"
        });

        li.innerHTML = `
          <div class="annotation-content">
            <div class="annotation-meta">${percent}% · ${timeStr}</div>
            ${item.note ? `<div class="annotation-note">${escapeHtml(item.note)}</div>` : ""}
          </div>
          <button class="annotation-delete" data-action="delete" aria-label="${strings.delete || "删除"}">×</button>
        `;
      } else {
        // Highlight - use placeholder, update asynchronously
        let snippet = "高亮片段";
        const date = new Date(item.createdAt);
        const timeStr = date.toLocaleDateString("zh-CN", {
          month: "short",
          day: "numeric"
        });

        li.innerHTML = `
          <div class="annotation-content">
            <div class="annotation-snippet">${escapeHtml(snippet || "")}</div>
            ${item.note ? `<div class="annotation-note">${escapeHtml(item.note)}</div>` : ""}
            <div class="annotation-meta">${timeStr}</div>
          </div>
          <button class="annotation-delete" data-action="delete" aria-label="${strings.delete || "删除"}">×</button>
        `;
      }

      annotationsList.appendChild(li);
    });

    // Load snippets for highlights asynchronously
    if (currentTab === "highlights") {
      Promise.all(
        highlights.map(async (item) => {
          if (!item.id.startsWith("hl_")) return null;
          try {
            const { buildTextMap } = await import("../../reader/TextMap.js");
            const textMap = buildTextMap(readerContent);
            const range = textMap.offsetsToRange(item.start, item.end);
            if (range) {
              const snippet = range.toString().substring(0, 60);
              const itemEl = annotationsList.querySelector(`[data-ann-id="${item.id}"]`);
              if (itemEl) {
                const snippetEl = itemEl.querySelector(".annotation-snippet");
                if (snippetEl) {
                  snippetEl.textContent = snippet + (snippet.length === 60 ? "…" : "");
                }
              }
            }
          } catch (e) {
            // Ignore errors
          }
        })
      ).catch(() => {});
    }
  }

  /**
   * Initializes the annotations UI
   */
  function initialize() {
    // Selection popover handlers
    if (readerContent && selectionPopover) {
      readerContent.addEventListener("mouseup", handleSelection);

      document.addEventListener("mousedown", (e) => {
        if (!selectionPopover?.contains(e.target) && !e.target.closest(".reader-content mark")) {
          setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) {
              hideSelectionPopover();
            }
          }, 10);
        }
      });
    }

    // Highlight button
    if (highlightSelectionBtn) {
      highlightSelectionBtn.addEventListener("click", handleHighlightSelection);
    }

    // Add note button
    if (addNoteBtn) {
      addNoteBtn.addEventListener("click", handleAddNote);
    }

    // Add bookmark button
    if (addBookmarkBtn) {
      addBookmarkBtn.addEventListener("click", handleAddBookmark);
    }

    // Tab switching
    if (tabElements) {
      tabElements.forEach((tab) => {
        tab.addEventListener("click", () => {
          const tabName = tab.dataset.tab;
          if (tabName) {
            switchTab(tabName);
          }
        });
      });
    }

    // Annotations list click handler (delegated)
    if (annotationsList) {
      annotationsList.addEventListener("click", (e) => {
        const item = e.target.closest("[data-ann-id]");
        if (!item) return;

        const id = item.dataset.annId;
        const action = e.target.closest("[data-action]")?.dataset.action;

        if (action === "delete") {
          e.stopPropagation();
          handleDelete(id);
          return;
        }

        handleAnnotationClick(id);
      });
    }
  }

  // Public API
  return {
    updatePanel,
    switchTab,
    initialize
  };
}
