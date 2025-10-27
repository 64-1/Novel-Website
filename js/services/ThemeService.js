(function (global) {
  if (global.NovelThemeService) {
    return;
  }

  const stores = global.NovelStores || {};
  const ShellThemeStore = stores.ShellThemeStore;

  let bodyRef = null;
  let toggleButtonRef = null;
  let readerThemeOverride = false;

  function init({ body, toggleButton } = {}) {
    if (!body || !body.classList) {
      throw new Error("ThemeService.init requires a document body element");
    }
    bodyRef = body;
    toggleButtonRef = toggleButton || null;
  }

  function getShellMode() {
    if (!bodyRef) return "light";
    return bodyRef.classList.contains("dark-shell") ? "dark" : "light";
  }

  function updateToggleLabel() {
    if (!toggleButtonRef) return;
    toggleButtonRef.textContent = getShellMode() === "dark" ? "日间模式" : "夜间模式";
  }

  function applyShellClass(mode) {
    if (!bodyRef) return;
    const isDark = mode === "dark";
    bodyRef.classList.toggle("dark-shell", isDark);
  }

  function setShellMode(mode, { persist = true } = {}) {
    const targetMode = mode === "dark" ? "dark" : "light";
    applyShellClass(targetMode);
    if (persist && ShellThemeStore && typeof ShellThemeStore.save === "function") {
      ShellThemeStore.save(targetMode);
    }
    updateToggleLabel();
    return targetMode;
  }

  function toggleShellMode() {
    const next = getShellMode() === "dark" ? "light" : "dark";
    return setShellMode(next);
  }

  function applyStoredShellMode() {
    const stored = ShellThemeStore && typeof ShellThemeStore.load === "function"
      ? ShellThemeStore.load()
      : null;
    if (stored === "dark" || stored === "light") {
      setShellMode(stored, { persist: false });
    } else {
      updateToggleLabel();
    }
    return getShellMode();
  }

  function getReaderShellTheme() {
    return getShellMode() === "dark" ? "night" : "day";
  }

  function syncReaderTheme({
    readerSettings,
    applyReaderSettings,
    persistReaderSettings,
    syncModalTheme,
    respectOverride = true
  } = {}) {
    if (!readerSettings) return;
    if (respectOverride && readerThemeOverride) {
      return;
    }
    const desiredTheme = getReaderShellTheme();
    if (readerSettings.theme !== desiredTheme) {
      readerSettings.theme = desiredTheme;
      if (typeof applyReaderSettings === "function") {
        applyReaderSettings();
      }
      if (typeof persistReaderSettings === "function") {
        persistReaderSettings();
      }
      if (typeof syncModalTheme === "function") {
        syncModalTheme();
      }
    }
    readerThemeOverride = false;
  }

  function handleReaderThemeSelection(selectedTheme, {
    readerSettings,
    applyReaderSettings,
    persistReaderSettings,
    syncModalTheme
  } = {}) {
    if (!readerSettings) return;
    const theme = selectedTheme || "day";
    readerSettings.theme = theme;
    readerThemeOverride = theme !== getReaderShellTheme();
    if (typeof applyReaderSettings === "function") {
      applyReaderSettings();
    }
    if (typeof persistReaderSettings === "function") {
      persistReaderSettings();
    }
    if (typeof syncModalTheme === "function") {
      syncModalTheme();
    }
  }

  function isReaderThemeOverride() {
    return readerThemeOverride;
  }

  function resetOverride() {
    readerThemeOverride = false;
  }

  global.NovelThemeService = Object.freeze({
    init,
    getShellMode,
    applyStoredShellMode,
    toggleShellMode,
    setShellMode,
    updateToggleLabel,
    syncReaderTheme,
    handleReaderThemeSelection,
    isReaderThemeOverride,
    resetOverride,
    getReaderShellTheme
  });
})(window);
