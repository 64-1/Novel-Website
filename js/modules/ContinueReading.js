import { LastReadStore, ProgressStore } from "../services/Stores.js";
import ChaptersRepo from "../services/ChaptersRepo.js";

export async function initContinueReading() {
  const slot = document.getElementById("continue-reading-slot");
  if (!slot) {
    return;
  }

  const record = LastReadStore.get();
  if (!record || !record.slug) {
    return;
  }

  await ChaptersRepo.load();
  const index = ChaptersRepo.getIndexBySlug(record.slug);
  if (typeof index !== "number" || index < 0) {
    LastReadStore.clear();
    return;
  }
  const chapter = ChaptersRepo.getByIndex(index);
  if (!chapter) {
    LastReadStore.clear();
    return;
  }
  const progress = ProgressStore.load(record.slug) || 0;
  const percent = Math.round(Math.max(0, Math.min(progress, 1)) * 100);
  const href = `/novel/${encodeURIComponent(record.slug)}`;

  const card = document.createElement("div");
  card.className = "sidebar-card continue-reading-card";

  const heading = document.createElement("h4");
  heading.textContent = "继续阅读";

  const title = document.createElement("p");
  title.className = "continue-reading-title";
  title.textContent = chapter.title;

  const meta = document.createElement("div");
  meta.className = "continue-reading-meta";
  meta.textContent = `已读 ${percent}%`;

  const link = document.createElement("a");
  link.className = "btn primary";
  link.href = href;
  link.textContent = "继续";

  card.append(heading, title, meta, link);

  slot.appendChild(card);
}
