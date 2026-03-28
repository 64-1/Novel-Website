/**
 * Novel Card Component
 * Display novel/book preview cards
 */

export function createNovelCard(novel, options = {}) {
  const {
    showAuthor = true,
    showStats = true,
    compact = false,
    onBookmark = null,
    onClick = null
  } = options;

  const statusLabel = {
    ongoing: '连载中',
    completed: '已完结',
    hiatus: '休刊中'
  };

  const statusClass = {
    ongoing: 'status--ongoing',
    completed: 'status--completed',
    hiatus: 'status--hiatus'
  };

  const formatNumber = (num) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`;
    return `${Math.floor(diffDays / 365)}年前`;
  };

  const card = document.createElement('article');
  card.className = `novel-card ${compact ? 'novel-card--compact' : ''}`;
  card.dataset.novelId = novel.id;

  card.innerHTML = `
    <div class="novel-card__cover-wrap">
      <img
        src="${novel.coverImage}"
        alt="${novel.title}"
        class="novel-card__cover"
        loading="lazy"
      />
      <span class="novel-card__status ${statusClass[novel.status] || ''}">
        ${statusLabel[novel.status] || novel.status}
      </span>
      ${novel.featured ? '<span class="novel-card__badge">编辑推荐</span>' : ''}
    </div>
    <div class="novel-card__body">
      <h3 class="novel-card__title">${novel.title}</h3>
      ${showAuthor ? `
        <a href="/u/${novel.author.username}.html" class="novel-card__author" onclick="event.stopPropagation()">
          <img src="${novel.author.avatar}" alt="" class="novel-card__author-avatar" />
          <span>${novel.author.displayName}</span>
        </a>
      ` : ''}
      <p class="novel-card__synopsis">${novel.synopsis}</p>
      <div class="novel-card__tags">
        ${novel.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      ${showStats ? `
        <div class="novel-card__stats">
          <span class="stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            ${formatNumber(novel.views)}
          </span>
          <span class="stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            ${formatNumber(novel.bookmarks)}
          </span>
          <span class="stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            ${formatNumber(novel.wordCount)}
          </span>
          <span class="stat novel-card__updated">
            ${formatDate(novel.updatedAt)}
          </span>
        </div>
      ` : ''}
    </div>
    ${onBookmark ? `
      <button class="novel-card__bookmark-btn" aria-label="收藏" data-action="bookmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
    ` : ''}
  `;

  // Event listeners
  if (onClick) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => onClick(novel));
  }

  if (onBookmark) {
    const bookmarkBtn = card.querySelector('[data-action="bookmark"]');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', e => {
        e.stopPropagation();
        onBookmark(novel);
      });
    }
  }

  return card;
}

export function createNovelCardSkeleton(count = 1) {
  const container = document.createElement('div');
  container.className = 'novel-card-skeleton';

  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'novel-card novel-card--skeleton';
    skeleton.innerHTML = `
      <div class="skeleton-cover"></div>
      <div class="novel-card__body">
        <div class="skeleton-title"></div>
        <div class="skeleton-author"></div>
        <div class="skeleton-synopsis"></div>
        <div class="skeleton-synopsis skeleton-synopsis--short"></div>
        <div class="skeleton-tags"></div>
        <div class="skeleton-stats"></div>
      </div>
    `;
    container.appendChild(skeleton);
  }

  return container;
}

export function createNovelListItem(novel, options = {}) {
  const { onClick = null } = options;

  const formatNumber = (num) => {
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toLocaleString();
  };

  const item = document.createElement('div');
  item.className = 'novel-list-item';
  item.dataset.novelId = novel.id;

  item.innerHTML = `
    <img src="${novel.coverImage}" alt="${novel.title}" class="novel-list-item__cover" loading="lazy" />
    <div class="novel-list-item__body">
      <h4 class="novel-list-item__title">${novel.title}</h4>
      <p class="novel-list-item__synopsis">${novel.synopsis}</p>
      <div class="novel-list-item__meta">
        <span>${novel.author.displayName}</span>
        <span class="dot">·</span>
        <span>${formatNumber(novel.wordCount)}字</span>
        <span class="dot">·</span>
        <span>${novel.status === 'ongoing' ? '连载中' : '已完结'}</span>
      </div>
    </div>
  `;

  if (onClick) {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => onClick(novel));
  }

  return item;
}
