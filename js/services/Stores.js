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
  _subscribers: [],
  _loadArray(key, fallback = []) {
    const parsed = safeParse(storage.getItem(key), fallback);
    return Array.isArray(parsed) ? parsed : [];
  },
  _saveArray(key, list) {
    storage.setItem(key, JSON.stringify(list));
  },

  // Subscribe/unsubscribe for pub-sub
  subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    this._subscribers.push(fn);
    return () => {
      const index = this._subscribers.indexOf(fn);
      if (index >= 0) {
        this._subscribers.splice(index, 1);
      }
    };
  },

  unsubscribe(fn) {
    const index = this._subscribers.indexOf(fn);
    if (index >= 0) {
      this._subscribers.splice(index, 1);
    }
  },

  _notify() {
    this._subscribers.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn("[AnnotationStore] Subscriber error:", error);
      }
    });
  },

  // Bookmarks
  getAllBookmarks() {
    const all = this._loadArray(this.KEY_BOOKMARKS, []);
    const validated = all.filter((bm) => {
      return (
        bm &&
        typeof bm === "object" &&
        typeof bm.id === "string" &&
        typeof bm.slug === "string" &&
        typeof bm.percent === "number" &&
        bm.percent >= 0 &&
        bm.percent <= 1
      );
    });
    return validated.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  },

  getBookmarks(slug) {
    const all = this._loadArray(this.KEY_BOOKMARKS, []);
    const filtered = all.filter((bm) => {
      return (
        bm &&
        typeof bm === "object" &&
        typeof bm.id === "string" &&
        typeof bm.slug === "string" &&
        bm.slug === String(slug || "").trim() &&
        typeof bm.percent === "number" &&
        bm.percent >= 0 &&
        bm.percent <= 1 &&
        (typeof bm.bookPercent !== "number" || (bm.bookPercent >= 0 && bm.bookPercent <= 1)) &&
        (typeof bm.snippet === "undefined" || typeof bm.snippet === "string")
      );
    });
    return filtered
      .map((bm) => ({
        ...bm,
        bookPercent:
          typeof bm.bookPercent === "number" ? Math.min(Math.max(bm.bookPercent, 0), 1) : null,
        snippet: typeof bm.snippet === "string" ? bm.snippet : ""
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
      const sanitized = {
        ...bm,
        bookPercent:
          typeof bm.bookPercent === "number" ? Math.min(Math.max(bm.bookPercent, 0), 1) : null,
        snippet: typeof bm.snippet === "string" ? bm.snippet : ""
      };
      const all = safeParse(storage.getItem(this.KEY_BOOKMARKS), []);
      if (!Array.isArray(all)) {
        storage.setItem(this.KEY_BOOKMARKS, JSON.stringify([sanitized]));
        this._notify();
        return true;
      }
      // Remove existing with same ID if present
      const filtered = all.filter((item) => item.id !== sanitized.id);
      filtered.push(sanitized);
      storage.setItem(this.KEY_BOOKMARKS, JSON.stringify(filtered));
      this._notify();
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to add bookmark.", error);
      return false;
    }
  },

  removeBookmark(id) {
    if (typeof id !== "string" || !id.trim()) return false;
    try {
      const all = this._loadArray(this.KEY_BOOKMARKS, []);
      const filtered = all.filter((item) => item.id !== id);
      if (filtered.length === all.length) return false; // Nothing removed
      storage.setItem(this.KEY_BOOKMARKS, JSON.stringify(filtered));
      this._notify();
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to remove bookmark.", error);
      return false;
    }
  },

  updateBookmark(id, patch = {}) {
    if (typeof id !== "string" || !id.trim() || typeof patch !== "object") {
      return false;
    }
    try {
      const all = this._loadArray(this.KEY_BOOKMARKS, []);
      const index = all.findIndex((item) => item.id === id);
      if (index === -1) return false;
      const updated = { ...all[index], ...patch };
      if (
        typeof updated.id !== "string" ||
        typeof updated.slug !== "string" ||
        typeof updated.percent !== "number"
      ) {
        return false;
      }
      all[index] = updated;
      this._saveArray(this.KEY_BOOKMARKS, all);
      this._notify();
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to update bookmark.", error);
      return false;
    }
  },

  // Highlights
  getHighlights(slug) {
    const all = this._loadArray(this.KEY_HIGHLIGHTS, []);
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
      const all = this._loadArray(this.KEY_HIGHLIGHTS, []);
      if (!Array.isArray(all) || all.length === 0) {
        this._saveArray(this.KEY_HIGHLIGHTS, [hl]);
        return true;
      }
      // Remove existing with same ID if present
      const filtered = all.filter((item) => item.id !== hl.id);
      filtered.push(hl);
      this._saveArray(this.KEY_HIGHLIGHTS, filtered);
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
      const all = this._loadArray(this.KEY_HIGHLIGHTS, []);
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
      this._saveArray(this.KEY_HIGHLIGHTS, all);
      return true;
    } catch (error) {
      console.warn("[AnnotationStore] Failed to update highlight.", error);
      return false;
    }
  },

  removeHighlight(id) {
    if (typeof id !== "string" || !id.trim()) return false;
    try {
      const all = this._loadArray(this.KEY_HIGHLIGHTS, []);
      const filtered = all.filter((item) => item.id !== id);
      if (filtered.length === all.length) return false; // Nothing removed
      this._saveArray(this.KEY_HIGHLIGHTS, filtered);
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
  },

  setBookmarksForSlug(slug, bookmarks = []) {
    if (!slug) return false;
    const existing = this._loadArray(this.KEY_BOOKMARKS, []);
    const remaining = existing.filter((bm) => bm.slug !== slug);
    const sanitized = bookmarks
      .map((bm) => ({
        ...bm,
        slug,
        id: typeof bm.id === "string" ? bm.id : `bm_remote_${bm.createdAt || Date.now()}`,
        createdAt: bm.createdAt || Date.now()
      }))
      .filter((bm) => typeof bm.percent === "number" && bm.percent >= 0 && bm.percent <= 1);
    this._saveArray(this.KEY_BOOKMARKS, [...remaining, ...sanitized]);
    this._notify();
    return true;
  },

  setHighlightsForSlug(slug, highlights = []) {
    if (!slug) return false;
    const existing = this._loadArray(this.KEY_HIGHLIGHTS, []);
    const remaining = existing.filter((hl) => hl.slug !== slug);
    const sanitized = highlights
      .map((hl) => ({
        ...hl,
        slug,
        id: typeof hl.id === "string" ? hl.id : `hl_remote_${hl.createdAt || Date.now()}`,
        createdAt: hl.createdAt || Date.now()
      }))
      .filter(
        (hl) =>
          typeof hl.start === "number" &&
          typeof hl.end === "number" &&
          hl.start >= 0 &&
          hl.end > hl.start
      );
    this._saveArray(this.KEY_HIGHLIGHTS, [...remaining, ...sanitized]);
    this._notify();
    return true;
  },

  replaceBookmark(oldId, nextBookmark) {
    if (!oldId || !nextBookmark) return false;
    const all = this._loadArray(this.KEY_BOOKMARKS, []);
    const index = all.findIndex((bm) => bm.id === oldId);
    if (index === -1) return false;
    all[index] = nextBookmark;
    this._saveArray(this.KEY_BOOKMARKS, all);
    this._notify();
    return true;
  },

  replaceHighlight(oldId, nextHighlight) {
    if (!oldId || !nextHighlight) return false;
    const all = this._loadArray(this.KEY_HIGHLIGHTS, []);
    const index = all.findIndex((hl) => hl.id === oldId);
    if (index === -1) return false;
    all[index] = nextHighlight;
    this._saveArray(this.KEY_HIGHLIGHTS, all);
    this._notify();
    return true;
  }
};

export const CodexStore = {
  KEY: "novel:codex:entries:v1",
  _subscribers: [],

  subscribe(fn) {
    if (typeof fn !== "function") {
      return () => {};
    }
    this._subscribers.push(fn);
    return () => {
      const index = this._subscribers.indexOf(fn);
      if (index >= 0) {
        this._subscribers.splice(index, 1);
      }
    };
  },

  _notify() {
    this._subscribers.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn("[CodexStore] Subscriber error:", error);
      }
    });
  },

  loadAll() {
    const parsed = safeParse(storage.getItem(this.KEY), []);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => this._normalize(entry)).filter(Boolean);
  },

  saveAll(entries) {
    if (!Array.isArray(entries)) {
      return false;
    }
    const normalized = entries.map((entry) => this._normalize(entry)).filter(Boolean);
    try {
      storage.setItem(this.KEY, JSON.stringify(normalized));
      this._notify();
      return true;
    } catch (error) {
      console.warn("[CodexStore] Failed to persist entries.", error);
      return false;
    }
  },

  add(entry) {
    const normalized = this._normalize(entry);
    if (!normalized) {
      return false;
    }
    const existing = this.loadAll();
    const index = existing.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      existing[index] = normalized;
    } else {
      existing.push(normalized);
    }
    return this.saveAll(existing);
  },

  remove(id) {
    if (!id) return false;
    const existing = this.loadAll();
    const filtered = existing.filter((entry) => entry.id !== id);
    return this.saveAll(filtered);
  },

  _normalize(entry) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : null;
    const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : null;
    const type = typeof entry.type === "string" && entry.type.trim() ? entry.type.trim() : "concept";

    if (!id || !name) {
      return null;
    }

    const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
    const tags = Array.isArray(entry.tags)
      ? entry.tags.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)
      : [];
    const terms = Array.isArray(entry.terms)
      ? entry.terms.map((term) => (typeof term === "string" ? term.trim() : "")).filter(Boolean)
      : [];
    const chapters = Array.isArray(entry.chapters)
      ? entry.chapters.map((chap) => (typeof chap === "string" ? chap.trim() : "")).filter(Boolean)
      : [];
    const details = Array.isArray(entry.details)
      ? entry.details
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const label = typeof item.label === "string" ? item.label.trim() : "";
            const value = typeof item.value === "string" ? item.value.trim() : "";
            if (!label && !value) return null;
            return { label, value };
          })
          .filter(Boolean)
      : [];
    const timeline = Array.isArray(entry.timeline)
      ? entry.timeline
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const label = typeof item.label === "string" ? item.label.trim() : "";
            const value = typeof item.value === "string" ? item.value.trim() : "";
            if (!label && !value) return null;
            return { label, value };
          })
          .filter(Boolean)
      : [];

    return {
      id,
      type,
      name,
      summary,
      tags,
      terms,
      chapters,
      details,
      timeline,
      updatedAt: Date.now()
    };
  }
};

const Stores = Object.freeze({
  ReaderSettingsStore,
  DraftStore,
  ShellThemeStore,
  ProgressStore,
  LastReadStore,
  AnnotationStore,
  CodexStore
});

export default Stores;
