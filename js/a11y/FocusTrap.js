const FOCUSABLE_SELECTOR =
  'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

function isElementVisible(element) {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

function getFocusableElements(container) {
  if (!container) return [];
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return elements.filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      isElementVisible(element)
  );
}

function resolveFallback(fallback, defaultTarget) {
  if (!fallback) {
    return defaultTarget;
  }
  if (typeof fallback === "function") {
    try {
      const resolved = fallback();
      return resolved || defaultTarget;
    } catch {
      return defaultTarget;
    }
  }
  return fallback;
}

export function createFocusTrap({ container, boundary, fallback } = {}) {
  if (!container) {
    throw new Error("FocusTrap.create requires a container element.");
  }

  const eventTarget = boundary || container;
  let focusableElements = [];
  let firstElement = null;
  let lastElement = null;
  let listenerAttached = false;
  let fallbackTarget = fallback || container;

  function refresh() {
    focusableElements = getFocusableElements(container);
    firstElement = focusableElements[0] || null;
    lastElement = focusableElements[focusableElements.length - 1] || null;
  }

  function ensureFallback() {
    fallbackTarget = resolveFallback(fallbackTarget, container);
    return fallbackTarget;
  }

  function handleKeydown(event) {
    if (event.key !== "Tab") return;
    refresh();

    if (!focusableElements.length) {
      event.preventDefault();
      const fallbackElement = ensureFallback();
      if (fallbackElement && typeof fallbackElement.focus === "function") {
        fallbackElement.focus({ preventScroll: true });
      }
      return;
    }

    const activeElement = document.activeElement;

    if (event.shiftKey) {
      if (activeElement === firstElement || !focusableElements.includes(activeElement)) {
        event.preventDefault();
        const target = lastElement || firstElement;
        target?.focus({ preventScroll: true });
      }
    } else {
      if (activeElement === lastElement) {
        event.preventDefault();
        const target = firstElement || lastElement;
        target?.focus({ preventScroll: true });
      }
    }
  }

  function activate() {
    if (listenerAttached) {
      refresh();
      return;
    }
    eventTarget.addEventListener("keydown", handleKeydown);
    listenerAttached = true;
    refresh();
  }

  function deactivate() {
    if (!listenerAttached) return;
    eventTarget.removeEventListener("keydown", handleKeydown);
    listenerAttached = false;
    focusableElements = [];
    firstElement = null;
    lastElement = null;
  }

  function focusFirst({ fallback: customFallback } = {}) {
    refresh();
    const target =
      firstElement ||
      resolveFallback(customFallback, null) ||
      ensureFallback();
    if (target && typeof target.focus === "function") {
      target.focus({ preventScroll: true });
    }
  }

  function setFallback(target) {
    fallbackTarget = target || container;
  }

  return Object.freeze({
    activate,
    deactivate,
    refresh,
    focusFirst,
    setFallback
  });
}

export default {
  createFocusTrap
};
