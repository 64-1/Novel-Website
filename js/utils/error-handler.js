/**
 * @fileoverview Centralized error handling utilities
 * Provides consistent error handling and logging across the application
 */

import { ERRORS } from '../config/constants.js';

/**
 * Error severity levels
 */
export const ErrorLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Custom error classes for different error types
 */
export class AppError extends Error {
  constructor(message, code, level = ErrorLevel.ERROR) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.level = level;
    this.timestamp = new Date().toISOString();
  }
}

export class NetworkError extends AppError {
  constructor(message, statusCode) {
    super(message || ERRORS.NETWORK_ERROR, 'NETWORK_ERROR', ErrorLevel.WARNING);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
  }
}

export class StorageError extends AppError {
  constructor(message, operation) {
    super(message || ERRORS.STORAGE_ERROR, 'STORAGE_ERROR', ErrorLevel.ERROR);
    this.name = 'StorageError';
    this.operation = operation;
  }
}

export class ValidationError extends AppError {
  constructor(message, field) {
    super(message || ERRORS.INVALID_INPUT, 'VALIDATION_ERROR', ErrorLevel.WARNING);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NotFoundError extends AppError {
  constructor(message, resourceType) {
    super(message || ERRORS.CHAPTER_NOT_FOUND, 'NOT_FOUND', ErrorLevel.WARNING);
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
  }
}

/**
 * Error logger with different output strategies
 */
class ErrorLogger {
  constructor() {
    this.handlers = [];
    this.errorHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * Add error handler
   * @param {Function} handler - Handler function that receives error object
   */
  addHandler(handler) {
    this.handlers.push(handler);
  }

  /**
   * Remove error handler
   * @param {Function} handler - Handler to remove
   */
  removeHandler(handler) {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Log error
   * @param {Error} error - Error object
   * @param {Object} [context] - Additional context
   */
  log(error, context = {}) {
    const errorInfo = {
      message: error.message,
      name: error.name,
      code: error.code,
      level: error.level || ErrorLevel.ERROR,
      timestamp: error.timestamp || new Date().toISOString(),
      stack: error.stack,
      context
    };

    // Add to history
    this.errorHistory.push(errorInfo);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Call all handlers
    this.handlers.forEach(handler => {
      try {
        handler(errorInfo);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });

    // Default console logging
    this._consoleLog(errorInfo);
  }

  /**
   * Console logging with appropriate level
   * @private
   */
  _consoleLog(errorInfo) {
    const { level, message, context } = errorInfo;

    switch (level) {
      case ErrorLevel.INFO:
        console.info(`ℹ️ ${message}`, context);
        break;
      case ErrorLevel.WARNING:
        console.warn(`⚠️ ${message}`, context);
        break;
      case ErrorLevel.CRITICAL:
        console.error(`🔴 CRITICAL: ${message}`, context);
        break;
      default:
        console.error(`❌ ${message}`, context);
    }

    if (errorInfo.stack && level !== ErrorLevel.INFO) {
      console.error(errorInfo.stack);
    }
  }

  /**
   * Get error history
   * @param {number} [limit] - Maximum number of errors to return
   * @returns {Array} Array of error info objects
   */
  getHistory(limit) {
    return limit
      ? this.errorHistory.slice(-limit)
      : [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
  }
}

// Singleton instance
const errorLogger = new ErrorLogger();

/**
 * Handle error with context
 * @param {Error} error - Error object
 * @param {Object} [context] - Additional context
 */
export function handleError(error, context = {}) {
  errorLogger.log(error, context);
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {Object} [options] - Options
 * @param {Function} [options.onError] - Custom error handler
 * @param {Object} [options.context] - Error context
 * @param {*} [options.fallback] - Fallback value on error
 * @returns {Function} Wrapped function
 *
 * @example
 * const safeLoadChapter = withErrorHandling(loadChapter, {
 *   context: { operation: 'loadChapter' },
 *   fallback: null
 * });
 */
export function withErrorHandling(fn, options = {}) {
  const { onError, context = {}, fallback } = options;

  return async function(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      if (onError) {
        onError(error, context);
      } else {
        handleError(error, context);
      }
      return fallback;
    }
  };
}

/**
 * Retry async operation with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} [options] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number} [options.initialDelay=1000] - Initial delay in ms
 * @param {number} [options.maxDelay=10000] - Maximum delay in ms
 * @param {Function} [options.shouldRetry] - Function to determine if error should be retried
 * @returns {Promise} Result of function
 *
 * @example
 * const data = await retryWithBackoff(() => fetchData(), {
 *   maxRetries: 3,
 *   shouldRetry: (error) => error instanceof NetworkError
 * });
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff with max delay cap
      delay = Math.min(delay * 2, maxDelay);

      handleError(
        new AppError(
          `Retry attempt ${attempt + 1}/${maxRetries}`,
          'RETRY',
          ErrorLevel.INFO
        ),
        { originalError: error.message }
      );
    }
  }

  throw lastError;
}

/**
 * Wrap promise with timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} [message] - Error message
 * @returns {Promise} Promise that rejects on timeout
 *
 * @example
 * const data = await withTimeout(fetchData(), 5000, 'Fetch timed out');
 */
export function withTimeout(promise, timeout, message = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new AppError(message, 'TIMEOUT', ErrorLevel.WARNING)), timeout)
    )
  ]);
}

/**
 * Safely parse JSON with error handling
 * @param {string} json - JSON string
 * @param {*} [fallback] - Fallback value on error
 * @returns {*} Parsed object or fallback
 */
export function safeJsonParse(json, fallback = null) {
  try {
    return JSON.parse(json);
  } catch (error) {
    handleError(
      new ValidationError('Failed to parse JSON', 'json'),
      { json: json.substring(0, 100) }
    );
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 * @param {*} obj - Object to stringify
 * @param {string} [fallback] - Fallback value on error
 * @returns {string} JSON string or fallback
 */
export function safeJsonStringify(obj, fallback = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    handleError(
      new ValidationError('Failed to stringify JSON', 'json'),
      { type: typeof obj }
    );
    return fallback;
  }
}

/**
 * Validate required fields in object
 * @param {Object} obj - Object to validate
 * @param {string[]} fields - Required field names
 * @throws {ValidationError} If validation fails
 */
export function validateRequired(obj, fields) {
  const missing = fields.filter(field => !(field in obj) || obj[field] === undefined || obj[field] === null);

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      missing[0]
    );
  }
}

