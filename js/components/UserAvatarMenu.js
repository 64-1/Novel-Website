/**
 * User Avatar Menu Component
 * Dropdown menu triggered by clicking user avatar
 */

import { authService } from '../services/AuthService.js';
import { toast } from '../services/ToastService.js';

export function createUserAvatarMenu({ container, onNavigate }) {
  let isOpen = false;
  let currentUser = authService.getUser();

  // Subscribe to auth changes
  const unsubscribe = authService.subscribe(user => {
    currentUser = user;
    render();
  });

  function render() {
    if (!container) return;

    if (!currentUser) {
      // Logged out state - show login/register buttons
      container.innerHTML = `
        <a href="/auth.html" class="btn auth-btn login-btn">登录</a>
        <a href="/auth.html?mode=signup" class="btn primary auth-btn">注册</a>
      `;
      return;
    }

    // Logged in state - show avatar with dropdown
    container.innerHTML = `
      <div class="avatar-menu">
        <button class="avatar-trigger" aria-expanded="false" aria-haspopup="true">
          <img src="${currentUser.avatar}" alt="${currentUser.displayName}" class="avatar-img" />
          <span class="notification-dot" data-badge="notifications" hidden></span>
        </button>
        <div class="avatar-dropdown" hidden>
          <div class="dropdown-header">
            <img src="${currentUser.avatar}" alt="" class="dropdown-avatar" />
            <div class="dropdown-user-info">
              <span class="dropdown-display-name">${currentUser.displayName}</span>
              <span class="dropdown-username">@${currentUser.username}</span>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <nav class="dropdown-nav">
            <a href="/u/${currentUser.username}.html" class="dropdown-item" data-action="profile">
              <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              我的主页
            </a>
            <a href="/u/${currentUser.username}.html?tab=bookmarks" class="dropdown-item" data-action="bookmarks">
              <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              书架 / 收藏
            </a>
            <a href="/dashboard.html" class="dropdown-item" data-action="dashboard">
              <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              创作者工作台
            </a>
            <a href="/notifications.html" class="dropdown-item" data-action="notifications">
              <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              通知
              <span class="dropdown-badge" data-badge="notifications">0</span>
            </a>
          </nav>
          <div class="dropdown-divider"></div>
          <nav class="dropdown-nav">
            <a href="/settings.html" class="dropdown-item" data-action="settings">
              <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              账户设置
            </a>
            <button class="dropdown-item" data-action="logout">
              <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              退出登录
            </button>
          </nav>
        </div>
      </div>
      <a href="/write/" class="btn primary contribute-btn">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        投稿
      </a>
    `;

    attachEventListeners();
    updateNotificationBadge();
  }

  function attachEventListeners() {
    const avatarTrigger = container.querySelector('.avatar-trigger');
    const dropdown = container.querySelector('.avatar-dropdown');

    if (!avatarTrigger || !dropdown) return;

    // Toggle dropdown
    avatarTrigger.addEventListener('click', e => {
      e.stopPropagation();
      toggleDropdown();
    });

    // Handle item clicks
    dropdown.querySelectorAll('[data-action]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        const action = item.dataset.action;

        if (action === 'logout') {
          handleLogout();
        } else if (onNavigate) {
          onNavigate(action, item.getAttribute('href'));
        }

        closeDropdown();
      });
    });

    // Close on outside click
    document.addEventListener('click', handleOutsideClick);

    // Close on escape
    document.addEventListener('keydown', handleEscape);
  }

  function toggleDropdown() {
    isOpen ? closeDropdown() : openDropdown();
  }

  function openDropdown() {
    isOpen = true;
    const dropdown = container.querySelector('.avatar-dropdown');
    const trigger = container.querySelector('.avatar-trigger');

    if (dropdown && trigger) {
      dropdown.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      dropdown.classList.add('dropdown--open');

      // Focus first item
      const firstItem = dropdown.querySelector('.dropdown-item');
      if (firstItem) firstItem.focus();
    }
  }

  function closeDropdown() {
    isOpen = false;
    const dropdown = container.querySelector('.avatar-dropdown');
    const trigger = container.querySelector('.avatar-trigger');

    if (dropdown && trigger) {
      dropdown.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      dropdown.classList.remove('dropdown--open');
    }
  }

  function handleOutsideClick(e) {
    if (!container.contains(e.target)) {
      closeDropdown();
    }
  }

  function handleEscape(e) {
    if (e.key === 'Escape' && isOpen) {
      closeDropdown();
      container.querySelector('.avatar-trigger')?.focus();
    }
  }

  function handleLogout() {
    authService.logout();
    toast.success('已退出登录');
    if (onNavigate) {
      onNavigate('logout', '/');
    }
    closeDropdown();
  }

  function updateNotificationBadge() {
    // Mock notification count - would fetch from API in real app
    const unreadCount = 2;
    const badges = container.querySelectorAll('[data-badge="notifications"]');
    badges.forEach(badge => {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    });
  }

  function destroy() {
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEscape);
    unsubscribe();
  }

  // Initial render
  render();

  return {
    render,
    destroy
  };
}
