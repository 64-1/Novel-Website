/**
 * @fileoverview Event handling utilities
 * Provides reusable functions for common event patterns
 */

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 *
 * @example
 * const debouncedSearch = debounce((query) => search(query), 300);
 * input.addEventListener('input', (e) => debouncedSearch(e.target.value));
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
 * Throttle a function call
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between calls in milliseconds
 * @returns {Function} Throttled function
 *
 * @example
 * const throttledScroll = throttle((e) => handleScroll(e), 100);
 * window.addEventListener('scroll', throttledScroll);
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Add event listener with cleanup
 * @param {Element|Window|Document} target - Event target
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler
 * @param {Object|boolean} [options] - Event listener options
 * @returns {Function} Cleanup function to remove listener
 *
 * @example
 * const cleanup = on(button, 'click', handleClick);
 * // Later: cleanup();
 */
export function on(target, eventType, handler, options) {
  target.addEventListener(eventType, handler, options);
  return () => target.removeEventListener(eventType, handler, options);
}

/**
 * Add event listener that fires only once
 * @param {Element|Window|Document} target - Event target
 * @param {string} eventType - Event type
 * @param {Function} handler - Event handler
 * @param {Object} [options] - Event listener options
 * @returns {Function} Cleanup function
 */
export function once(target, eventType, handler, options = {}) {
  return on(target, eventType, handler, { ...options, once: true });
}

/**
 * Add multiple event listeners at once
 * @param {Element|Window|Document} target - Event target
 * @param {Object<string, Function>} events - Map of event types to handlers
 * @param {Object|boolean} [options] - Event listener options
 * @returns {Function} Cleanup function to remove all listeners
 *
 * @example
 * const cleanup = onMultiple(element, {
 *   click: handleClick,
 *   mouseenter: handleMouseEnter,
 *   mouseleave: handleMouseLeave
 * });
 */
export function onMultiple(target, events, options) {
  const cleanupFunctions = Object.entries(events).map(([eventType, handler]) =>
    on(target, eventType, handler, options)
  );

  return () => cleanupFunctions.forEach(cleanup => cleanup());
}

/**
 * Wait for an event to occur
 * @param {Element|Window|Document} target - Event target
 * @param {string} eventType - Event type
 * @param {Object} [options] - Event listener options
 * @returns {Promise<Event>} Promise that resolves with the event
 *
 * @example
 * await waitForEvent(image, 'load');
 * console.log('Image loaded');
 */
export function waitForEvent(target, eventType, options) {
  return new Promise(resolve => {
    once(target, eventType, resolve, options);
  });
}

/**
 * Create an event bus for pub/sub pattern
 * @returns {Object} Event bus with on, off, emit methods
 *
 * @example
 * const bus = createEventBus();
 * bus.on('user:login', (user) => console.log('User logged in:', user));
 * bus.emit('user:login', { id: 1, name: 'Alice' });
 */
export function createEventBus() {
  const listeners = new Map();

  return {
    /**
     * Subscribe to event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(callback);

      return () => this.off(event, callback);
    },

    /**
     * Unsubscribe from event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
      const callbacks = listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          listeners.delete(event);
        }
      }
    },

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    emit(event, data) {
      const callbacks = listeners.get(event);
      if (callbacks) {
        callbacks.forEach(callback => callback(data));
      }
    },

    /**
     * Subscribe to event once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
      const wrapper = (data) => {
        callback(data);
        this.off(event, wrapper);
      };
      return this.on(event, wrapper);
    },

    /**
     * Clear all listeners for an event or all events
     * @param {string} [event] - Event name (omit to clear all)
     */
    clear(event) {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    }
  };
}

/**
 * Prevent default behavior
 * @param {Function} handler - Event handler
 * @returns {Function} Wrapped handler that prevents default
 *
 * @example
 * form.addEventListener('submit', preventDefault(handleSubmit));
 */
export function preventDefault(handler) {
  return function(e, ...args) {
    e.preventDefault();
    return handler.call(this, e, ...args);
  };
}

