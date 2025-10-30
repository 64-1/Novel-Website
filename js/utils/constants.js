/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values for better maintainability
 */

// Timing constants (in milliseconds)
export const TIMING = {
  // Debounce delays for user input
  SEARCH_DEBOUNCE: 160,
  CATALOG_SEARCH_DEBOUNCE: 220,
  GLOBAL_SEARCH_THROTTLE: 120,

  // UI delays and timeouts
  AUTOSAVE_DELAY: 1000,
  ANNOUNCEMENT_DURATION: 1000,
  HIGHLIGHT_FLASH_DURATION: 2000,
  FAB_SHOW_DELAY: 200,
  SCROLL_DEBOUNCE: 500,

  // Request idle callback timeouts
  IDLE_CALLBACK_TIMEOUT: 120,
  IDLE_CALLBACK_BUILD_TIMEOUT: 200,

  // Service worker
  SW_BROADCAST_DELAY: 120,
};

// Limits and caps
export const LIMITS = {
  // Highlighting limits
  MAX_HIGHLIGHTS_PER_CHAPTER: 500,
  SEARCH_HIGHLIGHT_CAP: 200,

  // Scroll amounts
  MIN_SCROLL_AMOUNT: 200,
  SCROLL_PERCENTAGE: 0.9,
};

// Reading and text analysis
export const READING = {
  // Words per minute for reading time calculation
  WORDS_PER_MINUTE: 220,

  // Time calculations
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

// LocalStorage keys
export const STORAGE_KEYS = {
  READER_SETTINGS: 'readerSettings',
  THEME: 'theme',
  PROGRESS: 'progress',
  BOOKMARKS: 'bookmarks',
  ANNOTATIONS: 'annotations',
  SEARCH_INDEX: 'searchIndex',
  LAST_READ: 'lastRead',
};

// Default configuration values
export const DEFAULTS = {
  FRESHNESS_WINDOW_DAYS: 365,
  TRENDING_HALF_LIFE_DAYS: 30,
};
