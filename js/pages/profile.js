/**
 * User Profile Page
 * Public profile for /u/[handle]
 */

import { authService } from '../services/AuthService.js';
import { MOCK_USERS, getUserByUsername, getNovelsByAuthor, MOCK_BOOKMARKS } from '../data/mockData.js';
import { createNovelCard } from '../components/NovelCard.js';

document.addEventListener('DOMContentLoaded', () => {
  initProfilePage();
});

function initProfilePage() {
  const pageLoading = document.getElementById('pageLoading');
  const page404 = document.getElementById('page404');
  const profileContent = document.getElementById('profileContent');

  // Get username from URL
  const username = getUsernameFromUrl();

  if (!username) {
    show404();
    return;
  }

  // Find user
  const user = getUserByUsername(username);

  if (!user) {
    show404();
    return;
  }

  // Hide loading, show content
  pageLoading.hidden = true;
  page404.hidden = true;
  profileContent.hidden = false;

  // Render profile
  renderProfile(user);

  // Initialize header
  initHeader();

  // Initialize tabs
  initTabs(user);

  // Render tab content
  renderWorks(user);
}

function getUsernameFromUrl() {
  // Match /u/{username} or /u/{username}/
  const pathMatch = window.location.pathname.match(/^\/u\/([^/]+)\/?$/);
  if (pathMatch) {
    return decodeURIComponent(pathMatch[1]);
  }

  // Check URL params as fallback
  const params = new URLSearchParams(window.location.search);
  return params.get('handle');
}

function renderProfile(user) {
  // Cover
  const profileCover = document.getElementById('profileCover');
  if (profileCover) {
    profileCover.style.backgroundImage = `url(${user.coverImage})`;
  }

  // Avatar
  const profileAvatar = document.getElementById('profileAvatar');
  if (profileAvatar) profileAvatar.src = user.avatar;

  // Name and username
  const profileDisplayName = document.getElementById('profileDisplayName');
  if (profileDisplayName) profileDisplayName.textContent = user.displayName;

  const profileUsername = document.getElementById('profileUsername');
  if (profileUsername) profileUsername.textContent = `@${user.username}`;

  // Bio
  const profileBio = document.getElementById('profileBio');
  if (profileBio) profileBio.textContent = user.bio || '暂无简介';

  // Tags
  const profileTags = document.getElementById('profileTags');
  if (profileTags && user.tags) {
    profileTags.innerHTML = user.tags.map(tag =>
      `<span class="tag">${tag}</span>`
    ).join('');
  }

  // Stats
  const stats = user.stats || {};
  document.getElementById('statWorks').textContent = stats.works || 0;
  document.getElementById('statFollowers').textContent = formatNumber(stats.followers || 0);
  document.getElementById('statFollowing').textContent = formatNumber(stats.following || 0);
  document.getElementById('statCollections').textContent = formatNumber(stats.collections || 0);

  // About section
  const aboutBio = document.getElementById('aboutBio');
  if (aboutBio) aboutBio.textContent = user.bio || '暂无简介';

  const aboutTags = document.getElementById('aboutTags');
  if (aboutTags && user.tags) {
    aboutTags.innerHTML = user.tags.map(tag =>
      `<span class="tag">${tag}</span>`
    ).join('');
  }

  document.getElementById('aboutTotalReads').textContent = formatNumber(stats.totalReads || 0);

  // Actions
  const currentUser = authService.getUser();
  const profileActions = document.getElementById('profileActions');
  const ownerActions = document.getElementById('ownerActions');

  if (currentUser && currentUser.id === user.id) {
    // Own profile
    if (profileActions) profileActions.hidden = true;
    if (ownerActions) ownerActions.hidden = false;
  } else {
    // Other user's profile
    if (profileActions) profileActions.hidden = false;
    if (ownerActions) ownerActions.hidden = true;
  }

  // Update page title
  document.title = `${user.displayName} (@${user.username}) | 星海小说`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.content = user.bio || `${user.displayName}的主页`;
}