/**
 * Stop event propagation
 * @param {Function} handler - Event handler
 * @returns {Function} Wrapped handler that stops propagation
 *
 * @example
 * button.addEventListener('click', stopPropagation(handleClick));
 */
export function stopPropagation(handler) {
  return function(e, ...args) {
    e.stopPropagation();
    return handler.call(this, e, ...args);
  };
}

/**
 * Combine preventDefault and stopPropagation
 * @param {Function} handler - Event handler
 * @returns {Function} Wrapped handler
 */
export function stopEvent(handler) {
  return function(e, ...args) {
    e.preventDefault();
    e.stopPropagation();
    return handler.call(this, e, ...args);
  };
}

/**
 * Handle keyboard events with key filtering
 * @param {string|string[]} keys - Key or array of keys to listen for
 * @param {Function} handler - Event handler
 * @param {Object} [modifiers] - Modifier keys (ctrl, alt, shift, meta)
 * @returns {Function} Event handler
 *
 * @example
 * input.addEventListener('keydown', onKey('Enter', handleEnter));
 * input.addEventListener('keydown', onKey(['Enter', 'Tab'], handleSubmit));
 * input.addEventListener('keydown', onKey('s', handleSave, { ctrl: true }));
 */
export function onKey(keys, handler, modifiers = {}) {
  const keyArray = Array.isArray(keys) ? keys : [keys];

  return function(e) {
    const matchesKey = keyArray.some(key =>
      e.key === key || e.code === key || e.key.toLowerCase() === key.toLowerCase()
    );

    if (!matchesKey) return;

    // Check modifiers
    const { ctrl, alt, shift, meta } = modifiers;
    if (ctrl !== undefined && e.ctrlKey !== ctrl) return;
    if (alt !== undefined && e.altKey !== alt) return;
    if (shift !== undefined && e.shiftKey !== shift) return;
    if (meta !== undefined && e.metaKey !== meta) return;

    return handler.call(this, e);
  };
}

/**
 * Handle click outside element
 * @param {Element} element - Element to detect clicks outside of
 * @param {Function} handler - Handler function
 * @returns {Function} Cleanup function
 *
 * @example
 * const cleanup = onClickOutside(dropdown, () => closeDropdown());
 */
export function onClickOutside(element, handler) {
  const listener = (e) => {
    if (!element.contains(e.target)) {
      handler(e);
    }
  };

  // Use capture phase to handle before other click handlers
  document.addEventListener('click', listener, true);
  return () => document.removeEventListener('click', listener, true);
}

/**
 * Handle escape key press
 * @param {Function} handler - Handler function
 * @returns {Function} Cleanup function
 *
 * @example
 * const cleanup = onEscape(() => closeModal());
 */
export function onEscape(handler) {
  return on(document, 'keydown', onKey('Escape', handler));
}

/**
 * Create a managed event listener collection
 * @returns {Object} Event manager with add, remove, removeAll methods
 *
 * @example
 * const events = createEventManager();
 * events.add(button, 'click', handleClick);
 * events.add(window, 'resize', handleResize);
 * // Later cleanup all at once:
 * events.removeAll();
 */
export function createEventManager() {
  const cleanupFunctions = [];

  return {
    /**
     * Add event listener
     * @param {Element|Window|Document} target - Event target
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     * @param {Object|boolean} [options] - Event options
     */
    add(target, eventType, handler, options) {
      const cleanup = on(target, eventType, handler, options);
      cleanupFunctions.push(cleanup);
    },

    /**
     * Remove specific event listener
     * @param {Element|Window|Document} target - Event target
     * @param {string} eventType - Event type
     * @param {Function} handler - Event handler
     * @param {Object|boolean} [options] - Event options
     */
    remove(target, eventType, handler, options) {
      target.removeEventListener(eventType, handler, options);
    },

    /**
     * Remove all managed event listeners
     */
    removeAll() {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions.length = 0;
    },

    /**
     * Get count of managed listeners
     * @returns {number} Number of listeners
     */
    count() {
      return cleanupFunctions.length;
    }
  };
}
