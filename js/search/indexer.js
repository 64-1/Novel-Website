const SNIPPET_CHARS_BEFORE = 30;
const SNIPPET_CHARS_AFTER = 40;
const MAX_SNIPPETS_PER_CHAPTER = 5;
const MAX_CHAPTERS_TO_SHOW = 50;

/**
 * Normalizes query: lowercases Latin characters, keeps CJK as-is
 */
export function normalizeQuery(q) {
  if (!q || typeof q !== "string") return "";
  // Lowercase only Latin characters (basic ASCII A-Z)
  return q.replace(/[A-Z]/g, (char) => char.toLowerCase());
}

/**
 * Extracts text from chapter paragraphs, inserting spaces between blocks
 */
function extractChapterText(chapter) {
  if (!chapter || !Array.isArray(chapter.paragraphs)) {
    return "";
  }
  const textPieces = [];
  chapter.paragraphs.forEach((para) => {
    if (typeof para === "string") {
      textPieces.push(para);
    } else if (para && typeof para === "object" && para.text) {
      textPieces.push(para.text);
    }
  });
  // Insert spaces between paragraphs to avoid cross-paragraph false positives
  return textPieces.join(" ");
}

/**
 * Builds a lightweight search index from chapters
 * Returns a map of slug -> { slug, title, text }
 */
export function buildIndex(chapters) {
  if (!Array.isArray(chapters)) {
    return new Map();
  }
  const index = new Map();
  chapters.forEach((chapter) => {
    if (!chapter || !chapter.slug) return;
    const text = extractChapterText(chapter);
    index.set(chapter.slug, {
      slug: chapter.slug,
      title: chapter.title || "",
      text
    });
  });
  return index;
}

/**
 * Finds snippet around a match position
 */
function extractSnippet(text, matchIndex, matchLength, charsBefore, charsAfter) {
  const start = Math.max(0, matchIndex - charsBefore);
  const end = Math.min(text.length, matchIndex + matchLength + charsAfter);
  const before = text.slice(start, matchIndex);
  const match = text.slice(matchIndex, matchIndex + matchLength);
  const after = text.slice(matchIndex + matchLength, end);
  return { before, match, after };
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Searches the index for a query
 * Returns array of { slug, title, count, snippets: [{ before, match, after }] }
 */
export function searchIndex(index, query, opts = {}) {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  const {
    maxChapters = MAX_CHAPTERS_TO_SHOW,
    maxSnippetsPerChapter = MAX_SNIPPETS_PER_CHAPTER
  } = opts;

  const results = [];

  // Escape query for RegExp (simple approach for substring matching)
  // For CJK, we want literal matching; for Latin, case-insensitive
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let regex;
  try {
    // Use unicode flag for CJK support, case-insensitive for Latin
    regex = new RegExp(escapedQuery, "giu");
  } catch (e) {
    // Fallback to simple substring search if regex fails
    regex = null;
  }

  for (const [slug, entry] of index.entries()) {
    const normalizedText = normalizeQuery(entry.text);
    const searchText = normalizedText;
    const originalText = entry.text;

    let matchCount = 0;
    const snippetMatches = [];

    if (regex) {
      // Use RegExp to find all matches
      const matches = Array.from(searchText.matchAll(regex));
      matchCount = matches.length;

      // Extract snippets for first N matches
      for (let i = 0; i < Math.min(matches.length, maxSnippetsPerChapter); i++) {
        const match = matches[i];
        const originalMatchIndex = match.index;
        const originalMatchLength = match[0].length;
        const snippet = extractSnippet(
          originalText,
          originalMatchIndex,
          originalMatchLength,
          SNIPPET_CHARS_BEFORE,
          SNIPPET_CHARS_AFTER
        );
        // Escape HTML in snippets
        snippet.before = escapeHtml(snippet.before);
        snippet.match = escapeHtml(snippet.match);
        snippet.after = escapeHtml(snippet.after);
        snippetMatches.push(snippet);
      }
    } else {
      // Fallback: simple substring search
      let searchIndex = 0;
      while (true) {
        const foundIndex = searchText.indexOf(normalizedQuery, searchIndex);
        if (foundIndex === -1) break;
        matchCount++;
        if (snippetMatches.length < maxSnippetsPerChapter) {
          const snippet = extractSnippet(
            originalText,
            foundIndex,
            normalizedQuery.length,
            SNIPPET_CHARS_BEFORE,
            SNIPPET_CHARS_AFTER
          );
          snippet.before = escapeHtml(snippet.before);
          snippet.match = escapeHtml(snippet.match);
          snippet.after = escapeHtml(snippet.after);
          snippetMatches.push(snippet);
        }
        searchIndex = foundIndex + normalizedQuery.length;
      }
    }

    if (matchCount > 0) {
      results.push({
        slug,
        title: entry.title,
        count: matchCount,
        snippets: snippetMatches
      });
    }
  }

  // Sort by match count (descending), then limit
  results.sort((a, b) => b.count - a.count);
  return results.slice(0, maxChapters);
}

