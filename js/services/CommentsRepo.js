const DEFAULT_OPTIONS = {
  url: "/data/comments.json",
  fallback: {}
};

let commentMap = new Map();
let loaded = false;
let loadPromise = null;

function sanitizeComment(raw, slug, index) {
  if (!raw || typeof raw !== "object") return null;
  const idBase = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `comment-${index + 1}`;
  const id = `${slug}::${idBase}`;
  const author = typeof raw.author === "string" && raw.author.trim() ? raw.author.trim() : "匿名读者";
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (!content) return null;
  const createdAt =
    typeof raw.createdAt === "number" && Number.isFinite(raw.createdAt)
      ? raw.createdAt
      : Date.now() - Math.floor(Math.random() * 86_400_000);
  return {
    id,
    slug,
    author,
    content,
    createdAt
  };
}

function ingest(rawMap) {
  commentMap = new Map();
  if (!rawMap || typeof rawMap !== "object") {
    loaded = true;
    return commentMap;
  }
  Object.entries(rawMap).forEach(([slug, list]) => {
    if (!Array.isArray(list)) return;
    const sanitized = list
      .map((item, index) => sanitizeComment(item, slug, index))
      .filter(Boolean)
      .sort((a, b) => a.createdAt - b.createdAt);
    commentMap.set(slug, sanitized);
  });
  loaded = true;
  return commentMap;
}

export async function load(options = {}) {
  if (loaded) {
    return commentMap;
  }
  if (loadPromise) {
    return loadPromise;
  }

  const { url, fallback } = { ...DEFAULT_OPTIONS, ...options };

  loadPromise = fetch(url, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch comments.json (${response.status})`);
      }
      return response.json();
    })
    .then((data) => ingest(data))
    .catch((error) => {
      console.warn("[CommentsRepo] Falling back to embedded comments.", error);
      const safeFallback = fallback && typeof fallback === "object" ? fallback : {};
      return ingest(safeFallback);
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export function getBySlug(slug) {
  if (!slug) return [];
  const key = String(slug).trim();
  if (!key) return [];
  return commentMap.get(key) ? [...commentMap.get(key)] : [];
}

export default {
  load,
  getBySlug
};
