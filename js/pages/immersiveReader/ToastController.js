export function createToastController({ toastElement }) {
  let toastTimer = null;

  function show(message, duration = 2400) {
    if (!toastElement) return;
    toastElement.textContent = message;
    toastElement.setAttribute("aria-hidden", "false");
    toastElement.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastElement.classList.remove("is-visible");
      toastElement.setAttribute("aria-hidden", "true");
    }, duration);
  }

  function hide() {
    if (!toastElement) return;
    clearTimeout(toastTimer);
    toastElement.classList.remove("is-visible");
    toastElement.setAttribute("aria-hidden", "true");
  }

  return {
    show,
    hide
  };
}
