/**
 * Profile Tabs Component
 * Sticky tab navigation for profile sections
 */

export function createProfileTabs(options = {}) {
  const {
    activeTab = 'works',
    tabs = [],
    onTabChange = null
  } = options;

  let currentTab = activeTab;

  const container = document.createElement('nav');
  container.className = 'profile-tabs';
  container.setAttribute('role', 'tablist');

  function render() {
    container.innerHTML = `
      <div class="profile-tabs__inner">
        ${tabs.map(tab => `
          <button
            class="profile-tab ${currentTab === tab.id ? 'profile-tab--active' : ''}"
            data-tab="${tab.id}"
            role="tab"
            aria-selected="${currentTab === tab.id}"
            aria-controls="tabpanel-${tab.id}"
          >
            ${tab.icon || ''}
            <span>${tab.label}</span>
            ${tab.count !== undefined ? `<span class="tab-count">${tab.count}</span>` : ''}
          </button>
        `).join('')}
      </div>
    `;

    attachEventListeners();
  }

  function attachEventListeners() {
    container.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (tabId !== currentTab) {
          currentTab = tabId;
          render();

          if (onTabChange) {
            onTabChange(tabId);
          }

          // Update URL hash
          const url = new URL(window.location);
          url.searchParams.set('tab', tabId);
          history.pushState({}, '', url);
        }
      });
    });
  }

  // Handle browser back/forward
  function handleHashChange() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && tab !== currentTab) {
      currentTab = tab;
      render();
      if (onTabChange) {
        onTabChange(tab);
      }
    }
  }

  window.addEventListener('popstate', handleHashChange);

  render();

  return {
    element: container,
    setActiveTab: (tabId) => {
      if (tabId !== currentTab) {
        currentTab = tabId;
        render();
      }
    },
    getActiveTab: () => currentTab,
    destroy: () => {
      window.removeEventListener('popstate', handleHashChange);
    }
  };
}

// Default tabs configuration
export const DEFAULT_PROFILE_TABS = [
  { id: 'works', label: '作品', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
  { id: 'series', label: '连载', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' },
  { id: 'bookmarks', label: '收藏', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' },
  { id: 'about', label: '关于', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' }
];
