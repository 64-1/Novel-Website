/**
 * HTML sanitization utilities
 * Provides functions to safely escape HTML content to prevent XSS attacks
 */

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string|null|undefined} text - The text to escape
 * @returns {string} The escaped text safe for HTML insertion
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) {
    return "";
  }
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Alternative implementation using DOM API (more robust but slightly slower)
 * Useful for complex text that may contain special characters
 * @param {string|null|undefined} text - The text to escape
 * @returns {string} The escaped text safe for HTML insertion
 */
export function escapeHtmlDom(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}
