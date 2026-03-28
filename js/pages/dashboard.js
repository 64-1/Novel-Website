/**
 * Dashboard Page
 * Creator workspace for logged-in users
 */

import { authService } from '../services/AuthService.js';
import { MOCK_NOVELS, MOCK_DRAFTS, MOCK_DASHBOARD_STATS } from '../data/mockData.js';

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

function initDashboard() {
  const authGate = document.getElementById('authGate');
  const dashboardContent = document.getElementById('dashboardContent');
  const dashboardFooter = document.getElementById('dashboardFooter');
  const headerAuth = document.getElementById('headerAuth');

  const user = authService.getUser();

  if (!user) {
    authGate.hidden = false;
    dashboardContent.hidden = true;
    dashboardFooter.hidden = true;
    return;
  }

  authGate.hidden = true;
  dashboardContent.hidden = false;
  dashboardFooter.hidden = false;

  // Render user avatar menu
  renderAvatarMenu(headerAuth, user);

  // Update user info
  const userName = document.getElementById('userName');
  if (userName) userName.textContent = user.displayName;

  // Update stats
  updateStats(user);

  // Render works
  renderWorks();

  // Render drafts
  renderDrafts();
}

function renderAvatarMenu(container, user) {
  if (!container) return;

  container.innerHTML = `
    <div class="avatar-menu">
      <button class="avatar-trigger" aria-expanded="false" aria-haspopup="true">
        <img src="${user.avatar}" alt="${user.displayName}" class="avatar-img" />
      </button>
      <div class="avatar-dropdown" hidden>
        <div class="dropdown-header">
          <img src="${user.avatar}" alt="" class="dropdown-avatar" />
          <div class="dropdown-user-info">
            <span class="dropdown-display-name">${user.displayName}</span>
            <span class="dropdown-username">@${user.username}</span>
          </div>
        </div>
        <div class="dropdown-divider"></div>
        <nav class="dropdown-nav">
          <a href="/u/${user.username}/" class="dropdown-item">
            <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            我的主页
          </a>
          <a href="/library/" class="dropdown-item">
            <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            书架 / 收藏
          </a>
          <a href="/dashboard/" class="dropdown-item">
            <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            创作者工作台
          </a>
        </nav>
        <div class="dropdown-divider"></div>
        <nav class="dropdown-nav">
          <a href="/settings/" class="dropdown-item">
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

  // Attach event listeners
  const avatarTrigger = container.querySelector('.avatar-trigger');
  const dropdown = container.querySelector('.avatar-dropdown');

  avatarTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.hidden;
    dropdown.hidden = !isOpen;
    avatarTrigger.setAttribute('aria-expanded', !isOpen);
  });

  document.addEventListener('click', () => {
    dropdown.hidden = true;
    avatarTrigger?.setAttribute('aria-expanded', 'false');
  });

  container.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
    authService.logout();
    window.location.reload();
  });
}

function updateStats(user) {
  const stats = user.stats || {};
  const dashboardStats = MOCK_DASHBOARD_STATS;

  document.getElementById('statReads').textContent = formatNumber(stats.totalReads || 0);
  document.getElementById('statBookmarks').textContent = formatNumber(stats.collections || 0);
  document.getElementById('statFollowers').textContent = formatNumber(stats.followers || 0);
  document.getElementById('statStreak').textContent = `${dashboardStats.streak.current} 天`;
}

function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function renderWorks() {
  const grid = document.getElementById('worksGrid');
  if (!grid) return;

  const user = authService.getUser();
  if (!user) return;

  const userNovels = MOCK_NOVELS.filter(n => n.author?.id === user.id || n.author?.username === user.username);

  if (userNovels.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>还没有作品</p>
        <a href="/write/" class="btn primary">开始创作</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = userNovels.map(novel => `
    <a href="/write/?novel=${novel.slug}" class="work-card">
      <div class="work-cover">
        <img src="${novel.coverImage}" alt="${novel.title}" loading="lazy">
      </div>
      <div class="work-info">
        <h3>${novel.title}</h3>
        <div class="work-meta">
          <span class="work-status status--${novel.status}">${novel.status === 'ongoing' ? '连载中' : '已完结'}</span>
          <span class="work-words">${formatNumber(novel.wordCount)}字</span>
        </div>
      </div>
    </a>
  `).join('');
}

function renderDrafts() {
  const list = document.getElementById('draftsList');
  if (!list) return;

  const drafts = MOCK_DRAFTS;

  if (drafts.length === 0) {
    list.innerHTML = '<p class="empty-hint">暂无草稿</p>';
    return;
  }

  list.innerHTML = drafts.map(draft => `
    <div class="draft-item">
      <div class="draft-info">
        <h4>${draft.title || '无标题'}</h4>
        <p class="draft-meta">${draft.wordCount} 字 · ${formatDate(draft.lastModified)}</p>
      </div>
      <div class="draft-actions">
        <button class="btn ghost">继续编辑</button>
      </div>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 7) return `${diff}天前`;
  return date.toLocaleDateString('zh-Hans', { month: 'short', day: 'numeric' });
}
