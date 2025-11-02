import { ReaderSettingsStore } from "../../services/Stores.js";

export function createReaderSettingsController({ scrollContainer, body }) {
  const settings = loadSettings();

  function loadSettings() {
    const stored = ReaderSettingsStore.load();
    if (stored && typeof stored === "object") {
      return {
        fontSize: Number(stored.fontSize) || 20,
        lineHeight: Number(stored.lineHeight) || 1.8,
        theme: stored.theme || "sepia"
      };
    }
    return { fontSize: 20, lineHeight: 1.8, theme: "sepia" };
  }

  function apply() {
    if (scrollContainer) {
      scrollContainer.style.fontSize = `${settings.fontSize}px`;
      const lineHeight = Number(settings.lineHeight) || 1.8;
      scrollContainer.style.lineHeight = lineHeight;
    }
    const theme = settings.theme || "sepia";
    body.dataset.readerTheme = theme;
  }

  function persist() {
    ReaderSettingsStore.save(settings);
  }

  function setTheme(theme) {
    if (settings.theme === theme) return false;
    settings.theme = theme;
    apply();
    persist();
    return true;
  }

  function setFontSize(size) {
    const value = Math.min(Math.max(size, 16), 26);
    settings.fontSize = value;
    apply();
    persist();
    return value;
  }

  function getThemeLabel(theme) {
    switch (theme) {
      case "night":
        return "夜间";
      case "day":
        return "晨光";
      case "sepia":
      default:
        return "纸感";
    }
  }

  return {
    settings,
    apply,
    persist,
    setTheme,
    setFontSize,
    getThemeLabel
  };
}
