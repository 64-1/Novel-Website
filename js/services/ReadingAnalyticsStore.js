const storage = window.localStorage;

function safeParse(json, fallback = null) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("[ReadingAnalyticsStore] Failed to parse JSON from localStorage.", error);
    return fallback;
  }
}

const DEFAULT_STATE = {
  days: {}
};

const ReadingAnalyticsStore = {
  KEY: "novel:reader-analytics:v1",
  load() {
    const data = safeParse(storage.getItem(this.KEY), null);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ...DEFAULT_STATE };
    }
    if (!data.days || typeof data.days !== "object") {
      data.days = {};
    }
    return {
      days: { ...data.days }
    };
  },
  save(state) {
    if (!state || typeof state !== "object") {
      return false;
    }
    const payload = {
      days: state.days && typeof state.days === "object" ? state.days : {}
    };
    try {
      storage.setItem(this.KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn("[ReadingAnalyticsStore] Failed to persist analytics.", error);
      return false;
    }
  }
};

export { ReadingAnalyticsStore };
export default ReadingAnalyticsStore;
