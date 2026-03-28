/**
 * Stats Row Component
 * Display user statistics in a row
 */

export function createStatsRow(stats, options = {}) {
  const { compact = false } = options;

  const container = document.createElement('div');
  container.className = `stats-row ${compact ? 'stats-row--compact' : ''}`;

  const formatNumber = (num) => {
    if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
    if (num >= 10000) return (num / 10000).toFixed(1) + '万';
    return num.toLocaleString();
  };

  const items = [
    { key: 'works', label: '作品', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
    { key: 'collections', label: '收藏', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' },
    { key: 'following', label: '关注', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>' },
    { key: 'followers', label: '粉丝', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { key: 'totalReads', label: '阅读', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' }
  ];

  container.innerHTML = items
    .filter(item => stats[item.key] !== undefined)
    .map(item => `
      <div class="stats-row__item">
        <span class="stats-row__icon">${item.icon}</span>
        <span class="stats-row__value">${formatNumber(stats[item.key])}</span>
        <span class="stats-row__label">${item.label}</span>
      </div>
    `).join('');

  return container;
}
