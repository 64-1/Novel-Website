(function (global) {
  if (global.NovelStores) {
    return;
  }

  const storage = global.localStorage;

  function safeParse(json, fallback = null) {
    if (!json) return fallback;
    try {
      return JSON.parse(json);
    } catch (error) {
      console.warn("[Stores] Failed to parse JSON from localStorage.", error);
      return fallback;
    }
  }

  const ReaderSettingsStore = {
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

  const DraftStore = {
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

  const ShellThemeStore = {
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

  const ProgressStore = {
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

  global.NovelStores = Object.freeze({
    ReaderSettingsStore,
    DraftStore,
    ShellThemeStore,
    ProgressStore
  });
})(window);
