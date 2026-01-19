import ApiClient from "./ApiClient.js";
import { ReaderSettingsStore } from "./Stores.js";

const DEFAULT_SETTINGS = {
  fontSize: 20,
  lineHeight: 1.8,
  theme: "sepia",
  font: "serif"
};

function normalize(settings = {}) {
  return {
    fontSize: Math.min(Math.max(Number(settings.fontSize) || DEFAULT_SETTINGS.fontSize, 16), 28),
    lineHeight: Number(settings.lineHeight) || DEFAULT_SETTINGS.lineHeight,
    theme: typeof settings.theme === "string" ? settings.theme : DEFAULT_SETTINGS.theme,
    font: settings.font === "sans" ? "sans" : "serif"
  };
}

export async function loadReaderPreferences() {
  const cached = ReaderSettingsStore.load();
  const fallback = normalize(cached || DEFAULT_SETTINGS);
  if (!ApiClient.isAuthenticated()) {
    return fallback;
  }
  try {
    const data = await ApiClient.getPreferences();
    if (data?.preferences) {
      const remote = normalize({
        fontSize: data.preferences.fontSize,
        lineHeight: data.preferences.lineHeight,
        theme: data.preferences.readingTheme || data.preferences.theme,
        font: data.preferences.font
      });
      ReaderSettingsStore.save(remote);
      return remote;
    }
    return fallback;
  } catch (error) {
    console.warn("[PreferencesService] Failed to load remote preferences", error);
    return fallback;
  }
}

export async function saveReaderPreferences(settings) {
  const normalized = normalize(settings);
  ReaderSettingsStore.save(normalized);
  if (!ApiClient.isAuthenticated()) {
    return normalized;
  }
  try {
    await ApiClient.updatePreferences({
      fontSize: normalized.fontSize,
      lineHeight: normalized.lineHeight,
      readingTheme: normalized.theme,
      font: normalized.font
    });
  } catch (error) {
    console.warn("[PreferencesService] Failed to persist preferences", error);
  }
  return normalized;
}

export default {
  loadReaderPreferences,
  saveReaderPreferences
};
