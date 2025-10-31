import { escapeHtmlDom as escapeHtml } from "../../utils/htmlSanitize.js";
import Strings from "../../strings.js";

export function createDrawerController({
  drawer,
  drawerPanel,
  annotationList,
  annotationsButton,
  drawerCountBadges,
  drawerTitle,
  body,
  onOpen,
  onClose
}) {
  let isOpen = false;
  let currentTab = "highlights";

  function open() {
    if (!drawer) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    annotationsButton?.setAttribute("aria-expanded", "true");
    isOpen = true;
    body.classList.add("drawer-open");
    if (onOpen) onOpen();
    drawerPanel?.focus({ preventScroll: true });
  }

  function close() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    annotationsButton?.setAttribute("aria-expanded", "false");
    isOpen = false;
    body.classList.remove("drawer-open");
    if (onClose) onClose();
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function setTab(tabName) {
    if (currentTab === tabName) return false;
    currentTab = tabName;
    return true;
  }

  function getCurrentTab() {
    return currentTab;
  }

  function updateCounts(counts) {
    if (drawerCountBadges.highlights) {
      drawerCountBadges.highlights.textContent = counts.highlights || 0;
    }
    if (drawerCountBadges.bookmarks) {
      drawerCountBadges.bookmarks.textContent = counts.bookmarks || 0;
    }
  }

  function setTitle(title) {
    if (drawerTitle) {
      drawerTitle.textContent = title;
    }
  }

  function clearList() {
    if (!annotationList) return;
    annotationList.innerHTML = "";
    annotationList.setAttribute("role", "list");
  }

  function renderEmpty(tabName) {
    if (!annotationList) return;
    const empty = document.createElement("div");
    empty.className = "annotations-empty";
    empty.textContent =
      tabName === "highlights" ? Strings.annotations.noHighlights : Strings.annotations.noBookmarks;
    annotationList.appendChild(empty);
  }

  function renderAnnotationItem(item) {
    const container = document.createElement("div");
    container.className = "annotation-item";
    container.dataset.annId = item.id;
    container.setAttribute("role", "listitem");
    container.setAttribute("tabindex", "0");

    if (item.id.startsWith("hl_")) {
      const createdAt = new Date(item.createdAt);
      const timeStr = createdAt.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric"
      });
      container.innerHTML = `
        <div class="annotation-content">
          <div class="annotation-snippet">高亮片段</div>
          ${item.note ? `<div class="annotation-note">${escapeHtml(String(item.note))}</div>` : ""}
          <div class="annotation-meta">${timeStr}</div>
        </div>
        <button class="annotation-delete" type="button" data-action="delete" aria-label="${Strings.annotations.delete}">×</button>
      `;
    } else {
      const percent = Math.round((item.percent || 0) * 100);
      const createdAt = new Date(item.createdAt);
      const timeStr = createdAt.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric"
      });
      container.innerHTML = `
        <div class="annotation-content">
          <div class="annotation-snippet">${percent}%</div>
          ${item.note ? `<div class="annotation-note">${escapeHtml(String(item.note))}</div>` : ""}
          <div class="annotation-meta">${timeStr}</div>
        </div>
        <button class="annotation-delete" type="button" data-action="delete" aria-label="${Strings.annotations.delete}">×</button>
      `;
    }

    return container;
  }

  function renderTocItem(chapter, index, isActive, totalChapters) {
    const button = document.createElement("button");
    button.className = "annotation-item annotation-item--toc";
    button.type = "button";
    button.dataset.chapterIndex = String(index);
    button.setAttribute("role", "listitem");
    button.setAttribute("tabindex", "0");

    if (isActive) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "true");
    }

    button.innerHTML = `
      <div class="annotation-content">
        <div class="annotation-snippet">${escapeHtml(chapter.title || `第 ${index + 1} 章`)}</div>
        <div class="annotation-meta">${index + 1} / ${totalChapters}</div>
      </div>
      <span class="annotation-toc-arrow">›</span>
    `;

    return button;
  }

  return {
    open,
    close,
    toggle,
    isOpen: () => isOpen,
    setTab,
    getCurrentTab,
    updateCounts,
    setTitle,
    clearList,
    renderEmpty,
    renderAnnotationItem,
    renderTocItem,
    getListElement: () => annotationList
  };
}
