// User constants
const USER_ROLES = {
  USER: 'user',
  AUTHOR: 'author',
  ADMIN: 'admin'
};

// Book status
const BOOK_STATUS = {
  DRAFT: 'draft',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  HIATUS: 'hiatus'
};

// Book visibility
const BOOK_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  UNLISTED: 'unlisted'
};

// Annotation types
const ANNOTATION_TYPES = {
  BOOKMARK: 'bookmark',
  HIGHLIGHT: 'highlight'
};

// Highlight colors (matching frontend)
const HIGHLIGHT_COLORS = {
  YELLOW: 'yellow',
  GREEN: 'green',
  BLUE: 'blue',
  PINK: 'pink',
  PURPLE: 'purple'
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// Password requirements
const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128
};

module.exports = {
  USER_ROLES,
  BOOK_STATUS,
  BOOK_VISIBILITY,
  ANNOTATION_TYPES,
  HIGHLIGHT_COLORS,
  PAGINATION,
  PASSWORD_REQUIREMENTS
};
