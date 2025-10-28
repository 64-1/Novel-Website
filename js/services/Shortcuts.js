const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  if (!tagName) return false;
  if (IGNORED_TAGS.has(tagName)) return true;
  if (target.getAttribute && target.getAttribute("role") === "textbox") return true;
  return false;
}

export function initShortcuts(handlers = {}) {
  if (typeof handlers !== "object" || handlers === null) {
    throw new Error("Shortcuts.init expects a handlers object.");
  }

  function invoke(fn, event) {
    if (typeof fn !== "function") {
      return false;
    }
    try {
      return fn(event) === true;
    } catch (error) {
      console.warn("[Shortcuts] handler threw an error:", error);
      return false;
    }
  }

  function handleKeydown(event) {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (isEditableTarget(target)) return;

    let handled = false;
    switch (event.key) {
      case "ArrowLeft":
        handled = invoke(handlers.onLeft, event);
        break;
      case "ArrowRight":
        handled = invoke(handlers.onRight, event);
        break;
      case "j":
      case "J":
        handled = invoke(handlers.onScrollDown, event);
        break;
      case "k":
      case "K":
        handled = invoke(handlers.onScrollUp, event);
        break;
      case "Escape":
        handled = invoke(handlers.onEscape, event);
        break;
      case "/":
      case "?":
        handled = invoke(handlers.onSearchFocus, event);
        break;
      case "n":
      case "N":
        if (event.shiftKey) {
          handled = invoke(handlers.onSearchPrev, event);
        } else {
          handled = invoke(handlers.onSearchNext, event);
        }
        break;
      default:
        break;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  document.addEventListener("keydown", handleKeydown);

  return {
    destroy() {
      document.removeEventListener("keydown", handleKeydown);
    }
  };
}

export default {
  initShortcuts
};
