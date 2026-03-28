/**
 * Library Page
 * User's personal bookshelf
 */

import { authService } from '../services/AuthService.js';
import { MOCK_BOOKMARKS, MOCK_READING_HISTORY, MOCK_NOVELS } from '../data/mockData.js';

document.addEventListener('DOMContentLoaded', () => {
  initLibraryPage();
});

function initLibraryPage() {
  const libraryEmpty = document.getElementById('libraryEmpty');
  const libraryBooks = document.getElementById('libraryBooks');
  const libraryTabs = document.querySelectorAll('.library-tab');

  // Check auth state
  if (!authService.isAuthenticated()) {
    libraryEmpty.hidden = false;
    libraryBooks.hidden = true;
  } else {
    libraryEmpty.hidden = true;
    libraryBooks.hidden = false;
    renderLibrary('reading');
  }

  // Tab switching
  libraryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      libraryTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (authService.isAuthenticated()) {
        renderLibrary(tab.dataset.tab);
      }
    });
  });
}

function renderLibrary(tab) {
  const grid = document.getElementById('booksGrid');
  if (!grid) return;

  let books = [];

  switch (tab) {
    case 'reading':
      books = MOCK_BOOKMARKS.filter(b => b.progress < 1).map(b => ({
        ...b.novel,
        progress: b.progress
      }));
      break;
    case 'bookmarks':
      books = MOCK_BOOKMARKS.map(b => b.novel);
      break;
    case 'completed':
      books = MOCK_BOOKMARKS.filter(b => b.progress >= 1).map(b => ({
        ...b.novel,
        progress: 1
      }));
      break;
    case 'history':
      books = MOCK_READING_HISTORY.map(h => ({
        ...h.novel,
        lastRead: h.lastRead
      }));
      break;
  }

  if (books.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>暂无内容</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = books.map(novel => `
    <a href="/novel/${novel.slug}" class="library-book-card">
      <div class="book-cover">
        <img src="${novel.coverImage}" alt="${novel.title}" loading="lazy">
        ${novel.progress !== undefined ? `
          <div class="book-progress">
            <div class="progress-bar" style="width: ${novel.progress * 100}%"></div>
          </div>
        ` : ''}
      </div>
      <div class="book-info">
        <h3>${novel.title}</h3>
        <p class="book-author">${novel.author?.displayName || novel.authorName}</p>
        <div class="book-tags">
          ${novel.tags?.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
        </div>
      </div>
    </a>
  `).join('');
}
