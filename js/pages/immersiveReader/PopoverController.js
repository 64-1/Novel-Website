export function createPopoverController({ popover, stage, scrollContainer, onShow, onHide }) {
  let isVisible = false;
  let hideTimer = null;

  function show(range) {
    if (!popover || !stage || !scrollContainer) return;
    const stageRect = stage.getBoundingClientRect();
    const rect = range.getBoundingClientRect();
    const top = rect.top - stageRect.top + scrollContainer.scrollTop;
    const left = rect.left - stageRect.left + rect.width / 2 + scrollContainer.scrollLeft;
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.classList.add("is-visible");
    popover.setAttribute("aria-hidden", "false");
    isVisible = true;
    if (onShow) onShow();
  }

  function hide() {
    if (!popover) return;
    clearTimeout(hideTimer);
    hideTimer = null;
    if (!isVisible) return;
    popover.classList.remove("is-visible");
    popover.setAttribute("aria-hidden", "true");
    isVisible = false;
    if (onHide) onHide();
  }

  function scheduleHide(delay = 80) {
    hideTimer = window.setTimeout(() => {
      hide();
    }, delay);
  }

  function cancelHide() {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  return {
    show,
    hide,
    scheduleHide,
    cancelHide,
    isVisible: () => isVisible
  };
}
