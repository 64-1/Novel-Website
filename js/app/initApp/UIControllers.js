/**
 * UI Controllers Module
 * Handles tabs, buttons, scrolling, toasts, and other UI interactions
 */

export function createUIControllers({
  scrollButtons,
  readerLayoutBtn,
  openReaderBtn,
  openWriterBtn,
  tabs,
  panels,
  ideaButton,
  noteList,
  ideaToast,
  readerGrid,
  readerContent,
  modalContent,
  readerProgressTracker,
  readerModalController,
  chapterManager,
  Strings
} = {}) {
  let toastTimeout;

  function showToast(message) {
    if (!ideaToast) return;
    ideaToast.textContent = message;
    ideaToast.classList.add("active");
    clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      ideaToast.classList.remove("active");
    }, 2400);
  }

  function updateReaderLayoutLabel() {
    if (!readerLayoutBtn) return;
    const labels = Strings?.buttons?.toggleWide || {};
    const expandedLabel = labels.expanded || "切换常规";
    const collapsedLabel = labels.collapsed || "切换宽屏";
    readerLayoutBtn.textContent = readerLayoutBtn.classList.contains("active")
      ? expandedLabel
      : collapsedLabel;
  }

  function scrollActiveContainer(direction) {
    const container = readerModalController?.isOpen() && modalContent ? modalContent : readerContent;
    if (!container) return;
    const amount = Math.max(container.clientHeight * 0.9, 200);
    const offset = direction === "down" ? amount : -amount;
    container.scrollBy({ top: offset, behavior: "smooth" });
  }

  function initialize() {
    // Scroll buttons
    scrollButtons?.forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = button.getAttribute("data-target");
        if (!target) return;
        event.preventDefault();
        document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    // Open writer button
    openWriterBtn?.addEventListener("click", () => {
      document.getElementById("writer")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Reader layout toggle button
    readerLayoutBtn?.addEventListener("click", () => {
      readerGrid?.classList.toggle("expanded");
      readerLayoutBtn.classList.toggle("active");
      updateReaderLayoutLabel();
      readerProgressTracker?.refresh({ fromStorage: true });
    });
    updateReaderLayoutLabel();

    // Writer tabs
    tabs?.forEach((tab) => {
      tab.addEventListener("click", () => {
        const panelId = tab.dataset.panel;
        tabs.forEach((t) => t.classList.remove("active"));
        panels?.forEach((panel) => panel.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById(`panel-${panelId}`)?.classList.add("active");
      });
    });

    // Idea capture button
    ideaButton?.addEventListener("click", () => {
      const idea = window.prompt("记录下此刻的灵感片段：");
      if (!idea) return;
      const item = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = "灵感快照";
      const paragraph = document.createElement("p");
      paragraph.textContent = idea;
      item.appendChild(strong);
      item.appendChild(paragraph);
      noteList?.prepend(item);
      showToast(Strings?.toasts?.ideaCaptured || "灵感已捕捉，稍后可在"章节笔记"查看。");
    });

    // Visibility change handler
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        chapterManager?.clearCache();
      }
    });
  }

  return {
    initialize,
    showToast,
    scrollActiveContainer,
    updateReaderLayoutLabel
  };
}
