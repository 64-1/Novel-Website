/**
 * Toast Notification System
 * Provides user feedback for actions
 */

const TOAST_CONTAINER_ID = 'toast-container';

class ToastService {
  constructor() {
    this.container = null;
    this.queue = [];
    this.isProcessing = false;
    this._ensureContainer();
  }

  _ensureContainer() {
    let existing = document.getElementById(TOAST_CONTAINER_ID);
    if (!existing) {
      existing = document.createElement('div');
      existing.id = TOAST_CONTAINER_ID;
      existing.className = 'toast-container';
      existing.setAttribute('aria-live', 'polite');
      existing.setAttribute('aria-label', '通知');
      document.body.appendChild(existing);
    }
    this.container = existing;
  }

  _createToastElement(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'alert');

    const icons = {
      success: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
      error: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      warning: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
      info: '<svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    toast.innerHTML = `
      ${icons[type] || icons.info}
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    `;

    // Close button handler
    toast.querySelector('.toast__close').addEventListener('click', () => {
      this._dismissToast(toast);
    });

    return toast;
  }

  _dismissToast(toast) {
    toast.classList.add('toast--exiting');
    toast.addEventListener('animationend', () => {
      toast.remove();
    }, { once: true });
  }

  _processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { message, type, duration } = this.queue.shift();

    const toast = this._createToastElement(message, type, duration);
    this.container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this._dismissToast(toast);
        this.isProcessing = false;
        this._processQueue();
      }, duration);
    } else {
      this.isProcessing = false;
    }
  }

  show(message, options = {}) {
    const { type = 'info', duration = 4000 } = options;
    this.queue.push({ message, type, duration });
    this._processQueue();
  }

  success(message, duration = 4000) {
    this.show(message, { type: 'success', duration });
  }

  error(message, duration = 6000) {
    this.show(message, { type: 'error', duration });
  }

  warning(message, duration = 5000) {
    this.show(message, { type: 'warning', duration });
  }

  info(message, duration = 4000) {
    this.show(message, { type: 'info', duration });
  }
}

// Singleton instance
export const toast = new ToastService();
