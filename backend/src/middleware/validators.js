const { body, param, query, validationResult } = require('express-validator');
const { PASSWORD_REQUIREMENTS } = require('../config/constants');

/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg
        }))
      }
    });
  }
  next();
};

/**
 * Validation rules for user registration
 */
const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: PASSWORD_REQUIREMENTS.MIN_LENGTH })
    .withMessage(`Password must be at least ${PASSWORD_REQUIREMENTS.MIN_LENGTH} characters`),

  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),

  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

/**
 * Validation rules for updating user profile
 */
const validateUpdateProfile = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),

  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL'),

  handleValidationErrors
];

/**
 * Validation rules for updating user preferences
 */
const validateUpdatePreferences = [
  body('theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be either "light" or "dark"'),

  body('readingTheme')
    .optional()
    .isIn(['晨光', '暮色', '星夜'])
    .withMessage('Reading theme must be one of: 晨光, 暮色, 星夜'),

  body('fontSize')
    .optional()
    .isInt({ min: 12, max: 32 })
    .withMessage('Font size must be between 12 and 32'),

  body('lineHeight')
    .optional()
    .isFloat({ min: 1.2, max: 3.0 })
    .withMessage('Line height must be between 1.2 and 3.0'),

  body('musicVolume')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Music volume must be between 0 and 100'),

  handleValidationErrors
];

/**
 * Validation rules for creating/updating draft
 */
const validateDraft = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag cannot exceed 30 characters'),

  body('body')
    .optional()
    .isString()
    .withMessage('Body must be a string'),

  handleValidationErrors
];

/**
 * Validation rules for creating/updating book
 */
const validateBook = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('slug')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Slug cannot exceed 200 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),

  body('status')
    .optional()
    .isIn(['draft', 'ongoing', 'completed', 'hiatus'])
    .withMessage('Status must be one of: draft, ongoing, completed, hiatus'),

  body('visibility')
    .optional()
    .isIn(['public', 'private', 'unlisted'])
    .withMessage('Visibility must be one of: public, private, unlisted'),

  handleValidationErrors
];

/**
 * Validation rules for creating/updating chapter
 */
const validateChapter = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),

  body('body')
    .trim()
    .notEmpty()
    .withMessage('Body is required'),

  body('chapterNumber')
    .isInt({ min: 1 })
    .withMessage('Chapter number must be a positive integer'),

  body('bookId')
    .notEmpty()
    .withMessage('Book ID is required')
    .isMongoId()
    .withMessage('Book ID must be a valid MongoDB ID'),

  handleValidationErrors
];

/**
 * Validation rules for reading progress
 */
const validateProgress = [
  body('bookId')
    .notEmpty()
    .withMessage('Book ID is required')
    .isMongoId()
    .withMessage('Book ID must be a valid MongoDB ID'),

  body('chapterId')
    .notEmpty()
    .withMessage('Chapter ID is required')
    .isMongoId()
    .withMessage('Chapter ID must be a valid MongoDB ID'),

  body('chapterSlug')
    .trim()
    .notEmpty()
    .withMessage('Chapter slug is required'),

  body('percentage')
    .isInt({ min: 0, max: 100 })
    .withMessage('Percentage must be between 0 and 100'),

  body('scrollPosition')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Scroll position must be a non-negative integer'),

  handleValidationErrors
];

/**
 * Validation rules for creating annotation
 */
const validateAnnotation = [
  body('chapterId')
    .notEmpty()
    .withMessage('Chapter ID is required')
    .isMongoId()
    .withMessage('Chapter ID must be a valid MongoDB ID'),

  body('chapterSlug')
    .trim()
    .notEmpty()
    .withMessage('Chapter slug is required'),

  body('type')
    .isIn(['bookmark', 'highlight'])
    .withMessage('Type must be either "bookmark" or "highlight"'),

  // Bookmark-specific validation
  body('position')
    .if(body('type').equals('bookmark'))
    .notEmpty()
    .withMessage('Position is required for bookmarks')
    .isInt({ min: 0 })
    .withMessage('Position must be a non-negative integer'),

  // Highlight-specific validation
  body('selectedText')
    .if(body('type').equals('highlight'))
    .notEmpty()
    .withMessage('Selected text is required for highlights')
    .isLength({ max: 1000 })
    .withMessage('Selected text cannot exceed 1000 characters'),

  body('color')
    .if(body('type').equals('highlight'))
    .notEmpty()
    .withMessage('Color is required for highlights')
    .isIn(['yellow', 'green', 'blue', 'pink', 'purple'])
    .withMessage('Color must be one of: yellow, green, blue, pink, purple'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters'),

  handleValidationErrors
];

/**
 * Validation for MongoDB ObjectId params
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ID`),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateUpdatePreferences,
  validateDraft,
  validateBook,
  validateChapter,
  validateProgress,
  validateAnnotation,
  validateObjectId,
  handleValidationErrors
};
