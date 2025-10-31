import { trendingScore } from "../search/popularity.js";

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
    const response = await fetch("/data/books.json", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to fetch books (${response.status})`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = `<div class="trending-empty" role="listitem">暂未收录数据</div>`;
      return;
    }

    const ranked = data
      .slice()
      .sort((a, b) => trendingScore(b) - trendingScore(a))
      .slice(0, 10);

    container.innerHTML = ranked
      .map((item) => {
        const title = item.title || item.title_zh || item.title_en || item.slug;
        const slug = encodeURIComponent(item.slug);
        const meta = formatRelativeUpdate(item.updated_at);
        const hasCover = Boolean(item.cover);
        const coverClass = hasCover ? "trending-cover" : "trending-cover trending-cover--placeholder";
        const coverImage = hasCover ? `<img src="${item.cover}" alt="${title} 封面">` : "";
        const coverTitle = hasCover ? "" : `<span class="cover-title">${title}</span>`;
        return `
          <a class="trending-card" role="listitem" href="/novel/${slug}">
            <div class="${coverClass}">
              ${coverImage}
              ${coverTitle}
            </div>
            <div class="trending-meta">
              <span class="trending-title">${title}</span>
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
