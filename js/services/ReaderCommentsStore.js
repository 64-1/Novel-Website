const storage = window.localStorage;

function safeParse(json, fallback = { bySlug: {} }) {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return fallback;
    if (!parsed.bySlug || typeof parsed.bySlug !== "object") {
      parsed.bySlug = {};
    }
    return parsed;
  } catch (error) {
    console.warn("[ReaderCommentsStore] Failed to parse comments from localStorage.", error);
    return { bySlug: {} };
  }
}

function safeSlug(slug) {
  return typeof slug === "string" && slug.trim() ? slug.trim() : null;
}

const ReaderCommentsStore = {
  KEY: "novel:reader-comments:v1",
  MAX_PER_SLUG: 50,
  _cache: null,

  _loadAll() {
    if (this._cache) return this._cache;
    const parsed = safeParse(storage.getItem(this.KEY));
    this._cache = parsed;
    return parsed;
  },

  list(slug) {
    const key = safeSlug(slug);
    if (!key) return [];
    const data = this._loadAll();
    const list = Array.isArray(data.bySlug[key]) ? data.bySlug[key] : [];
    return list
      .slice()
      .filter((item) => item && typeof item === "object" && typeof item.content === "string")
      .sort((a, b) => a.createdAt - b.createdAt);
  },

  add({ slug, content, author }) {
    const key = safeSlug(slug);
    const text = typeof content === "string" ? content.trim() : "";
    if (!key || !text) {
      return null;
    }
    const entry = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      slug: key,
      content: text,
      author: typeof author === "string" && author.trim() ? author.trim() : "我",
      createdAt: Date.now(),
      local: true
    };
    const data = this._loadAll();
    if (!Array.isArray(data.bySlug[key])) {
      data.bySlug[key] = [];
    }
    data.bySlug[key].push(entry);
    if (data.bySlug[key].length > this.MAX_PER_SLUG) {
      data.bySlug[key] = data.bySlug[key].slice(-this.MAX_PER_SLUG);
    }
    try {
      storage.setItem(this.KEY, JSON.stringify(data));
      return entry;
    } catch (error) {
      console.warn("[ReaderCommentsStore] Failed to persist comments.", error);
      return null;
    }
  }
};

export { ReaderCommentsStore };
export default ReaderCommentsStore;
