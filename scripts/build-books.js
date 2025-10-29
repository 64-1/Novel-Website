#!/usr/bin/env node
/**
 * Build a flattened catalog of novels for site-wide search.
 * Looks for per-novel meta.json files under ./novel/<slug>/meta.json.
 * Falls back to stub data when nothing is discovered so the UI still works.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const NOVELS_DIR = path.join(ROOT, "novel");
const OUTPUT_PATH = path.join(ROOT, "data", "books.json");

/**
 * Normalize a value into a non-empty trimmed string or null.
 */
function cleanString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Normalizes tags / genres arrays.
 */
function cleanStringArray(value) {
  if (!value) return null;
  if (!Array.isArray(value)) {
    if (typeof value === "string") {
      const pieces = value
        .split(/[,，]/)
        .map((part) => part.trim())
        .filter(Boolean);
      return pieces.length ? pieces : null;
    }
    return null;
  }

  const items = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : null))
    .filter(Boolean);
  return items.length ? items : null;
}

/**
 * Reads a JSON file safely.
 */
function readJson(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[build-books] Failed to read ${filePath}: ${error.message}`);
    return null;
  }
}

function ensureOutputDir() {
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function deriveCover(slug) {
  const relativePath = path.join("novel", slug, "cover.jpg");
  const absolutePath = path.join(ROOT, relativePath);
  return fs.existsSync(absolutePath) ? `/${relativePath.replace(/\\/g, "/")}` : null;
}

function toPositiveNumber(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return fallback;
  }
  return Math.round(num);
}

function normalizeEntry(rawMeta, slug) {
  if (!rawMeta || typeof rawMeta !== "object") {
    return null;
  }

  const entrySlug = cleanString(rawMeta.slug) || slug;
  if (!entrySlug) {
    return null;
  }

  const baseTitle = cleanString(rawMeta.title);
  const titleZh = cleanString(rawMeta.title_zh);
  const titleEn = cleanString(rawMeta.title_en);
  const author = cleanString(rawMeta.author);
  const summary = cleanString(rawMeta.summary);
  const cover = cleanString(rawMeta.cover) || deriveCover(entrySlug);

  const reads = toPositiveNumber(rawMeta.reads, 0);
  const likes = toPositiveNumber(rawMeta.likes, 0);
  const bookmarks = toPositiveNumber(rawMeta.bookmarks, 0);

  const tags = cleanStringArray(rawMeta.tags);
  const genres = cleanStringArray(rawMeta.genres);
  const chaptersCount =
    typeof rawMeta.chapters_count === "number" ? rawMeta.chapters_count : null;
  const updatedAt = cleanString(rawMeta.updated_at) || new Date().toISOString();

  return {
    slug: entrySlug,
    title: baseTitle,
    title_zh: titleZh,
    title_en: titleEn,
    author,
    tags,
    genres,
    summary,
    cover,
    reads,
    likes,
    bookmarks,
    chapters_count: chaptersCount,
    updated_at: updatedAt
  };
}

function collectNovels() {
  if (!fs.existsSync(NOVELS_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(NOVELS_DIR, { withFileTypes: true });
  const novels = [];

  entries.forEach((dirent) => {
    if (!dirent.isDirectory()) {
      return;
    }
    const slug = dirent.name;
    const metaPath = path.join(NOVELS_DIR, slug, "meta.json");
    if (!fs.existsSync(metaPath)) {
      return;
    }
    const raw = readJson(metaPath);
    const normalized = normalizeEntry(raw, slug);
    if (normalized) {
      novels.push(normalized);
    }
  });

  return novels;
}

function createFallbackCatalog() {
  return [
    {
      slug: "lightfall-ode",
      title: "晨光谱系",
      title_zh: "晨光谱系",
      title_en: "Lightfall Ode",
      author: "黎川",
      tags: ["科幻", "群像", "慢热"],
      genres: ["科幻"],
      summary: "浮城里的记忆回廊开启前夕，年轻人们尝试重塑真实与自我。",
      cover: null,
      reads: 14820,
      likes: 936,
      bookmarks: 612,
      chapters_count: 28,
      updated_at: "2024-05-14T09:00:00.000Z"
    },
    {
      slug: "tide-echoes",
      title: "霓虹与海",
      title_zh: "霓虹与海",
      title_en: "Tide Echoes",
      author: "夏茗",
      tags: ["都市", "群像", "青春"],
      genres: ["都市"],
      summary: "四个年轻人于夜色之城互相取暖，交织出多重人生轨迹。",
      cover: null,
      reads: 9820,
      likes: 754,
      bookmarks: 488,
      chapters_count: 42,
      updated_at: "2024-04-28T09:00:00.000Z"
    },
    {
      slug: "nocturne-resonance",
      title: "静夜共鸣",
      title_zh: "静夜共鸣",
      title_en: "Nocturne Resonance",
      author: "墨影",
      tags: ["幻想", "悬疑"],
      genres: ["幻想"],
      summary: "记忆回廊开启前夜，浮城灯火下的心声汇聚成新的共鸣。",
      cover: null,
      reads: 11240,
      likes: 812,
      bookmarks: 532,
      chapters_count: 36,
      updated_at: "2024-03-30T09:00:00.000Z"
    }
  ];
}

function sortCatalog(catalog) {
  return catalog.sort((a, b) => {
    const titleA = (a.title || a.title_zh || a.title_en || a.slug || "").toLowerCase();
    const titleB = (b.title || b.title_zh || b.title_en || b.slug || "").toLowerCase();
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return a.slug.localeCompare(b.slug);
  });
}

function main() {
  let catalog = collectNovels();
  if (!catalog.length) {
    console.warn("[build-books] No novels discovered, creating fallback catalog.");
    catalog = createFallbackCatalog();
  }
  catalog = catalog.filter((entry) => entry?.slug);
  catalog = sortCatalog(catalog);

  ensureOutputDir();
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2), "utf8");
  console.log(`[build-books] Wrote ${catalog.length} entries to ${OUTPUT_PATH}`);
}

main();
