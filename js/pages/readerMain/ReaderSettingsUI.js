/**
 * ReaderSettingsUI
 * Manages reader settings UI controls (font, line height, theme, layout)
 */

/**
 * Creates a reader settings UI controller
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.readerContent - Main reader content container
 * @param {HTMLElement} config.modalArticle - Modal article element (optional)
 * @param {HTMLElement} config.readerGrid - Reader grid container
 * @param {HTMLElement} config.fontSlider - Font size slider input
 * @param {HTMLElement} config.lineSlider - Line height slider input
 * @param {NodeList} config.themeButtons - Theme selection buttons
 * @param {HTMLElement} config.layoutButton - Layout toggle button
 * @param {Array} config.progressTrackers - Progress tracker instances to refresh
 * @param {Object} config.settingsStore - Settings store (load/save)
 * @param {Object} config.themeService - Theme service for theme selection
 * @param {Object} config.strings - Localized strings
 * @returns {Object} Reader settings UI public API
 */
export function createReaderSettingsUI(config) {
  const {
    readerContent,
    modalArticle,
    readerGrid,
    fontSlider,
    lineSlider,
    themeButtons,
    layoutButton,
    progressTrackers = [],
    settingsStore,
    themeService,
    strings = {}
  } = config;

  if (!readerContent) {
    console.warn("[ReaderSettingsUI] Missing reader content element");
  }

  // Default settings
  const defaults = {
    fontSize: 18,
    lineHeight: 1.6,
    theme: "day"
  };

  // Current settings state
  let settings = loadSettings();

  /**
   * Loads settings from storage
   * @returns {Object} Settings object
   */
  function loadSettings() {
    if (!settingsStore?.load) return { ...defaults };

    const stored = settingsStore.load();
    if (stored && typeof stored === "object") {
      return {
        fontSize: Number(stored.fontSize) || defaults.fontSize,
        lineHeight: Number(stored.lineHeight) || defaults.lineHeight,
        theme: stored.theme || defaults.theme
      };
    }
    return { ...defaults };
  }

  /**
   * Persists settings to storage
   */
  function persistSettings() {
    if (settingsStore?.save) {
      settingsStore.save(settings);
    }
  }

  /**
   * Applies settings to the DOM
   */
  function applySettings() {
    if (!readerContent) return;

    // Apply font and line height
    readerContent.style.fontSize = `${settings.fontSize}px`;
    readerContent.style.lineHeight = settings.lineHeight;
    readerContent.dataset.theme = settings.theme;

    // Update sliders
    if (fontSlider) fontSlider.value = settings.fontSize;
    if (lineSlider) lineSlider.value = settings.lineHeight;

    // Update theme buttons
    if (themeButtons) {
      themeButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.theme === settings.theme);
      });
    }

    // Refresh progress trackers
    progressTrackers.forEach(tracker => {
      if (tracker?.refresh) {
        tracker.refresh({ fromStorage: true });
      }
    });

    // Sync modal theme
    syncModalTheme();
  }

  /**
   * Syncs theme to modal article
   */
  function syncModalTheme() {
    if (modalArticle) {
      modalArticle.dataset.theme = settings.theme;
    }
  }

  /**
   * Updates layout button label
   */
  function updateLayoutLabel() {
    if (!layoutButton) return;

    const labels = strings.layoutLabels || {};
    const expandedLabel = labels.expanded || "切换常规";
    const collapsedLabel = labels.collapsed || "切换宽屏";

    layoutButton.textContent = layoutButton.classList.contains("active")
      ? expandedLabel
      : collapsedLabel;
  }

  /**
   * Handles font size change
   */
  function handleFontSizeChange(value) {
    settings.fontSize = Number(value);
    applySettings();
    persistSettings();
  }

  /**
   * Handles line height change
   */
  function handleLineHeightChange(value) {
    settings.lineHeight = Number(value);
    applySettings();
    persistSettings();
  }

  /**
   * Handles theme change
   */
  function handleThemeChange(theme) {
    if (themeService?.handleReaderThemeSelection) {
      themeService.handleReaderThemeSelection(theme, {
        readerSettings: settings,
        applyReaderSettings: applySettings,
        persistReaderSettings: persistSettings,
        syncModalTheme
      });
    } else {
      // Fallback if theme service not available
      settings.theme = theme;
      applySettings();
      persistSettings();
    }
  }

  /**
   * Handles layout toggle
   */
  function handleLayoutToggle() {
    if (readerGrid) {
      readerGrid.classList.toggle("expanded");
    }
    if (layoutButton) {
      layoutButton.classList.toggle("active");
      updateLayoutLabel();
    }
    // Refresh progress trackers
    progressTrackers.forEach(tracker => {
      if (tracker?.refresh) {
        tracker.refresh({ fromStorage: true });
      }
    });
  }

  /**
   * Initializes the settings UI
   */
  function initialize() {
    // Apply initial settings
    applySettings();

    // Set up font slider
    if (fontSlider) {
      fontSlider.addEventListener("input", (e) => {
        handleFontSizeChange(e.target.value);
      });
    }

    // Set up line height slider
    if (lineSlider) {
      lineSlider.addEventListener("input", (e) => {
        handleLineHeightChange(e.target.value);
      });
    }

    // Set up theme buttons
    if (themeButtons) {
      themeButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const selectedTheme = btn.dataset.theme || "day";
          handleThemeChange(selectedTheme);
        });
      });
    }

    // Set up layout button
    if (layoutButton) {
      layoutButton.addEventListener("click", handleLayoutToggle);
      updateLayoutLabel();
    }
  }

  /**
   * Gets current settings
   * @returns {Object} Current settings
   */
  function getSettings() {
    return { ...settings };
  }

  /**
   * Updates settings
   * @param {Object} newSettings - Settings to update
   */
  function updateSettings(newSettings) {
    settings = { ...settings, ...newSettings };
    applySettings();
    persistSettings();
  }

  // Public API
  return {
    initialize,
    getSettings,
    updateSettings,
    applySettings,
    syncModalTheme,
    updateLayoutLabel
  };
}
