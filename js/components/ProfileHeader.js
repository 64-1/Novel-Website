/**
 * Profile Header Component
 * User profile banner with avatar and stats
 */

import { createFollowButton } from './FollowButton.js';

export function createProfileHeader(options = {}) {
  const {
    user,
    isOwner = false,
    isFollowing = false,
    onEdit = null,
    onFollow = null,
    onMessage = null
  } = options;

  const container = document.createElement('div');
  container.className = 'profile-header';

  function render() {
    const formatNumber = (num) => {
      if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
      if (num >= 10000) return (num / 10000).toFixed(1) + '万';
      return num.toLocaleString();
    };

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}年${date.getMonth() + 1}月加入`;
    };

    container.innerHTML = `
      <div class="profile-header__cover">
        ${user.coverImage
          ? `<img src="${user.coverImage}" alt="" class="profile-header__cover-img" />`
          : `<div class="profile-header__cover-placeholder"></div>`
        }
        ${isOwner ? `
          <button class="profile-header__cover-edit" data-action="edit-cover">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            修改封面
          </button>
        ` : ''}
      </div>
      <div class="profile-header__main">
        <div class="profile-header__avatar-wrap">
          <img src="${user.avatar}" alt="${user.displayName}" class="profile-header__avatar" />
          ${isOwner ? `
            <button class="profile-header__avatar-edit" data-action="edit-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          ` : ''}
        </div>
        <div class="profile-header__info">
          <div class="profile-header__identity">
            <h1 class="profile-header__name">${user.displayName}</h1>
            <span class="profile-header__username">@${user.username}</span>
            <span class="profile-header__id">ID: ${user.id}</span>
          </div>
          ${user.bio ? `<p class="profile-header__bio">${user.bio.replace(/\n/g, '<br>')}</p>` : ''}
          ${user.tags && user.tags.length > 0 ? `
            <div class="profile-header__tags">
              ${user.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
          <div class="profile-header__meta">
            ${user.location ? `
              <span class="profile-header__location">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                ${user.location}
              </span>
            ` : ''}
            <span class="profile-header__joined">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${formatDate(user.joinedAt)}
            </span>
          </div>
        </div>
        <div class="profile-header__actions">
          ${isOwner ? `
            <button class="btn secondary" data-action="edit-profile">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              编辑主页
            </button>
          ` : `
            <div class="profile-header__follow-btn"></div>
            <button class="btn secondary" data-action="message">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              发消息
            </button>
            <button class="btn ghost" data-action="report">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              举报
            </button>
          `}
        </div>
      </div>
      <div class="profile-header__stats">
        <a href="?tab=works" class="stat-item">
          <span class="stat-value">${formatNumber(user.stats.works)}</span>
          <span class="stat-label">作品</span>
        </a>
        <a href="?tab=collections" class="stat-item">
          <span class="stat-value">${formatNumber(user.stats.collections)}</span>
          <span class="stat-label">收藏</span>
        </a>
        <a href="?tab=following" class="stat-item">
          <span class="stat-value">${formatNumber(user.stats.following)}</span>
          <span class="stat-label">关注</span>
        </a>
        <a href="?tab=followers" class="stat-item">
          <span class="stat-value">${formatNumber(user.stats.followers)}</span>
          <span class="stat-label">粉丝</span>
        </a>
        <div class="stat-item">
          <span class="stat-value">${formatNumber(user.stats.totalReads)}</span>
          <span class="stat-label">阅读</span>
        </div>
      </div>
    `;

    // Initialize follow button for non-owner
    if (!isOwner) {
      const followBtnContainer = container.querySelector('.profile-header__follow-btn');
      if (followBtnContainer) {
        const followBtn = createFollowButton({
          isFollowing,
          onToggle: (nowFollowing) => {
            if (onFollow) onFollow(nowFollowing);
          }
        });
        followBtnContainer.appendChild(followBtn.element);
      }
    }

    // Attach event listeners
    attachEventListeners();
  }

  function attachEventListeners() {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'edit-profile' && onEdit) onEdit('profile');
        if (action === 'edit-cover' && onEdit) onEdit('cover');
        if (action === 'edit-avatar' && onEdit) onEdit('avatar');
        if (action === 'message' && onMessage) onMessage();
      });
    });
  }

  render();

  return {
    element: container,
    updateUser: (newUser) => {
      options.user = newUser;
      render();
    }
  };
}
