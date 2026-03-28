/**
 * Empty State Component
 * Display when there's no content to show
 */

export function createEmptyState(options = {}) {
  const {
    type = 'default', // 'default', 'search', 'bookmarks', 'works', 'followers', 'notifications'
    message = '',
    description = '',
    actionText = '',
    onAction = null
  } = options;

  const messages = {
    search: {
      title: '没有找到相关结果',
      desc: '换个关键词试试，或者浏览热门作品'
    },
    bookmarks: {
      title: '书架空空如也',
      desc: '收藏喜欢的作品，随时继续阅读'
    },
    works: {
      title: '还没有作品',
      desc: '开始创作你的第一部作品吧'
    },
    followers: {
      title: '还没有粉丝',
      desc: '创作更多优质内容，吸引读者关注'
    },
    following: {
      title: '还没有关注任何人',
      desc: '发现喜欢的作者，关注他们获取更新'
    },
    notifications: {
      title: '暂无通知',
      desc: '收到关注、收藏、评论时会在这里显示'
    },
    drafts: {
      title: '没有草稿',
      desc: '开始写作，保存后会出现在这里'
    },
    default: {
      title: '这里什么都没有',
      desc: '暂无内容'
    }
  };

  const icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
    bookmarks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    works: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
    followers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    notifications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    drafts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>'
  };

  const content = messages[type] || messages.default;

  const container = document.createElement('div');
  container.className = 'empty-state';

  container.innerHTML = `
    <div class="empty-state__icon">
      ${icons[type] || icons.default}
    </div>
    <h3 class="empty-state__title">${message || content.title}</h3>
    <p class="empty-state__description">${description || content.desc}</p>
    ${actionText ? `
      <button class="btn primary empty-state__action" data-action="primary">
        ${actionText}
      </button>
    ` : ''}
  `;

  if (actionText && onAction) {
    const btn = container.querySelector('[data-action="primary"]');
    if (btn) {
      btn.addEventListener('click', onAction);
    }
  }

  return container;
}

export function createErrorState(options = {}) {
  const {
    message = '加载失败',
    description = '请稍后重试，或刷新页面',
    retryText = '重试',
    onRetry = null
  } = options;

  const container = document.createElement('div');
  container.className = 'error-state';

  container.innerHTML = `
    <div class="error-state__icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h3 class="error-state__title">${message}</h3>
    <p class="error-state__description">${description}</p>
    ${retryText ? `
      <button class="btn secondary error-state__retry" data-action="retry">
        ${retryText}
      </button>
    ` : ''}
  `;

  if (retryText && onRetry) {
    const btn = container.querySelector('[data-action="retry"]');
    if (btn) {
      btn.addEventListener('click', onRetry);
    }
  }

  return container;
}
