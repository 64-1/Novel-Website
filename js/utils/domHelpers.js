/**
 * DOM Helper Utilities
 * Provides reusable functions for common DOM operations
 */

/**
 * Safely queries a single element by selector
 * @param {string} selector - CSS selector
 * @param {Element|Document} parent - Parent element (defaults to document)
 * @returns {Element|null} The found element or null
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Safely queries multiple elements by selector
 * @param {string} selector - CSS selector
 * @param {Element|Document} parent - Parent element (defaults to document)
 * @returns {Array<Element>} Array of found elements
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Gets element by ID
 * @param {string} id - Element ID
 * @returns {Element|null} The element or null
 */
export function byId(id) {
  return document.getElementById(id);
}

/**
 * Creates an element with optional attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes to set on the element
 * @param {Array|string} children - Child elements or text content
 * @returns {Element} The created element
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // Add children
  if (typeof children === 'string') {
    element.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Element) {
        element.appendChild(child);
      }
    });
  }

  return element;
}

/**
 * Toggles a class on an element
 * @param {Element} element - The element
 * @param {string} className - Class name to toggle
 * @param {boolean} force - Optional force state
 */
export function toggleClass(element, className, force = undefined) {
  if (!element) return;
  element.classList.toggle(className, force);
}

/**
 * Shows an element by removing 'hidden' attribute
 * @param {Element} element - The element to show
 */
export function show(element) {
  if (!element) return;
  element.hidden = false;
  element.removeAttribute('aria-hidden');
}

/**
 * Hides an element by adding 'hidden' attribute
 * @param {Element} element - The element to hide
 */
export function hide(element) {
  if (!element) return;
  element.hidden = true;
  element.setAttribute('aria-hidden', 'true');
}

/**
 * Sets element visibility
 * @param {Element} element - The element
 * @param {boolean} visible - Whether element should be visible
 */
export function setVisible(element, visible) {
  if (visible) {
    show(element);
  } else {
    hide(element);
  }
}

/**
 * Removes all children from an element
 * @param {Element} element - The element to clear
 */
export function clearChildren(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Creates and shows a toast/announcement message
 * @param {string} message - Message to display
 * @param {number} duration - Duration in milliseconds (default: 1000)
 * @param {Object} options - Additional options (role, className)
 */
export function showToast(message, duration = 1000, options = {}) {
  const announcement = createElement('div', {
    role: options.role || 'status',
    'aria-live': 'polite',
    className: options.className || 'sr-only'
  }, message);

  document.body.appendChild(announcement);
  setTimeout(() => {
    if (announcement.parentNode) {
      document.body.removeChild(announcement);
    }
  }, duration);
}

/**
 * Debounces a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttles a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds to throttle
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Runs a callback when the browser is idle
 * @param {Function} callback - Function to run
 * @param {number} timeout - Timeout in milliseconds (default: 120)
 */
export function runWhenIdle(callback, timeout = 120) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 0);
  }
}

/**
 * Scrolls an element smoothly
 * @param {Element} element - Element to scroll
 * @param {Object} options - Scroll options (top, left, behavior)
 */
export function smoothScroll(element, { top = 0, left = 0, behavior = 'smooth' } = {}) {
  if (!element) return;
  element.scrollBy({ top, left, behavior });
}

/**
 * Sets active state on a button within a group
 * @param {Element} button - Button to activate
 * @param {Array<Element>|NodeList} buttonGroup - All buttons in the group
 */
export function setActiveButton(button, buttonGroup) {
  if (!button || !buttonGroup) return;
  Array.from(buttonGroup).forEach(btn => {
    btn.classList.toggle('active', btn === button);
  });
}

/**
 * Safely adds event listener with cleanup
 * @param {Element} element - Element to add listener to
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Event listener options
 * @returns {Function} Cleanup function to remove listener
 */
export function addEventListener(element, event, handler, options = {}) {
  if (!element) return () => {};
  element.addEventListener(event, handler, options);
  return () => element.removeEventListener(event, handler, options);
}
