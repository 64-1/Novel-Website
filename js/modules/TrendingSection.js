import { trendingScore } from "../search/popularity.js";
import { MOCK_NOVELS } from "../data/mockData.js";

function formatRelativeUpdate(updatedValue) {
  if (!updatedValue) {
    return "暂无更新";
  }
  const timestamp = Date.parse(updatedValue);
  if (!Number.isFinite(timestamp)) {
    return "暂无更新";
  }
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) {
    return "刚刚更新";
  }
  if (days === 1) {
    return "1 天前更新";
  }
  if (days < 30) {
    return `${days} 天前更新`;
  }
  const months = Math.floor(days / 30);
  if (months <= 1) {
    return "1 个月前更新";
  }
  return `${months} 个月前更新`;
}

export async function initTrendingSection() {
  const container = document.getElementById("trendingList");
  if (!container) {
    return;
  }

  const section = container.closest(".trending-section");
  if (section) {
    section.setAttribute("aria-busy", "true");
  }

  try {
    // Show skeleton loaders first
    container.innerHTML = `
      <div class="trending-card trending-card--skeleton" role="listitem">
        <div class="skeleton-cover"></div>
        <div class="trending-meta">
          <div class="skeleton-title"></div>
          <div class="skeleton-meta"></div>
        </div>
      </div>
      <div class="trending-card trending-card--skeleton" role="listitem">
        <div class="skeleton-cover"></div>
        <div class="trending-meta">
          <div class="skeleton-title"></div>
          <div class="skeleton-meta"></div>
        </div>
      </div>
      <div class="trending-card trending-card--skeleton" role="listitem">
        <div class="skeleton-cover"></div>
        <div class="trending-meta">
          <div class="skeleton-title"></div>
          <div class="skeleton-meta"></div>
        </div>
      </div>
    `;

    // Simulate network delay for realistic loading
    await new Promise(resolve => setTimeout(resolve, 600));

    // Use mock data instead of fetch
    const novels = MOCK_NOVELS;

    if (!novels || novels.length === 0) {
      container.innerHTML = `<div class="trending-empty" role="listitem">暂无收录数据</div>`;
      return;
    }

    // Sort by trending score and take top 10
    const ranked = novels
      .slice()
      .sort((a, b) => trendingScore(b) - trendingScore(a))
      .slice(0, 10);

    container.innerHTML = ranked
      .map((novel) => {
        const slug = encodeURIComponent(novel.slug);
        const meta = formatRelativeUpdate(novel.updatedAt);
        const hasCover = Boolean(novel.coverImage);
        const coverClass = hasCover ? "trending-cover" : "trending-cover trending-cover--placeholder";
        const coverImage = hasCover ? `<img src="${novel.coverImage}" alt="${novel.title} 封面">` : "";
        const coverTitle = hasCover ? "" : `<span class="cover-title">${novel.title}</span>`;
        return `
          <a class="trending-card" role="listitem" href="/novel/${slug}">
            <div class="${coverClass}">
              ${coverImage}
              ${coverTitle}
            </div>
            <div class="trending-meta">
              <span class="trending-title">${novel.title}</span>
              <span class="trending-updated">${meta}</span>
            </div>
          </a>
        `;
      })
      .join("");
  } catch (error) {
    console.warn("[Trending] failed to render trending section", error);
    container.innerHTML = `<div class="trending-empty" role="listitem">加载趋势数据时出错</div>`;
  } finally {
    if (section) {
      section.setAttribute("aria-busy", "false");
    }
  }
}
