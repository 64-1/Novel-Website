const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FRESHNESS_WINDOW_DAYS = 365;
const TRENDING_HALF_LIFE_DAYS = 30;

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toTimestamp(value) {
  const time = typeof value === "string" ? Date.parse(value) : Number(value);
  return Number.isFinite(time) ? time : null;
}

export function popularityScore(item = {}) {
  const reads = Math.max(0, toNumber(item.reads));
  const likes = Math.max(0, toNumber(item.likes));
  const bookmarks = Math.max(0, toNumber(item.bookmarks));
  const updated = toTimestamp(item.updated_at);

  const readFactor = Math.log1p(reads) * 1.4;
  const likeFactor = Math.log1p(likes) * 1.1;
  const bookmarkFactor = Math.log1p(bookmarks) * 1.2;

  let freshnessBoost = 0;
  if (updated) {
    const daysOld = (Date.now() - updated) / MS_PER_DAY;
    const freshnessRatio = Math.max(0, 1 - Math.min(daysOld, FRESHNESS_WINDOW_DAYS) / FRESHNESS_WINDOW_DAYS);
    freshnessBoost = freshnessRatio * 4;
  }

  return readFactor + likeFactor + bookmarkFactor + freshnessBoost;
}

function updatedAtValue(item = {}) {
  const ts = toTimestamp(item.updated_at);
  if (!ts) {
    return 0;
  }
  return ts;
}

export function trendingScore(item = {}) {
  const base = popularityScore(item);
  const reads = Math.max(0, toNumber(item.reads));
  const likes = Math.max(0, toNumber(item.likes));
  const bookmarks = Math.max(0, toNumber(item.bookmarks));
  const updated = toTimestamp(item.updated_at);

  const engagement =
    Math.log1p(reads) * 0.75 + Math.log1p(likes * 2 + bookmarks * 2.5) * 1.35;

  let decay = 0.35; // default bias so older titles still surface slightly
  if (updated) {
    const ageDays = Math.max(0, (Date.now() - updated) / MS_PER_DAY);
    decay = Math.pow(0.5, ageDays / TRENDING_HALF_LIFE_DAYS);
  }

  return base * 0.55 + engagement * decay * 1.45;
}

/**
 * Sorts search results.
 * @param {Array} list - Array of raw items or Fuse results.
 * @param {Object} options
 * @param {string} [options.mode="pop"] - "trending" | "pop" | "updated"
 * @param {boolean} [options.isFuse=false] - Whether entries are Fuse search result objects.
 * @returns {Array}
 */
export function sortResults(list = [], { mode = "pop", isFuse = false } = {}) {
  const decorated = list.map((entry, index) => {
    const item = isFuse ? entry.item ?? entry : entry;
    return {
      original: entry,
      item,
      index,
      score: popularityScore(item),
      updated: updatedAtValue(item),
      trending: trendingScore(item)
    };
  });

  decorated.sort((a, b) => {
    if (mode === "trending") {
      if (b.trending !== a.trending) {
        return b.trending - a.trending;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
    } else if (mode === "updated") {
      if (b.updated !== a.updated) {
        return b.updated - a.updated;
      }
      if (b.score !== a.score) {
        return b.score - a.score;
      }
    } else {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.updated !== a.updated) {
        return b.updated - a.updated;
      }
    }
    return a.index - b.index;
  });

  return decorated.map((entry) => entry.original);
}
