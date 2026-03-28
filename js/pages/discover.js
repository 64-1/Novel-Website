/**
 * Discover Page
 * Browse and filter novels by category
 */

import { MOCK_NOVELS } from '../data/mockData.js';
import { createNovelCard } from '../components/NovelCard.js';

document.addEventListener('DOMContentLoaded', () => {
  initDiscoverPage();
});

function initDiscoverPage() {
  const featuredGrid = document.getElementById('featuredGrid');
  const newWorksGrid = document.getElementById('newWorksGrid');
  const categoryTabs = document.querySelectorAll('.category-tab');

  // Render featured novels
  renderFeatured(featuredGrid);

  // Render new works
  renderNewWorks(newWorksGrid);

  // Category tab switching
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const category = tab.dataset.category;
      filterNovels(category);
    });
  });
}

function renderFeatured(container) {
  if (!container) return;

  const featured = MOCK_NOVELS.filter(n => n.featured).slice(0, 4);

  container.innerHTML = featured.map(novel => `
    <a href="/novel/${novel.slug}" class="featured-item">
      <div class="featured-cover">
        <img src="${novel.coverImage}" alt="${novel.title}" loading="lazy">
      </div>
      <div class="featured-info">
        <span class="featured-tag">编辑推荐</span>
        <h3>${novel.title}</h3>
        <p class="featured-author">${novel.author.displayName}</p>
        <p class="featured-synopsis">${novel.synopsis.slice(0, 80)}…</p>
      </div>
    </a>
  `).join('');
}

function renderNewWorks(container) {
  if (!container) return;

  const novels = [...MOCK_NOVELS]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 8);

  container.innerHTML = novels.map(novel => {
    const card = createNovelCard(novel, { showStats: true });
    return card.outerHTML;
  }).join('');
}

function filterNovels(category) {
  const newWorksGrid = document.getElementById('newWorksGrid');
  if (!newWorksGrid) return;

  let filtered = [...MOCK_NOVELS];

  if (category !== 'all') {
    const categoryMap = {
      'sci-fi': ['科幻', '赛博朋克', '太空探索'],
      'fantasy': ['奇幻', '史诗', '魔法'],
      'urban': ['都市', '群像'],
      'historical': ['古风', '武侠', '仙侠'],
      'romance': ['言情', '青春', '治愈'],
      'mystery': ['悬疑', '破案']
    };

    const tags = categoryMap[category] || [];
    filtered = MOCK_NOVELS.filter(novel =>
      novel.tags.some(tag => tags.includes(tag))
    );
  }

  const sorted = filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  newWorksGrid.innerHTML = sorted.slice(0, 8).map(novel => {
    const card = createNovelCard(novel, { showStats: true });
    return card.outerHTML;
  }).join('');
}
