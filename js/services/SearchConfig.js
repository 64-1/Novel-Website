/**
 * Search configuration for Fuse.js
 * Provides centralized search configuration to ensure consistency across the application
 */

/**
 * Gets the Fuse.js configuration for catalog search
 * @returns {Object} Fuse.js configuration object
 */
export function getCatalogSearchConfig() {
  return {
    includeScore: true,
    threshold: 0.32,
    ignoreLocation: true,
    keys: [
      { name: "title", weight: 0.6 },
      { name: "title_zh", weight: 0.6 },
      { name: "title_en", weight: 0.45 },
      { name: "author", weight: 0.5 },
      { name: "tags", weight: 0.3 },
      { name: "genres", weight: 0.2 },
      { name: "summary", weight: 0.15 }
    ]
  };
}

/**
 * Creates a Fuse instance with the catalog search configuration
 * @param {Function} FuseConstructor - The Fuse.js constructor
 * @param {Array} catalog - The catalog data to search
 * @returns {Object|null} Fuse instance or null if constructor is invalid
 */
export function createCatalogSearch(FuseConstructor, catalog) {
  if (FuseConstructor && typeof FuseConstructor === "function") {
    return new FuseConstructor(catalog, getCatalogSearchConfig());
  }
  return null;
}
