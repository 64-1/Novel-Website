/**
 * Ranking Page
 * Display popular novels by time period
 */

import { MOCK_NOVELS } from '../data/mockData.js';

document.addEventListener('DOMContentLoaded', () => {
  initRankingPage();
});

function initRankingPage() {
  const rankingList = document.getElementById('rankingList');
  const rankingTabs = document.querySelectorAll('.ranking-tab');

  // Render initial ranking
  renderRanking('day');

  // Tab switching
  rankingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      rankingTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderRanking(tab.dataset.period);
    });
  });
}

function renderRanking(period) {
  const container = document.getElementById('rankingList');
  if (!container) return;

  // Calculate trending score (mock implementation)
  const ranked = [...MOCK_NOVELS]
    .map(novel => ({
      ...novel,
      score: calculateTrendingScore(novel, period)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  container.innerHTML = ranked.map((novel, index) => `
    <a href="/novel/${novel.slug}" class="ranking-item ${index < 3 ? 'ranking-item--top' : ''}">
      <span class="ranking-position">${index + 1}</span>
      <div class="ranking-cover">
        <img src="${novel.coverImage}" alt="${novel.title}" loading="lazy">
      </div>
      <div class="ranking-info">
        <h3>${novel.title}</h3>
        <p class="ranking-author">${novel.author.displayName}</p>
        <div class="ranking-tags">
          ${novel.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
      <div class="ranking-stats">
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
      </div>
    </a>
  `).join('');
}

function calculateTrendingScore(novel, period) {
  const multipliers = {
    day: 1,
    week: 4,
    month: 12,
    all: 30
  };

  const daysSinceUpdate = Math.max(0, (Date.now() - new Date(novel.updatedAt)) / (1000 * 60 * 60 * 24));
  const recencyBonus = Math.max(0, 100 - daysSinceUpdate * 2);
  const baseScore = novel.views * 0.3 + novel.bookmarks * 0.5 + novel.likes * 0.2;

  return baseScore * multipliers[period] + recencyBonus;
}

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString();
}
