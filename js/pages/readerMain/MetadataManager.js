/**
 * MetadataManager
 * Manages SEO metadata, Open Graph tags, and canonical URLs for the reader page
 */

/**
 * Creates a metadata manager
 * @param {Object} config - Configuration object
 * @param {string} config.siteName - Site name for meta tags
 * @param {string} config.defaultDescription - Default meta description
 * @param {string} config.shareImage - Default share image path
 * @returns {Object} Metadata manager public API
 */
export function createMetadataManager(config = {}) {
  const metaConfig = {
    siteName: config.siteName || "星海小说",
    defaultDescription: config.defaultDescription || "",
    shareImage: config.shareImage || "/icons/icon-512.png"
  };

  /**
   * Truncates description to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length (default: 140)
   * @returns {string} Truncated text
   */
  function truncateDescription(text, maxLength = 140) {
    const normalized = (text || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
  }

  /**
   * Sets or updates a meta tag in the document head
   * @param {string} attribute - Attribute name ('name' or 'property')
   * @param {string} value - Attribute value
   * @param {string} content - Meta tag content
   */
  function setMetaTag(attribute, value, content) {
    if (!value) return;
    let tag = document.head.querySelector(`meta[${attribute}="${value}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attribute, value);
      document.head.appendChild(tag);
    }
    if (typeof content === "string") {
      tag.setAttribute("content", content);
    }
  }

  /**
   * Sets or updates the canonical link in the document head
   * @param {string} url - Canonical URL
   */
  function setCanonicalLink(url) {
    if (!url) return;
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", url);
  }

  /**
   * Builds canonical URL for a chapter
   * @param {string} slug - Chapter slug
   * @returns {string} Canonical URL
   */
  function buildCanonicalUrl(slug) {
    const origin = window.location.origin || "";
    if (!slug) {
      return origin;
    }
    return `${origin}/novel/${encodeURIComponent(slug)}`;
  }

  /**
   * Converts relative path to absolute URL
   * @param {string} path - Relative or absolute path
   * @returns {string} Absolute URL
   */
  function toAbsoluteUrl(path) {
    if (!path) {
      return "";
    }
    try {
      return new URL(path, window.location.origin).href;
    } catch {
      return path;
    }
  }

  /**
   * Extracts description from chapter data
   * @param {Object} chapter - Chapter object
   * @returns {string} Chapter description
   */
  function extractChapterDescription(chapter) {
    if (!chapter) {
      return metaConfig.defaultDescription;
    }

    // Try chapter summary first
    const summary = typeof chapter.summary === "string" ? chapter.summary.trim() : "";
    if (summary) {
      return truncateDescription(summary);
    }

    // Fall back to first paragraph
    const paragraphs = Array.isArray(chapter.paragraphs) ? chapter.paragraphs : [];
    for (const entry of paragraphs) {
      let text = "";
      if (typeof entry === "string") {
        text = entry;
      } else if (entry && typeof entry.text === "string") {
        text = entry.text;
      }
      text = text.replace(/\s+/g, " ").trim();
      if (text) {
        return truncateDescription(text);
      }
    }

    return metaConfig.defaultDescription;
  }

  /**
   * Updates all meta tags for a chapter
   * @param {Object} chapter - Chapter object with title, slug, etc.
   */
  function updateChapterMeta(chapter) {
    if (!chapter) {
      return;
    }

    const siteName = metaConfig.siteName;
    const shareTitle = chapter.title || siteName;
    const fullTitle = `${shareTitle} · ${siteName}`;
    const description = extractChapterDescription(chapter) || metaConfig.defaultDescription || siteName;
    const canonicalUrl = buildCanonicalUrl(chapter.slug);
    const imageUrl = toAbsoluteUrl(metaConfig.shareImage);

    // Update document title
    document.title = fullTitle;

    // Standard meta tags
    setMetaTag("name", "description", description);

    // Open Graph tags
    setMetaTag("property", "og:title", shareTitle);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:type", "article");
    setMetaTag("property", "og:url", canonicalUrl);
    setMetaTag("property", "og:image", imageUrl);
    setMetaTag("property", "og:site_name", siteName);

    // Twitter Card tags
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", shareTitle);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", imageUrl);

    // Canonical link
    setCanonicalLink(canonicalUrl);
  }

  // Public API
  return {
    updateChapterMeta,
    buildCanonicalUrl,
    toAbsoluteUrl,
    extractChapterDescription
  };
}
