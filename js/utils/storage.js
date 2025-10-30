/**
 * Storage Utilities
 * Provides safe wrapper functions for localStorage operations with error handling
 */

/**
 * Safely gets an item from localStorage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
 * @returns {*} Parsed value or default
 */
export function getItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (err) {
    console.warn(`Failed to get item from localStorage: ${key}`, err);
    return defaultValue;
  }
}

/**
 * Safely sets an item in localStorage
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} True if successful, false otherwise
 */
export function setItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Failed to set item in localStorage: ${key}`, err);
    return false;
  }
}

/**
 * Safely removes an item from localStorage
 * @param {string} key - Storage key
 * @returns {boolean} True if successful, false otherwise
 */
export function removeItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.error(`Failed to remove item from localStorage: ${key}`, err);
    return false;
  }
}

/**
 * Clears all items from localStorage
 * @returns {boolean} True if successful, false otherwise
 */
export function clear() {
  try {
    localStorage.clear();
    return true;
  } catch (err) {
    console.error('Failed to clear localStorage', err);
    return false;
  }
}

/**
 * Checks if localStorage is available
 * @returns {boolean} True if localStorage is available
 */
export function isAvailable() {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Gets all keys from localStorage with optional prefix filter
 * @param {string} prefix - Optional prefix to filter keys
 * @returns {Array<string>} Array of keys
 */
export function getKeys(prefix = '') {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (!prefix || key.startsWith(prefix))) {
        keys.push(key);
      }
    }
    return keys;
  } catch (err) {
    console.warn('Failed to get keys from localStorage', err);
    return [];
  }
}

/**
 * Gets multiple items from localStorage
 * @param {Array<string>} keys - Array of keys to get
 * @returns {Object} Object with key-value pairs
 */
export function getItems(keys) {
  const items = {};
  keys.forEach(key => {
    items[key] = getItem(key);
  });
  return items;
}

/**
 * Sets multiple items in localStorage
 * @param {Object} items - Object with key-value pairs to set
 * @returns {boolean} True if all successful, false if any failed
 */
export function setItems(items) {
  let allSuccessful = true;
  Object.entries(items).forEach(([key, value]) => {
    if (!setItem(key, value)) {
      allSuccessful = false;
    }
  });
  return allSuccessful;
}

/**
 * Gets the total size of localStorage in bytes (approximate)
 * @returns {number} Size in bytes
 */
export function getStorageSize() {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  } catch (err) {
    console.warn('Failed to calculate storage size', err);
    return 0;
  }
}
