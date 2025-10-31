export function initServiceWorkerUpdates(strings = {}) {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  if (window.__SW_UPDATE_PROMPT_READY__) {
    return;
  }
  window.__SW_UPDATE_PROMPT_READY__ = true;

  const messageText = strings.available || "有更新";
  const refreshLabel = strings.refresh || "刷新";
  const laterLabel = strings.later || "稍后";

  let toastEl = null;
  let toastVisible = false;
  let dismissed = false;
  let currentWaiting = null;
  let pendingRegistration = null;
  let reloadRequested = false;
  const trackedRegistrations = new WeakSet();

  function ensureToast() {
    if (toastEl) {
      return toastEl;
    }
    if (!document.body) {
      return null;
    }
    const container = document.createElement("div");
    container.className = "update-toast";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-hidden", "true");

    const message = document.createElement("span");
    message.className = "update-toast__message";
    message.textContent = messageText;

    const actions = document.createElement("div");
    actions.className = "update-toast__actions";

    const laterButton = document.createElement("button");
    laterButton.type = "button";
    laterButton.className = "update-toast__action update-toast__action--secondary";
    laterButton.textContent = laterLabel;

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.className = "update-toast__action update-toast__action--primary";
    refreshButton.textContent = refreshLabel;

    actions.append(laterButton, refreshButton);
    container.append(message, actions);
    document.body.appendChild(container);

    laterButton.addEventListener("click", () => {
      dismissed = true;
      hideToast();
    });

    refreshButton.addEventListener("click", () => {
      if (!pendingRegistration?.waiting) {
        hideToast();
        return;
      }
      reloadRequested = true;
      pendingRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
      hideToast();
    });

    toastEl = container;
    return toastEl;
  }

  function hideToast() {
    if (!toastEl) {
      return;
    }
    toastVisible = false;
    toastEl.classList.remove("is-visible");
    toastEl.setAttribute("aria-hidden", "true");
  }

  function showToast(registration) {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker) {
      return;
    }
    if (currentWaiting !== waitingWorker) {
      currentWaiting = waitingWorker;
      dismissed = false;
    }
    if (dismissed) {
      return;
    }
    pendingRegistration = registration;

    const toast = ensureToast();
    if (!toast) {
      if (document.readyState === "loading") {
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            showToast(registration);
          },
          { once: true }
        );
      }
      return;
    }

    if (toastVisible) {
      return;
    }
    toastVisible = true;
    toast.classList.add("is-visible");
    toast.setAttribute("aria-hidden", "false");
  }

  function attachRegistrationListeners(registration) {
    if (!registration || trackedRegistrations.has(registration)) {
      return;
    }
    trackedRegistrations.add(registration);
    if (registration.waiting) {
      showToast(registration);
    }
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) {
        return;
      }
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && registration.waiting) {
          showToast(registration);
        }
      });
    });
  }

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_WAITING") {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          if (registration?.waiting) {
            showToast(registration);
          }
        })
        .catch(() => {});
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloadRequested || window.__SW_UPDATE_RELOADED__) {
      return;
    }
    window.__SW_UPDATE_RELOADED__ = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .getRegistration()
    .then((existingRegistration) => {
      if (existingRegistration) {
        attachRegistrationListeners(existingRegistration);
        return existingRegistration;
      }
      return navigator.serviceWorker.register("/service-worker.js").then((registration) => {
        attachRegistrationListeners(registration);
        return registration;
      });
    })
    .catch((error) => {
      console.warn("Service worker registration failed:", error);
    });

  navigator.serviceWorker.ready
    .then((registration) => {
      attachRegistrationListeners(registration);
    })
    .catch(() => {});
}