/**
 * Create a safe localStorage wrapper with error handling
 * @returns {Object} Safe storage interface
 */
export function createSafeStorage() {
  return {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch (error) {
        handleError(
          new StorageError('Failed to get item from storage', 'get'),
          { key }
        );
        return fallback;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        handleError(
          new StorageError('Failed to set item in storage', 'set'),
          { key, error: error.message }
        );
        return false;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        handleError(
          new StorageError('Failed to remove item from storage', 'remove'),
          { key }
        );
        return false;
      }
    },

    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        handleError(
          new StorageError('Failed to clear storage', 'clear')
        );
        return false;
      }
    }
  };
}

/**
 * Add custom error handler
 * @param {Function} handler - Handler function
 * @returns {Function} Function to remove handler
 */
export function addErrorHandler(handler) {
  errorLogger.addHandler(handler);
  return () => errorLogger.removeHandler(handler);
}

/**
 * Get error history
 * @param {number} [limit] - Maximum number of errors
 * @returns {Array} Error history
 */
export function getErrorHistory(limit) {
  return errorLogger.getHistory(limit);
}

/**
 * Clear error history
 */
export function clearErrorHistory() {
  errorLogger.clearHistory();
}

// Set up global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    handleError(
      new AppError(event.message, 'GLOBAL_ERROR', ErrorLevel.CRITICAL),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    handleError(
      new AppError(
        event.reason?.message || 'Unhandled promise rejection',
        'UNHANDLED_REJECTION',
        ErrorLevel.ERROR
      ),
      { reason: event.reason }
    );
  });
}

export default {
  handleError,
  withErrorHandling,
  retryWithBackoff,
  withTimeout,
  safeJsonParse,
  safeJsonStringify,
  validateRequired,
  createSafeStorage,
  addErrorHandler,
  getErrorHistory,
  clearErrorHistory,
  // Error classes
  AppError,
  NetworkError,
  StorageError,
  ValidationError,
  NotFoundError,
  ErrorLevel
};
