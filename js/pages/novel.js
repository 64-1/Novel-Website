/**
 * Novel Reading Page
 * Handles loading novel data from URL slug and redirects to immersive reader
 */

import { MOCK_NOVELS, getNovelBySlug } from '../data/mockData.js';

document.addEventListener('DOMContentLoaded', async () => {
  const pageLoading = document.getElementById('pageLoading');
  const page404 = document.getElementById('page404');
  const mainLayout = document.querySelector('.immersive-layout');
  const novelInfo = document.getElementById('novelInfo');

  // Get slug from URL
  const slug = getSlugFromUrl();

  if (!slug) {
    show404();
    return;
  }

  // Find novel by slug
  const novel = getNovelBySlug(slug) || findNovelBySlug(slug);

  if (!novel) {
    show404();
    return;
  }

  // Update page metadata
  updatePageMeta(novel);

  // Show main layout
  if (mainLayout) mainLayout.hidden = false;
  if (pageLoading) pageLoading.hidden = true;

  // Redirect to read.html with the novel slug
  // The immersive reader will load the chapter content
  window.location.href = `/read.html?novel=${encodeURIComponent(novel.slug)}`;
});

function getSlugFromUrl() {
  // Match /novel/{slug} or /novel/{slug}/
  const pathMatch = window.location.pathname.match(/^\/novel\/([^/]+)\/?$/);
  if (pathMatch) {
    return decodeURIComponent(pathMatch[1]);
  }

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug') || params.get('novel');
  if (slug) {
    return slug;
  }

  return null;
}

function findNovelBySlug(slug) {
  // Try exact match first
  const exact = MOCK_NOVELS.find(n => n.slug === slug);
  if (exact) return exact;

  // Try case-insensitive match
  const lower = slug.toLowerCase();
  return MOCK_NOVELS.find(n => n.slug.toLowerCase() === lower);
}

function updatePageMeta(novel) {
  const title = document.getElementById('pageTitle');
  const description = document.getElementById('pageDescription');
  const ogTitle = document.getElementById('ogTitle');
  const ogDescription = document.getElementById('ogDescription');
  const ogImage = document.getElementById('ogImage');
  const twitterTitle = document.getElementById('twitterTitle');
  const twitterDescription = document.getElementById('twitterDescription');
  const canonicalUrl = document.getElementById('canonicalUrl');

  const fullTitle = `${novel.title} · 星海小说`;
  const metaDesc = novel.synopsis ? novel.synopsis.slice(0, 120) : `${novel.title} - 在星海小说阅读最新章节`;

  if (title) title.textContent = fullTitle;
  if (description) description.content = metaDesc;
  if (ogTitle) ogTitle.content = fullTitle;
  if (ogDescription) ogDescription.content = metaDesc;
  if (ogImage && novel.coverImage) ogImage.content = novel.coverImage;
  if (twitterTitle) twitterTitle.content = fullTitle;
  if (twitterDescription) twitterDescription.content = metaDesc;
  if (canonicalUrl) canonicalUrl.href = `/novel/${encodeURIComponent(novel.slug)}`;

  // Update novel info element for other scripts
  const novelTitle = document.getElementById('novelTitle');
  const novelAuthor = document.getElementById('novelAuthor');
  const novelCover = document.getElementById('novelCover');
  const novelSynopsis = document.getElementById('novelSynopsis');

  if (novelTitle) novelTitle.textContent = novel.title;
  if (novelAuthor && novel.author) novelAuthor.textContent = novel.author.displayName;
  if (novelCover && novel.coverImage) novelCover.textContent = novel.coverImage;
  if (novelSynopsis) novelSynopsis.textContent = novel.synopsis;
}

function show404() {
  const pageLoading = document.getElementById('pageLoading');
  const page404 = document.getElementById('page404');
  const mainLayout = document.querySelector('.immersive-layout');

  if (pageLoading) pageLoading.hidden = true;
  if (mainLayout) mainLayout.hidden = true;
  if (page404) page404.hidden = false;

  document.title = '404 · 星海小说';
}
