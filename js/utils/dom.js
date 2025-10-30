/**
 * @fileoverview DOM utility functions to reduce code duplication
 * Provides reusable functions for common DOM operations
 */

/**
 * Query a single element with optional parent context
 * @param {string} selector - CSS selector
 * @param {Element|Document} [context=document] - Parent element to query within
 * @returns {Element|null} The first matching element or null
 */
export function $(selector, context = document) {
  return context.querySelector(selector);
}

/**
 * Query all matching elements with optional parent context
 * @param {string} selector - CSS selector
 * @param {Element|Document} [context=document] - Parent element to query within
 * @returns {Element[]} Array of matching elements
 */
export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Query element by data-action attribute
 * @param {string} action - Action name
 * @param {Element|Document} [context=document] - Parent element to query within
 * @returns {Element|null} The matching element or null
 */
export function $action(action, context = document) {
  return context.querySelector(`[data-action="${action}"]`);
}

/**
 * Query all elements by data-action attribute
 * @param {string} action - Action name
 * @param {Element|Document} [context=document] - Parent element to query within
 * @returns {Element[]} Array of matching elements
 */
export function $$action(action, context = document) {
  return Array.from(context.querySelectorAll(`[data-action="${action}"]`));
}

/**
 * Create a DOM element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} [attrs={}] - Attributes to set on the element
 * @param {...(string|Element)} children - Child nodes (strings or elements)
 * @returns {Element} The created element
 *
 * @example
 * createElement('div', { class: 'container', id: 'main' }, 'Hello', createElement('span', {}, 'World'))
 */
export function createElement(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'class' || key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Event listeners
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });

  // Append children
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Element) {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Toggle class on element(s)
 * @param {Element|Element[]} elements - Element or array of elements
 * @param {string} className - Class name to toggle
 * @param {boolean} [force] - Force add (true) or remove (false)
 */
export function toggleClass(elements, className, force) {
  const els = Array.isArray(elements) ? elements : [elements];
  els.forEach(el => el && el.classList.toggle(className, force));
}

/**
 * Add class to element(s)
 * @param {Element|Element[]} elements - Element or array of elements
 * @param {string} className - Class name to add
 */
export function addClass(elements, className) {
  const els = Array.isArray(elements) ? elements : [elements];
  els.forEach(el => el && el.classList.add(className));
}

/**
 * Remove class from element(s)
 * @param {Element|Element[]} elements - Element or array of elements
 * @param {string} className - Class name to remove
 */
export function removeClass(elements, className) {
  const els = Array.isArray(elements) ? elements : [elements];
  els.forEach(el => el && el.classList.remove(className));
}

/**
 * Check if element has class
 * @param {Element} element - Element to check
 * @param {string} className - Class name
 * @returns {boolean} True if element has the class
 */
export function hasClass(element, className) {
  return element && element.classList.contains(className);
}

/**
 * Set or get text content
 * @param {Element} element - Target element
 * @param {string} [text] - Text to set (omit to get)
 * @returns {string|undefined} Text content if getting, undefined if setting
 */
export function text(element, text) {
  if (text !== undefined) {
    element.textContent = text;
  } else {
    return element.textContent;
  }
}

/**
 * Set or get HTML content
 * @param {Element} element - Target element
 * @param {string} [html] - HTML to set (omit to get)
 * @returns {string|undefined} HTML content if getting, undefined if setting
 */
export function html(element, html) {
  if (html !== undefined) {
    element.innerHTML = html;
  } else {
    return element.innerHTML;
  }
}

/**
 * Show element(s) by removing 'hidden' class or style
 * @param {Element|Element[]} elements - Element or array of elements
 */
export function show(elements) {
  const els = Array.isArray(elements) ? elements : [elements];
  els.forEach(el => {
    if (el) {
      el.classList.remove('hidden');
      el.style.display = '';
      el.removeAttribute('hidden');
    }
  });
}

/**
 * Hide element(s) by adding 'hidden' class
 * @param {Element|Element[]} elements - Element or array of elements
 */
export function hide(elements) {
  const els = Array.isArray(elements) ? elements : [elements];
  els.forEach(el => {
    if (el) {
      el.classList.add('hidden');
      el.setAttribute('hidden', '');
    }
  });
}

/**
 * Check if element is visible
 * @param {Element} element - Element to check
 * @returns {boolean} True if element is visible
 */
export function isVisible(element) {
  return element && !element.classList.contains('hidden') &&
         element.style.display !== 'none' &&
         !element.hasAttribute('hidden');
}

/**
 * Remove all children from element
 * @param {Element} element - Parent element
 */
export function empty(element) {
  if (element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}

/**
 * Get or set attribute
 * @param {Element} element - Target element
 * @param {string} name - Attribute name
 * @param {string} [value] - Attribute value (omit to get)
 * @returns {string|undefined} Attribute value if getting, undefined if setting
 */
export function attr(element, name, value) {
  if (value !== undefined) {
    element.setAttribute(name, value);
  } else {
    return element.getAttribute(name);
  }
}

/**
 * Remove attribute
 * @param {Element} element - Target element
 * @param {string} name - Attribute name
 */
export function removeAttr(element, name) {
  element && element.removeAttribute(name);
}

/**
 * Delegate event handling to parent element
 * @param {Element} parent - Parent element to attach listener to
 * @param {string} eventType - Event type (e.g., 'click')
 * @param {string} selector - Selector for target elements
 * @param {Function} handler - Event handler function
 * @returns {Function} Function to remove the event listener
 *
 * @example
 * const cleanup = delegate(document.body, 'click', '.button', (e, target) => {
 *   console.log('Button clicked:', target);
 * });
 */
export function delegate(parent, eventType, selector, handler) {
  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e, target);
    }
  };

  parent.addEventListener(eventType, listener);

  // Return cleanup function
  return () => parent.removeEventListener(eventType, listener);
}

