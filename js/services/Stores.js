const storage = window.localStorage;

function safeParse(json, fallback = null) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (error) {
    console.warn("[Stores] Failed to parse JSON from localStorage.", error);
    return fallback;
  }
}

export const ReaderSettingsStore = {
  KEY: "novel:reader-settings",
  LEGACY_KEYS: ["xinghai-reader-settings"],
  load() {
    const data = safeParse(storage.getItem(this.KEY));
    if (data) {
      return data;
    }
    for (const legacyKey of this.LEGACY_KEYS) {
      const legacy = safeParse(storage.getItem(legacyKey));
      if (legacy) {
        this.save(legacy);
        storage.removeItem(legacyKey);
        return legacy;
      }
    }
    return null;
  },
  save(settings) {
    try {
      storage.setItem(this.KEY, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.warn("[Stores] Failed to persist reader settings.", error);
      return false;
    }
  }
};

export const DraftStore = {
  KEY: "novel:draft",
  load() {
    return safeParse(storage.getItem(this.KEY), null);
  },
  save(snapshot) {
    try {
      storage.setItem(this.KEY, JSON.stringify(snapshot));
      return true;
    } catch (error) {
      console.warn("[Stores] Failed to persist draft.", error);
      return false;
    }
  }
};

export const ShellThemeStore = {
  KEY: "novel:shell-theme",
  LEGACY_KEYS: ["xinghai-shell-theme"],
  load() {
    const value = storage.getItem(this.KEY);
    if (value) {
      return value;
    }
    for (const legacyKey of this.LEGACY_KEYS) {
      const legacyValue = storage.getItem(legacyKey);
      if (legacyValue) {
        this.save(legacyValue);
        storage.removeItem(legacyKey);
        return legacyValue;
      }
    }
    return null;
  },
  save(mode) {
    try {
      storage.setItem(this.KEY, mode);
      return true;
    } catch (error) {
      console.warn("[Stores] Failed to persist shell theme.", error);
      return false;
    }
  }
};

export const ProgressStore = {
  keyFor(slug, context = "reader") {
    const cleanSlug = String(slug || "").trim();
    if (!cleanSlug) return null;
    return context === "modal" ? `progress:modal:${cleanSlug}` : `progress:${cleanSlug}`;
  },
  load(slug, context = "reader") {
    const key = this.keyFor(slug, context);
    if (!key) return 0;
    const raw = storage.getItem(key);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  },
  save(slug, context = "reader", value = 0) {
    const key = this.keyFor(slug, context);
    if (!key) return false;
    const clamped = Math.min(Math.max(Number(value) || 0, 0), 1);
    try {
      storage.setItem(key, clamped.toFixed(4));
      return true;
    } catch (error) {
      console.warn("[Stores] Failed to persist progress.", error);
      return false;
    }
  }
};

export const LastReadStore = {
  KEY: "novel:lastread:v1",
  get() {
    const data = safeParse(storage.getItem(this.KEY));
    if (!data || typeof data.slug !== "string" || !data.slug.trim()) {
      this.clear();
      return null;
    }
    return {
      slug: data.slug.trim(),
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0
    };
  },
  set(record) {
    if (!record || typeof record.slug !== "string" || !record.slug.trim()) {
      return false;
    }
    const payload = {
      slug: record.slug.trim(),
      updatedAt: Date.now()
    };
    try {
      storage.setItem(this.KEY, JSON.stringify(payload));
      return true;
    } catch (error) {
      console.warn("[Stores] Failed to persist last-read chapter.", error);
      return false;
    }
  },
  clear() {
    storage.removeItem(this.KEY);
  }
};

export const AnnotationStore = {
  KEY_BOOKMARKS: "novel:ann:bookmarks:v1",
  KEY_HIGHLIGHTS: "novel:ann:highlights:v1",

  // Bookmarks
  getBookmarks(slug) {
    const all = safeParse(storage.getItem(this.KEY_BOOKMARKS), []);
    if (!Array.isArray(all)) return [];
    const filtered = all.filter((bm) => {
      return (
        bm &&
        typeof bm === "object" &&
        typeof bm.id === "string" &&
        typeof bm.slug === "string" &&
        bm.slug === String(slug || "").trim() &&
        typeof bm.percent === "number" &&
        bm.percent >= 0 &&
        bm.percent <= 1
      );
    });
    return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  addBookmark(bm) {
    if (
      !bm ||
      typeof bm !== "object" ||
      typeof bm.id !== "string" ||
      !bm.id.trim() ||
      typeof bm.slug !== "string" ||
      !bm.slug.trim() ||
      typeof bm.percent !== "number" ||
      bm.percent < 0 ||
      bm.percent > 1
    ) {
      return false;
    }
    try {
      const all = safeParse(storage.getItem(this.KEY_BOOKMARKS), []);
      if (!Array.isArray(all)) {
        storage.setItem(this.KEY_BOOKMARKS, JSON.stringify([bm]));
        return true;
      }
      // Remove existing with same ID if present
      const filtered = all.filter((item) => item.id !== bm.id);
      filtered.push(bm);
      storage.setItem(this.KEY_BOOKMARKS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to add bookmark.", error);
      return false;
    }
  },

  removeBookmark(id) {
    if (typeof id !== "string" || !id.trim()) return false;
    try {
      const all = safeParse(storage.getItem(this.KEY_BOOKMARKS), []);
      if (!Array.isArray(all)) return false;
      const filtered = all.filter((item) => item.id !== id);
      if (filtered.length === all.length) return false; // Nothing removed
      storage.setItem(this.KEY_BOOKMARKS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to remove bookmark.", error);
      return false;
    }
  },

  // Highlights
  getHighlights(slug) {
    const all = safeParse(storage.getItem(this.KEY_HIGHLIGHTS), []);
    if (!Array.isArray(all)) return [];
    const filtered = all.filter((hl) => {
      return (
        hl &&
        typeof hl === "object" &&
        typeof hl.id === "string" &&
        typeof hl.slug === "string" &&
        hl.slug === String(slug || "").trim() &&
        typeof hl.start === "number" &&
        typeof hl.end === "number" &&
        hl.start >= 0 &&
        hl.end > hl.start &&
        typeof hl.color === "string"
      );
    });
    return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  addHighlight(hl) {
    if (
      !hl ||
      typeof hl !== "object" ||
      typeof hl.id !== "string" ||
      !hl.id.trim() ||
      typeof hl.slug !== "string" ||
      !hl.slug.trim() ||
      typeof hl.start !== "number" ||
      typeof hl.end !== "number" ||
      hl.start < 0 ||
      hl.end <= hl.start ||
      typeof hl.color !== "string"
    ) {
      return false;
    }
    try {
      const all = safeParse(storage.getItem(this.KEY_HIGHLIGHTS), []);
      if (!Array.isArray(all)) {
        storage.setItem(this.KEY_HIGHLIGHTS, JSON.stringify([hl]));
        return true;
      }
      // Remove existing with same ID if present
      const filtered = all.filter((item) => item.id !== hl.id);
      filtered.push(hl);
      storage.setItem(this.KEY_HIGHLIGHTS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to add highlight.", error);
      return false;
    }
  },

  updateHighlight(id, patch) {
    if (typeof id !== "string" || !id.trim() || !patch || typeof patch !== "object") {
      return false;
    }
    try {
      const all = safeParse(storage.getItem(this.KEY_HIGHLIGHTS), []);
      if (!Array.isArray(all)) return false;
      const index = all.findIndex((item) => item.id === id);
      if (index === -1) return false;
      const updated = { ...all[index], ...patch };
      // Re-validate
      if (
        typeof updated.id !== "string" ||
        typeof updated.slug !== "string" ||
        typeof updated.start !== "number" ||
        typeof updated.end !== "number" ||
        updated.start < 0 ||
        updated.end <= updated.start ||
        typeof updated.color !== "string"
      ) {
        return false;
      }
      all[index] = updated;
      storage.setItem(this.KEY_HIGHLIGHTS, JSON.stringify(all));
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to update highlight.", error);
      return false;
    }
  },

  removeHighlight(id) {
    if (typeof id !== "string" || !id.trim()) return false;
    try {
      const all = safeParse(storage.getItem(this.KEY_HIGHLIGHTS), []);
      if (!Array.isArray(all)) return false;
      const filtered = all.filter((item) => item.id !== id);
      if (filtered.length === all.length) return false; // Nothing removed
      storage.setItem(this.KEY_HIGHLIGHTS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to remove highlight.", error);
      return false;
    }
  },

  // Generic remove (works for both)
  remove(id) {
    if (typeof id !== "string" || !id.trim()) return false;
    const isBookmark = id.startsWith("bm_");
    const isHighlight = id.startsWith("hl_");
    if (isBookmark) {
      return this.removeBookmark(id);
    }
    if (isHighlight) {
      return this.removeHighlight(id);
    }
    // Try both
    const removedBookmark = this.removeBookmark(id);
    const removedHighlight = this.removeHighlight(id);
    return removedBookmark || removedHighlight;
  }
};

const Stores = Object.freeze({
  ReaderSettingsStore,
  DraftStore,
  ShellThemeStore,
  ProgressStore,
  LastReadStore,
  AnnotationStore
});

export default Stores;
