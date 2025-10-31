/**
 * Reader Settings UI Module
 * Handles reader font, line height, and theme settings
 */

export function createReaderSettingsUI({
  readerContent,
  modalArticle,
  fontSlider,
  lineSlider,
  readerThemeButtons,
  readerProgressTracker,
  modalProgressTracker,
  ReaderSettingsStore,
  themeService
} = {}) {
  if (!ReaderSettingsStore) {
    return null;
  }

  const readerSettings = loadReaderSettings();

  function loadReaderSettings() {
    const stored = ReaderSettingsStore.load();
    if (stored && typeof stored === "object") {
      return {
        fontSize: Number(stored.fontSize) || 18,
        lineHeight: Number(stored.lineHeight) || 1.6,
        theme: stored.theme || "day"
      };
    }
    return { fontSize: 18, lineHeight: 1.6, theme: "day" };
  }

  function persistReaderSettings() {
    ReaderSettingsStore.save(readerSettings);
  }

  function applyReaderSettings() {
    if (!readerContent) return;
    readerContent.style.fontSize = `${readerSettings.fontSize}px`;
    readerContent.style.lineHeight = readerSettings.lineHeight;
    readerContent.dataset.theme = readerSettings.theme;
    if (fontSlider) fontSlider.value = readerSettings.fontSize;
    if (lineSlider) lineSlider.value = readerSettings.lineHeight;
    readerThemeButtons?.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === readerSettings.theme);
    });

    readerProgressTracker?.refresh({ fromStorage: true });
    modalProgressTracker?.refresh({ fromStorage: true });
  }

  function syncModalTheme() {
    if (modalArticle) {
      modalArticle.dataset.theme = readerSettings.theme;
    }
  }

  function initialize() {
    // Apply initial settings
    applyReaderSettings();

    // Font size slider
    fontSlider?.addEventListener("input", (event) => {
      readerSettings.fontSize = Number(event.target.value);
      applyReaderSettings();
      persistReaderSettings();
    });

    // Line height slider
    lineSlider?.addEventListener("input", (event) => {
      readerSettings.lineHeight = Number(event.target.value);
      applyReaderSettings();
      persistReaderSettings();
    });

    // Theme buttons
    readerThemeButtons?.forEach((btn) => {
      btn.addEventListener("click", () => {
        const selectedTheme = btn.dataset.theme || "day";
        themeService.handleReaderThemeSelection(selectedTheme, {
          readerSettings,
          applyReaderSettings,
          persistReaderSettings,
          syncModalTheme
        });
      });
    });

    // Sync reader theme with shell mode
    themeService?.syncReaderTheme({
      readerSettings,
      applyReaderSettings,
      persistReaderSettings,
      syncModalTheme,
      respectOverride: false
    });
  }

  return {
    initialize,
    getSettings: () => readerSettings,
    applySettings: applyReaderSettings,
    syncModalTheme
  };
}
