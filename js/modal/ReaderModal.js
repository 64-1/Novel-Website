(function (global) {
  if (global.NovelReaderModal) {
    return;
  }

  const FocusTrapFactory = global.NovelFocusTrap;

  if (!FocusTrapFactory) {
    throw new Error("NovelReaderModal requires NovelFocusTrap to be loaded first.");
  }

  function toArray(collection) {
    if (!collection) return [];
    return Array.isArray(collection) ? collection : Array.from(collection);
  }

  function create({
    modalElement,
    modalContent,
    openButton,
    closeElements,
    progressTracker,
    syncTheme,
    onOpen,
    onClose
  } = {}) {
    if (!modalElement) {
      throw new Error("ReaderModal.create requires a modalElement.");
    }

    if (modalContent && !modalContent.hasAttribute("tabindex")) {
      modalContent.setAttribute("tabindex", "-1");
    }

    const closeTargets = toArray(closeElements);

    const focusTrap = FocusTrapFactory.create({
      container: modalContent || modalElement,
      boundary: modalElement,
      fallback: () => modalContent || modalElement
    });
    focusTrap.setFallback(() => modalContent || modalElement);

    let lastFocusedElement = null;

    function isOpen() {
      return modalElement.classList.contains("active");
    }

    function storeLastFocus() {
      const active = global.document.activeElement;
      lastFocusedElement = active instanceof HTMLElement ? active : null;
    }

    function restoreFocus() {
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus({ preventScroll: true });
      }
      lastFocusedElement = null;
    }

    function applyOpenState() {
      modalElement.classList.add("active");
      modalElement.setAttribute("aria-hidden", "false");
      global.document.documentElement.style.overflow = "hidden";
    }

    function applyCloseState() {
      modalElement.classList.remove("active");
      modalElement.setAttribute("aria-hidden", "true");
      global.document.documentElement.style.overflow = "";
    }

    function open() {
      if (isOpen()) {
        return;
      }
      storeLastFocus();
      applyOpenState();
      if (typeof syncTheme === "function") {
        syncTheme();
      }
      if (progressTracker && typeof progressTracker.refresh === "function") {
        progressTracker.refresh({ fromStorage: true });
      }
      focusTrap.activate();
      focusTrap.refresh();
      global.requestAnimationFrame(() => {
        global.requestAnimationFrame(() => {
          focusTrap.focusFirst({ fallback: modalContent || modalElement });
        });
      });
      if (typeof onOpen === "function") {
        onOpen();
      }
    }

    function close() {
      if (!isOpen()) {
        return;
      }
      applyCloseState();
      focusTrap.deactivate();
      restoreFocus();
      if (typeof onClose === "function") {
        onClose();
      }
    }

    function handleRootClick(event) {
      if (event.target === modalElement) {
        close();
      }
    }

    function handleOpenClick() {
      open();
    }

    function handleCloseClick() {
      close();
    }

    function initEvents() {
      modalElement.addEventListener("click", handleRootClick);
      openButton?.addEventListener("click", handleOpenClick);
      closeTargets.forEach((element) => {
        element.addEventListener("click", handleCloseClick);
      });
    }

    initEvents();

    function refreshFocusTrap() {
      focusTrap.refresh();
    }

    function setReturnFocus(element) {
      lastFocusedElement = element instanceof HTMLElement ? element : null;
    }

    return Object.freeze({
      open,
      close,
      isOpen,
      refreshFocusTrap,
      focusFirst: () => focusTrap.focusFirst({ fallback: modalContent || modalElement }),
      setReturnFocus
    });
  }

  global.NovelReaderModal = Object.freeze({
    create
  });
})(window);

