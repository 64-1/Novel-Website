/**
 * ReaderSettingsManager
 * Manages reader settings (font size, line height, theme) with persistence
 * Consolidates duplicated reader settings logic across different pages
 */

import { ReaderSettingsStore } from "./Stores.js";

/**
 * Default settings for different reader contexts
 */
export const DEFAULT_SETTINGS = {
  standard: {
    fontSize: 18,
    lineHeight: 1.6,
    theme: "day"
  },
  immersive: {
    fontSize: 20,
    lineHeight: 1.8,
    theme: "sepia"
  }
};

/**
 * Creates a reader settings manager
 * @param {Object} options - Configuration options
 * @param {Object} options.defaults - Default settings to use if none are stored
 * @param {Function} options.onApply - Callback function to apply settings to DOM
 * @returns {Object} Settings manager with load, save, apply, and update methods
 */
export function createReaderSettingsManager({ defaults = DEFAULT_SETTINGS.standard, onApply = null } = {}) {
  let settings = loadSettings(defaults);

  /**
   * Loads settings from storage or returns defaults
   * @param {Object} fallbackDefaults - Default values to use if no stored settings
   * @returns {Object} Settings object
   */
  function loadSettings(fallbackDefaults) {
    const stored = ReaderSettingsStore.load();
    if (stored && typeof stored === "object") {
      return {
        fontSize: Number(stored.fontSize) || fallbackDefaults.fontSize,
        lineHeight: Number(stored.lineHeight) || fallbackDefaults.lineHeight,
        theme: stored.theme || fallbackDefaults.theme
      };
    }
    return { ...fallbackDefaults };
  }

  /**
   * Persists current settings to storage
   */
  function saveSettings() {
    ReaderSettingsStore.save(settings);
  }

  /**
   * Applies settings to the DOM using the provided callback
   * @param {Object} context - Additional context to pass to onApply callback
   */
  function applySettings(context = {}) {
    if (onApply && typeof onApply === "function") {
      onApply(settings, context);
    }
  }

  /**
   * Updates one or more setting values
   * @param {Object} updates - Object with settings to update
   * @param {boolean} persist - Whether to save to storage (default: true)
   * @param {boolean} apply - Whether to apply to DOM (default: true)
   * @param {Object} applyContext - Additional context for apply callback
   */
  function updateSettings(updates, { persist = true, apply = true, applyContext = {} } = {}) {
    settings = { ...settings, ...updates };
    if (persist) {
      saveSettings();
    }
    if (apply) {
      applySettings(applyContext);
    }
  }

  /**
   * Gets current settings
   * @returns {Object} Current settings object (read-only copy)
   */
  function getSettings() {
    return { ...settings };
  }

  /**
   * Resets settings to defaults
   * @param {boolean} persist - Whether to save to storage (default: true)
   * @param {boolean} apply - Whether to apply to DOM (default: true)
   */
  function resetSettings({ persist = true, apply = true } = {}) {
    settings = { ...defaults };
    if (persist) {
      saveSettings();
    }
    if (apply) {
      applySettings();
    }
  }

  return {
    load: () => settings,
    save: saveSettings,
    apply: applySettings,
    update: updateSettings,
    get: getSettings,
    reset: resetSettings
  };
}

/**
 * Helper to apply standard reader settings to DOM elements
 * @param {Object} settings - Settings object
 * @param {Object} context - Context with DOM elements and trackers
 */
export function applyStandardReaderSettings(settings, context) {
  const {
    readerContent,
    fontSlider,
    lineSlider,
    themeButtons,
    progressTrackers = [],
    modalArticle = null
  } = context;

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

  // Sync modal theme if present
  if (modalArticle) {
    modalArticle.dataset.theme = settings.theme;
  }
}

/**
 * Helper to apply immersive reader settings to DOM elements
 * @param {Object} settings - Settings object
 * @param {Object} context - Context with DOM elements
 */
export function applyImmersiveReaderSettings(settings, context) {
  const { scrollContainer, body, themeButtons, fontDisplay, fontSlider } = context;

  if (scrollContainer) {
    scrollContainer.style.fontSize = `${settings.fontSize}px`;
    const lineHeight = Number(settings.lineHeight) || 1.8;
    scrollContainer.style.lineHeight = lineHeight;
  }

  const theme = settings.theme || "sepia";
  if (body) {
    body.dataset.readerTheme = theme;
  }

  // Update theme buttons
  if (themeButtons) {
    themeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.readerTheme === theme);
    });
  }

  // Update font display
  if (fontDisplay) {
    fontDisplay.textContent = `${Math.round(settings.fontSize)}px`;
  }
  if (fontSlider) {
    fontSlider.value = String(Math.round(settings.fontSize));
  }
}
