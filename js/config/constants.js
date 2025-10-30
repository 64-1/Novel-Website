/**
 * @fileoverview Centralized configuration and constants for the Novel Website application
 * This module contains all application-wide constants to avoid magic numbers and strings
 */

/**
 * Storage keys used throughout the application
 */
export const STORAGE_KEYS = {
  READER_SETTINGS: 'novel:reader-settings',
  READER_SETTINGS_LEGACY: 'xinghai-reader-settings',
  CURRENT_CHAPTER: 'novel:current-chapter',
  ANNOTATIONS: 'novel:annotations',
  PROGRESS: 'novel:progress',
  DRAFT: 'novel:draft',
  THEME: 'novel:theme',
  MUSIC_ENABLED: 'novel:music-enabled',
  MUSIC_VOLUME: 'novel:music-volume',
  MUSIC_TRACK: 'novel:music-track'
};

/**
 * Timing constants for UI interactions
 */
export const TIMING = {
  DEBOUNCE_DELAY: 220,           // Debounce delay for search and scroll events (ms)
  ANIMATION_DURATION: 300,       // Standard animation duration (ms)
  TOAST_DURATION: 3000,          // Toast/notification display time (ms)
  AUTO_SAVE_DELAY: 2000,         // Auto-save delay for writer (ms)
  SCROLL_THROTTLE: 100           // Scroll event throttle (ms)
};

/**
 * Cache and performance constants
 */
export const CACHE = {
  MAX_CHAPTERS: 2,               // Maximum chapters to keep in memory
  SERVICE_WORKER_VERSION: 'v1',  // Service worker cache version
  FETCH_TIMEOUT: 5000            // Network fetch timeout (ms)
};

/**
 * Search configuration
 */
export const SEARCH = {
  FUSE_THRESHOLD: 0.32,          // Fuzzy search threshold (lower = more strict)
  MIN_QUERY_LENGTH: 2,           // Minimum characters before searching
  MAX_RESULTS: 50,               // Maximum search results to display
  HIGHLIGHT_CLASS: 'search-highlight'
};

/**
 * Reader configuration
 */
export const READER = {
  DEFAULT_FONT_SIZE: 16,         // Default font size (px)
  MIN_FONT_SIZE: 12,             // Minimum font size (px)
  MAX_FONT_SIZE: 32,             // Maximum font size (px)
  FONT_SIZE_STEP: 2,             // Font size adjustment step (px)
  SCROLL_OFFSET: 60,             // Offset for scroll position (px)
  LINE_HEIGHT_NORMAL: 1.8,       // Default line height
  LINE_HEIGHT_COMPACT: 1.5       // Compact line height
};

/**
 * Audio player configuration
 */
export const AUDIO = {
  DEFAULT_VOLUME: 0.5,           // Default volume (0-1)
  FADE_DURATION: 1000,           // Fade in/out duration (ms)
  MIN_VOLUME: 0,                 // Minimum volume
  MAX_VOLUME: 1                  // Maximum volume
};

/**
 * DOM selectors used across the application
 * Centralized to make updates easier and catch typos
 */
export const SELECTORS = {
  // Theme
  THEME_TOGGLE: '[data-action="toggle-theme"]',

  // Reader
  READER_CONTENT: '.reader-content',
  READER_LAYOUT_TOGGLE: '[data-action="toggle-reader-layout"]',
  CHAPTER_TEXT: '.chapter-text',
  TOC_DRAWER: '.toc-drawer',

  // Navigation
  NAV_MAIN: 'nav.main-nav',
  MENU_TOGGLE: '.menu-toggle',

  // Modals
  MODAL: '.modal',
  MODAL_OVERLAY: '.modal-overlay',

  // Search
  SEARCH_INPUT: '.search-input',
  SEARCH_RESULTS: '.search-results',

  // Writer
  WRITER_EDITOR: '#writer-editor',
  DRAFT_LIST: '.draft-list',

  // Audio
  AUDIO_PLAYER: '.audio-player',
  MUSIC_TOGGLE: '[data-action="toggle-music"]'
};

/**
 * Data action attributes
 */
export const ACTIONS = {
  TOGGLE_THEME: 'toggle-theme',
  TOGGLE_READER_LAYOUT: 'toggle-reader-layout',
  TOGGLE_MUSIC: 'toggle-music',
  OPEN_CHAPTER: 'open-chapter',
  CLOSE_MODAL: 'close-modal',
  SAVE_DRAFT: 'save-draft',
  DELETE_DRAFT: 'delete-draft'
};

/**
 * API endpoints and data paths
 */
export const PATHS = {
  CHAPTERS: '/chapters.json',
  BOOKS: '/data/books.json',
  MUSIC_DIR: '/music/'
};

/**
 * Theme names
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SEPIA: 'sepia',
  AUTO: 'auto'
};

/**
 * Error messages
 */
export const ERRORS = {
  CHAPTER_NOT_FOUND: 'Chapter not found',
  NETWORK_ERROR: 'Network error occurred',
  STORAGE_ERROR: 'Storage operation failed',
  INVALID_INPUT: 'Invalid input provided',
  AUDIO_LOAD_ERROR: 'Failed to load audio file'
};

/**
 * Feature flags for enabling/disabling features
 */
export const FEATURES = {
  MUSIC_PLAYER: true,
  ANNOTATIONS: true,
  WRITER_STUDIO: true,
  GLOBAL_SEARCH: true,
  PWA_SUPPORT: true,
  OFFLINE_MODE: true
};

/**
 * Validation rules
 */
export const VALIDATION = {
  MAX_CHAPTER_ID_LENGTH: 50,
  MAX_ANNOTATION_TEXT_LENGTH: 1000,
  MAX_DRAFT_TITLE_LENGTH: 100,
  MAX_DRAFT_CONTENT_LENGTH: 1000000  // 1MB of text
};