function initHeader() {
  const headerAuth = document.getElementById('headerAuth');

  // Check auth state
  const user = authService.getUser();

  if (!user) {
    headerAuth.innerHTML = `
      <a href="/auth.html" class="btn auth-btn login-btn">登录</a>
      <a href="/auth.html?mode=signup" class="btn primary auth-btn">注册</a>
    `;
  } else {
    headerAuth.innerHTML = `
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

    // Attach dropdown listeners
    const avatarTrigger = headerAuth.querySelector('.avatar-trigger');
    const dropdown = headerAuth.querySelector('.avatar-dropdown');

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

    headerAuth.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      authService.logout();
      window.location.reload();
    });
  }
}

function initTabs(user) {
  const tabs = document.querySelectorAll('.profile-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show corresponding content
      tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${targetTab}`);
      });

      // Render content if needed
      switch (targetTab) {
        case 'works':
          renderWorks(user);
          break;
        case 'series':
          renderSeries(user);
          break;
        case 'bookmarks':
          renderBookmarks(user);
          break;
        case 'about':
          // Already rendered
          break;
      }
    });
  });
}

function renderWorks(user) {
  const grid = document.getElementById('worksGrid');
  if (!grid) return;

  const novels = getNovelsByAuthor(user.id);

  if (novels.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>暂无作品</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = novels.map(novel => {
    const card = createNovelCard(novel, { showStats: true });
    return card.outerHTML;
  }).join('');
}

function renderSeries(user) {
  const list = document.getElementById('seriesList');
  if (!list) return;

  // For demo, show novels grouped by status
  const novels = getNovelsByAuthor(user.id);
  const ongoing = novels.filter(n => n.status === 'ongoing');
  const completed = novels.filter(n => n.status === 'completed');

  if (ongoing.length === 0 && completed.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>暂无连载</p></div>';
    return;
  }

  let html = '';

  if (ongoing.length > 0) {
    html += `
      <div class="series-group">
        <h3>连载中 (${ongoing.length})</h3>
        <div class="series-items">
          ${ongoing.map(novel => `
            <a href="/novel/${novel.slug}" class="series-item">
              <img src="${novel.coverImage}" alt="${novel.title}">
              <div class="series-info">
                <h4>${novel.title}</h4>
                <p>${novel.chapterCount}章 · ${formatNumber(novel.wordCount)}字</p>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (completed.length > 0) {
    html += `
      <div class="series-group">
        <h3>已完结 (${completed.length})</h3>
        <div class="series-items">
          ${completed.map(novel => `
            <a href="/novel/${novel.slug}" class="series-item">
              <img src="${novel.coverImage}" alt="${novel.title}">
              <div class="series-info">
                <h4>${novel.title}</h4>
                <p>${novel.chapterCount}章 · ${formatNumber(novel.wordCount)}字</p>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  list.innerHTML = html;
}

function renderBookmarks(user) {
  const grid = document.getElementById('bookmarksGrid');
  if (!grid) return;

  // Show user's bookmarks for demo
  const bookmarks = MOCK_BOOKMARKS;

  if (bookmarks.length === 0) {
    grid.innerHTML = '<div class="empty-state"><p>暂无收藏</p></div>';
    return;
  }

  grid.innerHTML = bookmarks.map(bookmark => {
    const novel = bookmark.novel;
    const card = createNovelCard(novel, { showStats: false });
    return card.outerHTML;
  }).join('');
}

function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toLocaleString();
}

function show404() {
  const pageLoading = document.getElementById('pageLoading');
  const page404 = document.getElementById('page404');
  const profileContent = document.getElementById('profileContent');

  pageLoading.hidden = true;
  page404.hidden = false;
  profileContent.hidden = true;

  document.title = '404 | 星海小说';
}
