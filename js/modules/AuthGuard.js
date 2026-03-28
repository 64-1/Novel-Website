/**
 * Auth Guard Module
 * Handles authentication redirects for protected routes
 */

import { authService } from '../services/AuthService.js';

export function initAuthGuards() {
  // Handle "开始创作" / "探索创作工具" buttons
  document.querySelectorAll('[data-require-auth]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!authService.isAuthenticated()) {
        e.preventDefault();
        const redirect = encodeURIComponent(window.location.href);
        window.location.href = `/auth.html?redirect=${redirect}`;
      }
    });
  });

  // Handle header "创作者工作室" link
  const studioLinks = document.querySelectorAll('a[href="/write/"]');
  studioLinks.forEach(link => {
    if (!link.dataset.authChecked) {
      link.dataset.authChecked = 'true';
      link.addEventListener('click', (e) => {
        if (!authService.isAuthenticated()) {
          e.preventDefault();
          const redirect = encodeURIComponent(link.href);
          window.location.href = `/auth.html?redirect=${redirect}`;
        }
      });
    }
  });
}

export function requireAuth(redirectTo = null) {
  if (!authService.isAuthenticated()) {
    const redirect = redirectTo || encodeURIComponent(window.location.pathname);
    window.location.href = `/auth.html?redirect=${redirect}`;
    return false;
  }
  return true;
}

export function checkAuthAndRedirect() {
  if (!authService.isAuthenticated()) {
    const currentPath = encodeURIComponent(window.location.pathname);
    window.location.href = `/auth.html?redirect=${currentPath}`;
    return false;
  }
  return true;
}
