/**
 * Formatting Utilities
 * Provides reusable formatting functions for text, numbers, and dates
 */

import { READING } from './constants.js';

/**
 * Formats a timestamp into a relative time string (e.g., "2天前", "刚刚更新")
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @param {Object} strings - Localized strings object
 * @returns {string} Formatted relative time string
 */
export function formatRelativeTime(timestamp, strings = {}) {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const days = Math.floor(diff / READING.MS_PER_DAY);

  if (days <= 0) {
    return strings.justNow || "刚刚更新";
  }
  if (days === 1) {
    return strings.yesterday || "昨天更新";
  }
  if (days < 7) {
    return `${days}${strings.daysAgo || "天前"}`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks}${strings.weeksAgo || "周前"}`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months}${strings.monthsAgo || "个月前"}`;
  }
  const years = Math.floor(days / 365);
  return `${years}${strings.yearsAgo || "年前"}`;
}

/**
 * Formats reading time from word count
 * @param {number} words - Number of words
 * @param {Object} strings - Localized strings object
 * @returns {string} Formatted reading time string (e.g., "5 分钟")
 */
export function formatReadingTime(words, strings = {}) {
  const minutes = Math.max(1, Math.round(words / READING.WORDS_PER_MINUTE));
  const minutesLabel = strings.minutes || "分钟";
  return `${minutes} ${minutesLabel}`;
}

/**
 * Counts words approximately (works for both English and Chinese text)
 * @param {string} text - Text to count
 * @returns {number} Approximate word count
 */
export function countWordsApprox(text) {
  if (!text) return 0;

  // Count Chinese characters (each character is roughly one word)
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;

  // Count English words (split by whitespace)
  const englishWords = text
    .replace(/[\u4e00-\u9fa5]/g, '') // Remove Chinese chars
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;

  return chineseChars + englishWords;
}

/**
 * Formats a number with thousand separators
 * @param {number} num - Number to format
 * @param {string} separator - Separator to use (default: ',')
 * @returns {string} Formatted number string
 */
export function formatNumber(num, separator = ',') {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * Truncates text to a maximum length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} ellipsis - Ellipsis string (default: '...')
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength, ellipsis = '...') {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * Pluralizes a word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form (optional, defaults to singular + 's')
 * @returns {string} Pluralized word
 */
export function pluralize(count, singular, plural = null) {
  if (count === 1) return singular;
  return plural || (singular + 's');
}

/**
 * Formats file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats a percentage
 * @param {number} value - Value between 0 and 1 (or 0 and 100 if isPercent is true)
 * @param {boolean} isPercent - Whether input is already a percentage
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted percentage string (e.g., "75%")
 */
export function formatPercentage(value, isPercent = false, decimals = 0) {
  const percent = isPercent ? value : value * 100;
  return `${percent.toFixed(decimals)}%`;
}