/**
 * Wait for DOM to be ready
 * @param {Function} callback - Function to call when ready
 */
export function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

/**
 * Get element's offset relative to document
 * @param {Element} element - Target element
 * @returns {{top: number, left: number}} Offset object
 */
export function offset(element) {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset
  };
}

/**
 * Smoothly scroll to element
 * @param {Element} element - Target element
 * @param {Object} [options] - Scroll options
 * @param {string} [options.behavior='smooth'] - Scroll behavior
 * @param {string} [options.block='start'] - Vertical alignment
 * @param {number} [options.offset=0] - Additional offset in pixels
 */
export function scrollTo(element, options = {}) {
  const { behavior = 'smooth', block = 'start', offset = 0 } = options;

  if (offset) {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: elementPosition - offset,
      behavior
    });
  } else {
    element.scrollIntoView({ behavior, block });
  }
}

/**
 * Create a document fragment from HTML string
 * @param {string} html - HTML string
 * @returns {DocumentFragment} Document fragment
 */
export function createFragment(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

/**
 * Get closest ancestor matching selector
 * @param {Element} element - Starting element
 * @param {string} selector - CSS selector
 * @returns {Element|null} Matching ancestor or null
 */
export function closest(element, selector) {
  return element && element.closest(selector);
}

/**
 * Check if element matches selector
 * @param {Element} element - Element to check
 * @param {string} selector - CSS selector
 * @returns {boolean} True if element matches
 */
export function matches(element, selector) {
  return element && element.matches(selector);
}

/**
 * Dispatch custom event on element
 * @param {Element} element - Target element
 * @param {string} eventName - Event name
 * @param {*} [detail] - Event detail data
 * @param {Object} [options] - Event options
 */
export function trigger(element, eventName, detail, options = {}) {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true,
    ...options
  });
  element.dispatchEvent(event);
}
