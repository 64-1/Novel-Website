(function (global) {
  if (global.NovelTocList) {
    return;
  }

  const ChaptersRepo = global.NovelChaptersRepo;

  if (!ChaptersRepo) {
    throw new Error("NovelTocList requires NovelChaptersRepo to be loaded first.");
  }

  function create({ tocContainer, modalContainer, onChapterSelect } = {}) {
    if (!tocContainer && !modalContainer) {
      return Object.freeze({
        render() {},
        setActive() {}
      });
    }

    const selectChapter = typeof onChapterSelect === "function" ? onChapterSelect : null;

    let chapters = [];
    let currentIndex = -1;
    let primaryItems = [];
    let modalItems = [];
    let modalListElement = null;

    function render() {
      chapters = ChaptersRepo.list();
      if (!Array.isArray(chapters)) {
        chapters = [];
      }

      renderPrimaryList();
      renderModalList();

      if (!chapters.length) {
        currentIndex = -1;
        updateActiveState(primaryItems, -1);
        updateActiveState(modalItems, -1);
        return;
      }

      const targetIndex =
        currentIndex >= 0 && currentIndex < chapters.length ? currentIndex : 0;
      setActive(targetIndex);
    }

    function renderPrimaryList() {
      if (!tocContainer) return;
      tocContainer.innerHTML = "";
      primaryItems = [];

      chapters.forEach((chapter, index) => {
        const item = document.createElement("li");
        item.textContent = chapter.title;
        item.dataset.slug = chapter.slug;
        item.dataset.index = String(index);
        item.addEventListener("click", () => handleSelection(index));
        tocContainer.appendChild(item);
        primaryItems.push(item);
      });
    }

    function renderModalList() {
      if (!modalContainer) return;
      modalListElement = modalContainer.querySelector("ol");
      if (!modalListElement) {
        modalListElement = document.createElement("ol");
        modalContainer.innerHTML = "";
        modalContainer.appendChild(modalListElement);
      } else {
        modalListElement.innerHTML = "";
      }

      modalItems = [];
      chapters.forEach((chapter, index) => {
        const item = document.createElement("li");
        item.textContent = chapter.title;
        item.dataset.slug = chapter.slug;
        item.dataset.index = String(index);
        item.addEventListener("click", () => handleSelection(index));
        modalListElement.appendChild(item);
        modalItems.push(item);
      });
    }

    function handleSelection(index) {
      if (index < 0 || index >= chapters.length) {
        return;
      }
      if (selectChapter) {
        selectChapter(index);
      }
    }

    function updateActiveState(items, activeIndex) {
      items.forEach((item, index) => {
        const isActive = index === activeIndex;
        item.classList.toggle("active", isActive);
        if (isActive) {
          item.setAttribute("aria-current", "true");
        } else {
          item.removeAttribute("aria-current");
        }
      });
    }

    function setActive(index) {
      if (!chapters.length) {
        currentIndex = -1;
        updateActiveState(primaryItems, -1);
        updateActiveState(modalItems, -1);
        return;
      }

      const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
      currentIndex = safeIndex;
      updateActiveState(primaryItems, safeIndex);
      updateActiveState(modalItems, safeIndex);
    }

    return Object.freeze({
      render,
      setActive
    });
  }

  global.NovelTocList = Object.freeze({
    create
  });
})(window);
