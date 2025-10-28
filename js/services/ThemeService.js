import { ShellThemeStore } from "./Stores.js";

let bodyRef = null;
let toggleButtonRef = null;
let readerThemeOverride = false;

export function init({ body, toggleButton } = {}) {
  if (!body || !body.classList) {
    throw new Error("ThemeService.init requires a document body element");
  }
  bodyRef = body;
  toggleButtonRef = toggleButton || null;
}

export function getShellMode() {
  if (!bodyRef) return "light";
  return bodyRef.classList.contains("dark-shell") ? "dark" : "light";
}

export function updateToggleLabel() {
  if (!toggleButtonRef) return;
  toggleButtonRef.textContent = getShellMode() === "dark" ? "日间模式" : "夜间模式";
}

function applyShellClass(mode) {
  if (!bodyRef) return;
  const isDark = mode === "dark";
  bodyRef.classList.toggle("dark-shell", isDark);
}

export function setShellMode(mode, { persist = true } = {}) {
  const targetMode = mode === "dark" ? "dark" : "light";
  applyShellClass(targetMode);
  if (persist && ShellThemeStore && typeof ShellThemeStore.save === "function") {
    ShellThemeStore.save(targetMode);
  }
  updateToggleLabel();
  return targetMode;
}

export function toggleShellMode() {
  const next = getShellMode() === "dark" ? "light" : "dark";
  return setShellMode(next);
}

export function applyStoredShellMode() {
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

export function getReaderShellTheme() {
  return getShellMode() === "dark" ? "night" : "day";
}

export function syncReaderTheme({
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

export function handleReaderThemeSelection(selectedTheme, {
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

export function isReaderThemeOverride() {
  return readerThemeOverride;
}

export function resetOverride() {
  readerThemeOverride = false;
}

const ThemeService = {
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
};

export default ThemeService;
