/**
 * FABController
 * Manages the Floating Action Button for quick bookmark creation
 */

/**
 * Creates a FAB (Floating Action Button) controller
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.fabElement - The FAB button element
 * @param {HTMLElement} config.toastElement - Toast notification element
 * @param {HTMLElement} config.scrollContainer - Container to monitor for scroll
 * @param {Function} config.onBookmarkCreate - Callback when bookmark is created
 * @param {Function} config.isDrawerOpen - Function to check if drawer is open
 * @param {Function} config.isModalOpen - Function to check if modal is open
 * @param {Function} config.isSearchFocused - Function to check if search is focused
 * @param {Object} config.strings - Localized strings
 * @returns {Object} FAB controller public API
 */
export function createFABController(config) {
  const {
    fabElement,
    toastElement,
    scrollContainer,
    onBookmarkCreate,
    isDrawerOpen,
    isModalOpen,
    isSearchFocused,
    strings = {}
  } = config;

  if (!fabElement || !scrollContainer) {
    console.warn("[FABController] Missing required elements");
    return { show: () => {}, hide: () => {}, initialize: () => {} };
  }

  let fabVisible = true;
  let lastScrollTop = 0;
  let scrollTimeout = null;
  let toastTimeout = null;

  /**
   * Shows the FAB button
   */
  function show() {
    // Don't show if drawer is open
    if (isDrawerOpen && isDrawerOpen()) return;

    // Don't show if modal is open
    if (isModalOpen && isModalOpen()) return;

    // Don't show if search input is focused
    if (isSearchFocused && isSearchFocused()) return;

    fabVisible = true;
    fabElement.setAttribute("aria-hidden", "false");
  }

  /**
   * Hides the FAB button
   */
  function hide() {
    fabVisible = false;
    fabElement.setAttribute("aria-hidden", "true");
  }

  /**
   * Handles scroll events to show/hide FAB
   */
  function handleScroll() {
    const currentScrollTop = scrollContainer.scrollTop;
    const isScrollingDown = currentScrollTop > lastScrollTop;
    lastScrollTop = currentScrollTop;

    // Hide FAB while scrolling down
    if (isScrollingDown && fabVisible) {
      hide();
    }

    // Show FAB after scroll idle (600ms)
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (fabVisible === false) {
        show();
      }
    }, 600);
  }

  /**
   * Shows a toast notification
   * @param {string} message - Message to display
   */
  function showToast(message) {
    if (!toastElement) return;

    toastElement.textContent = message;
    toastElement.setAttribute("aria-hidden", "false");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastElement.setAttribute("aria-hidden", "true");
    }, 2500);
  }

  /**
   * Handles FAB click event
   */
  function handleClick() {
    if (onBookmarkCreate) {
      // Get current scroll progress
      const maxScroll = Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 1);
      const percent = maxScroll > 0 ? scrollContainer.scrollTop / maxScroll : 0;
      const scrollTop = scrollContainer.scrollTop;

      // Prompt for optional note
      const notePrompt = strings.addNoteOptional || "添加备注（可选）：";
      const noteInput = window.prompt(notePrompt, "");

      if (noteInput === null) {
        // User cancelled - don't proceed
        return;
      }

      // Create bookmark via callback
      const bookmark = onBookmarkCreate({
        percent,
        scrollTop,
        note: noteInput ? noteInput.trim() : ""
      });

      if (bookmark) {
        // Show toast
        if (strings.bookmarkAdded) {
          const message = typeof strings.bookmarkAdded === 'function'
            ? strings.bookmarkAdded(bookmark.chapterNum, bookmark.percent)
            : strings.bookmarkAdded;
          showToast(message);
        }
      }
    }
  }

  /**
   * Initializes the FAB controller
   */
  function initialize() {
    // Set up scroll listener
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    // Set up click listener
    fabElement.addEventListener("click", handleClick);

    // Show FAB initially after a short delay
    setTimeout(() => {
      show();
    }, 500);
  }

  /**
   * Cleans up event listeners
   */
  function destroy() {
    clearTimeout(scrollTimeout);
    clearTimeout(toastTimeout);
    scrollContainer.removeEventListener("scroll", handleScroll);
    fabElement.removeEventListener("click", handleClick);
  }

  // Public API
  return {
    show,
    hide,
    showToast,
    initialize,
    destroy
  };
}
