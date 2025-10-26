document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const shellThemeKey = "xinghai-shell-theme";
  const readerSettingsKey = "xinghai-reader-settings";
  const draftStorageKey = "novel:draft";

  const themeToggleBtn = document.querySelector('[data-action="toggle-theme"]');
  const scrollButtons = document.querySelectorAll('[data-action="scroll"]');
  const readerLayoutBtn = document.querySelector('[data-action="toggle-reader-layout"]');
  const openReaderBtn = document.querySelector('[data-action="open-reader"]');
  const openWriterBtn = document.querySelector('[data-action="open-writer"]');
  const readerGrid = document.querySelector(".reader-grid");
  const readerContent = document.querySelector(".reader-content");
  const fontSlider = document.querySelector('input[data-action="font-size"]');
  const lineSlider = document.querySelector('input[data-action="line-height"]');
  const readerThemeButtons = document.querySelectorAll(".theme-toggle .pill");
  const tocList = document.querySelector(".toc ol");
  let tocItems = [];
  const readerProgressBar = document.querySelector('[data-progress="reader"]');
  const readerProgressFill = readerProgressBar?.querySelector(".progress-fill");
  const readerModal = document.getElementById("reader-modal");
  const modalToc = readerModal ? readerModal.querySelector(".modal-toc") : null;
  const modalArticle = readerModal ? readerModal.querySelector(".modal-article") : null;
  const modalCloseElements = readerModal ? readerModal.querySelectorAll('[data-action="close-modal"]') : [];
  const modalProgressBar = document.querySelector('[data-progress="modal"]');
  const modalProgressFill = modalProgressBar?.querySelector(".progress-fill");
  const modalContent = readerModal ? readerModal.querySelector(".modal-content") : null;
  const tabs = document.querySelectorAll(".writer-tabs .tab");
  const panels = document.querySelectorAll(".writer-panels .panel");
  const noteList = document.querySelector(".note-list");
  const ideaToast = document.getElementById("idea-toast");
  const ideaButton = document.querySelector('[data-action="capture-idea"]');
  const autosaveStatus = document.getElementById("autosave-status");
  const exportButton = document.querySelector('[data-action="export-markdown"]');
  const importButton = document.querySelector('[data-action="import-markdown"]');
  const importInput = document.getElementById("import-file");
  const draftTitle = document.getElementById("draft-title");
  const draftTags = document.getElementById("draft-tags");
  const draftBody = document.getElementById("draft-body");
  const wordCountDisplay = document.getElementById("word-count");
  const previewTitle = document.getElementById("preview-title");
  const previewBody = document.getElementById("preview-body");
  const previewTags = document.getElementById("preview-tags");
  const musicSelect = document.getElementById("music-mood");
  const playMusicButton = document.querySelector('[data-action="play-music"]');

  let toastTimeout;
  let currentChapterIndex = 0;
  let readerProgressTracker;
  let modalProgressTracker;
  let autosaveTimer = null;
  let lastSavedSnapshot = "";
  const AUTOSAVE_DELAY = 1000;
  let readerThemeOverride = false;
  let lastFocusedElement = null;
  let focusTrapListener = null;
  let focusableModalElements = [];
  let firstModalFocusable = null;
  let lastModalFocusable = null;
  const FOCUSABLE_SELECTOR =
    'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

  if (modalContent && !modalContent.hasAttribute("tabindex")) {
    modalContent.setAttribute("tabindex", "-1");
  }

  // LocalStorage keys for per-chapter reading progress (slug-based)
  const STORAGE_KEYS = {
    reader: (id) => `progress:${id}`,
    modal: (id) => `progress:modal:${id}`
  };

  const fallbackChapters = [
    {
      id: "chapter-12",
      slug: "lightfall-ode",
      title: "第十二章 · 光落之歌",
      summary: "黎川在浮城的晨光中迎接新的讯息，面对即将到来的记忆回廊。",
      paragraphs: [
        "清晨的雾气在浮城的边缘缓缓流淌，像是整个天空都在呼吸。黎川站在透明的观星台，任由脚下的城市随着光线渐渐醒来。远处的漂浮群岛一点点靠近，像翻涌的云海中漂浮的灯塔。",
        "他把手掌贴在护栏上，微弱的震动透过指尖传来。一条新的讯息浮现在眼前：“晨光谱系数据回传完成——记忆回廊将于 30 分钟后开启。”",
        {
          type: "blockquote",
          text: "“如果真实让你恐惧，那就把恐惧化作光。” ——浮城传说"
        },
        "黎川深吸一口气。他知道，这是一次无法回头的旅程。记忆回廊会将旧日与未来重叠，让每个人都看见真正的自己。但他更担心的是，若那些沉睡的记忆苏醒，城市是否做好承受真相的准备。",
        "他回头看向站在门口的夏茗。她的额前还挂着未干的水滴，显然是一路奔跑过来的。“计划提前了，浮城委员会需要我们现在就做决定。”夏茗轻声说道。",
        "黎川点头，目光重新投向渐渐升起的太阳。光线穿透雾气，将整个浮城染成金色。他突然明白，不论结果如何，这座城市终将迎来自己的黎明。"
      ]
    },
    {
      id: "chapter-13",
      slug: "tide-echoes",
      title: "第十三章 · 海浪回音",
      summary: "浮城外海的隐秘实验室暴露更多真相，夏茗与黎川的过往也渐渐浮现。",
      paragraphs: [
        "浮城下方的悬空平台上，潮汐声与引擎声交织成一片微妙的噪音。夏茗循着记忆中的路线来到被废弃的实验室，推开门时，一股咸味与机油味混杂的气息扑面而来。",
        "墙壁上的旧式投影仪还在运转，播放着十年前的一段影像。影像里，两名少年站在同一个平台上，其中一个正是年少的黎川。另一名则是早已失踪的浮城建模师——夏茗的兄长。",
        {
          type: "blockquote",
          text: "“我们做的是预演未来的方式，不是抹除过去。” ——兄长留下的记录"
        },
        "影像临结束时，黎川转过身对镜头微笑，那一瞬间，夏茗终于明白他为何对“真实”如此执着。那不是他一个人的执念，而是代替别人守护的承诺。",
        "潮汐声渐渐淹没了投影仪的嗡鸣。夏茗伸出手，抚过屏幕上微微颤动的光影——她必须在黎川踏入记忆回廊之前，告诉他这段被隐藏的历史。"
      ]
    },
    {
      id: "chapter-14",
      slug: "nocturne-resonance",
      title: "第十四章 · 静夜共鸣",
      summary: "记忆回廊开启前夜，浮城的灯火下，各自的心声交汇成新的共鸣。",
      paragraphs: [
        "夜幕降临，浮城的中央塔楼亮起层层光环，像一支庞大的风琴正在缓缓调音。黎川和夏茗站在塔顶，俯瞰整个城市。风声带着遥远的歌声，像是谁在夜里低声呼唤。",
        "市民们自发点亮窗边的光带，连成波浪形的图案，用默默的方式祝福即将开启的仪式。黎川第一次感受到，这座城市不仅是数据和钢骨，更是无数心跳叠加的乐章。",
        {
          type: "blockquote",
          text: "“我们不是为了记住痛苦，而是为了记住彼此。” ——夏茗"
        },
        "他们肩并肩坐在塔楼阶梯上，分享着从孩童时代就珍藏的回忆。那些尘封的夜晚、秘密的约定、被删除的录音，全都在此刻重新回到他们手中。",
        "当午夜钟声敲响，浮城的天空开放了一条细长的光缝。记忆回廊正式启动——而黎川终于不再孤身一人。"
      ]
    }
  ];
  let chapters = [];

  const readerSettings = loadReaderSettings();
  applyReaderSettings();

  readerProgressTracker = createProgressTracker({
    container: readerContent,
    progressBar: readerProgressBar,
    progressFill: readerProgressFill,
    context: "reader"
  });

  modalProgressTracker = createProgressTracker({
    container: modalArticle,
    progressBar: modalProgressBar,
    progressFill: modalProgressFill,
    context: "modal"
  });

  initialiseShellTheme();
  loadDraftFromStorage();
  updateWordCount();
  updatePreview();
  initChapters();

  // ---------- Theme & Shell ----------
  themeToggleBtn?.addEventListener("click", () => {
    body.classList.toggle("dark-shell");
    const mode = getShellMode();
    localStorage.setItem(shellThemeKey, mode);
    updateShellThemeButton(mode);
    syncReaderThemeWithShell();
  });

  function initialiseShellTheme() {
    const stored = localStorage.getItem(shellThemeKey);
    if (stored === "dark") {
      body.classList.add("dark-shell");
    }
    const mode = getShellMode();
    updateShellThemeButton(mode);
    syncReaderThemeWithShell({ respectOverride: false });
  }

  function updateShellThemeButton(mode) {
    if (!themeToggleBtn) return;
    themeToggleBtn.textContent = mode === "dark" ? "日间模式" : "夜间模式";
  }

  function getShellMode() {
    return body.classList.contains("dark-shell") ? "dark" : "light";
  }

  function syncReaderThemeWithShell({ respectOverride = true } = {}) {
    if (respectOverride && readerThemeOverride) {
      return;
    }
    const desiredTheme = getShellMode() === "dark" ? "night" : "day";
    if (readerSettings.theme !== desiredTheme) {
      readerSettings.theme = desiredTheme;
      applyReaderSettings();
      persistReaderSettings();
      syncModalTheme();
    }
    readerThemeOverride = false;
  }

  async function initChapters() {
    const remoteChapters = await loadChaptersFromJson();
    const normalizedFallback = fallbackChapters.map((chapter, index) => normalizeChapter(chapter, index)).filter(Boolean);
    const normalizedRemote = remoteChapters.length
      ? remoteChapters
      : [];
    chapters = normalizedRemote.length ? normalizedRemote : normalizedFallback;

    if (!chapters.length) {
      console.warn("未找到任何章节数据。");
      return;
    }

    renderToc();
    setupModalContents();
    currentChapterIndex = Math.min(currentChapterIndex, chapters.length - 1);
    selectChapter(currentChapterIndex);
  }

  async function loadChaptersFromJson() {
    try {
      const response = await fetch("chapters.json", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("章节数据格式无效，需要数组。");
      }
      return data.map((chapter, index) => normalizeChapter(chapter, index)).filter(Boolean);
    } catch (error) {
      console.warn("加载章节 JSON 失败，使用内置章节。", error);
      return [];
    }
  }

  function normalizeChapter(raw, index) {
    if (!raw || typeof raw !== "object") return null;
    const id =
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `chapter-${index + 1}`;
    const slugSource =
      typeof raw.slug === "string" && raw.slug.trim()
        ? raw.slug.trim()
        : id;
    const slug = slugSource.replace(/\s+/g, "-");
    const title =
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim()
        : `章节 ${index + 1}`;
    const summary =
      typeof raw.summary === "string" ? raw.summary.trim() : "";
    const paragraphs = Array.isArray(raw.paragraphs)
      ? raw.paragraphs
          .map((paragraph) => normalizeParagraph(paragraph))
          .filter((paragraph) => paragraph !== null)
      : [];

    return {
      id,
      slug,
      title,
      summary,
      paragraphs
    };
  }

  function normalizeParagraph(entry) {
    if (typeof entry === "string") {
      return entry;
    }
    if (entry && typeof entry === "object") {
      if (entry.type === "blockquote") {
        const text = typeof entry.text === "string" ? entry.text : "";
        if (!text) return null;
        return { type: "blockquote", text };
      }
      if (typeof entry.text === "string") {
        return entry.text;
      }
    }
    return null;
  }

  // ---------- Smooth scroll ----------
  scrollButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = button.getAttribute("data-target");
      if (!target) return;
      event.preventDefault();
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  openWriterBtn?.addEventListener("click", () => {
    document.getElementById("writer")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---------- Reader controls ----------
  fontSlider?.addEventListener("input", (event) => {
    readerSettings.fontSize = Number(event.target.value);
    applyReaderSettings();
    persistReaderSettings();
  });

  lineSlider?.addEventListener("input", (event) => {
    readerSettings.lineHeight = Number(event.target.value);
    applyReaderSettings();
    persistReaderSettings();
  });

  readerThemeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedTheme = btn.dataset.theme || "day";
      readerSettings.theme = selectedTheme;
      readerThemeOverride = selectedTheme !== (getShellMode() === "dark" ? "night" : "day");
      applyReaderSettings();
      persistReaderSettings();
      syncModalTheme();
    });
  });

  readerLayoutBtn?.addEventListener("click", () => {
    readerGrid?.classList.toggle("expanded");
    readerLayoutBtn.classList.toggle("active");
    readerLayoutBtn.textContent = readerLayoutBtn.classList.contains("active") ? "切换常规" : "切换宽屏";
    readerProgressTracker?.refresh({ fromStorage: true });
  });

  openReaderBtn?.addEventListener("click", () => {
    if (!readerModal) return;
    lastFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    readerModal.classList.add("active");
    readerModal.setAttribute("aria-hidden", "false");
    syncModalTheme();
    modalProgressTracker?.refresh({ fromStorage: true });
    document.documentElement.style.overflow = "hidden";
    activateFocusTrap();
    requestAnimationFrame(() => focusFirstModalElement());
  });

  modalCloseElements.forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  if (readerModal) {
    readerModal.addEventListener("click", (event) => {
      if (event.target === readerModal) {
        closeModal();
      }
    });
  }

  document.addEventListener("keydown", handleGlobalKeydown);

  function closeModal() {
    if (!readerModal) return;
    readerModal.classList.remove("active");
    readerModal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    deactivateFocusTrap();
    restoreFocus();
  }

  function loadReaderSettings() {
    try {
      const stored = localStorage.getItem(readerSettingsKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          fontSize: Number(parsed.fontSize) || 18,
          lineHeight: Number(parsed.lineHeight) || 1.6,
          theme: parsed.theme || "day"
        };
      }
    } catch (error) {
      console.warn("读取阅读设置失败，使用默认值。", error);
    }
    return { fontSize: 18, lineHeight: 1.6, theme: "day" };
  }

  function persistReaderSettings() {
    localStorage.setItem(readerSettingsKey, JSON.stringify(readerSettings));
  }

  function applyReaderSettings() {
    if (!readerContent) return;
    readerContent.style.fontSize = `${readerSettings.fontSize}px`;
    readerContent.style.lineHeight = readerSettings.lineHeight;
    readerContent.dataset.theme = readerSettings.theme;
    if (fontSlider) fontSlider.value = readerSettings.fontSize;
    if (lineSlider) lineSlider.value = readerSettings.lineHeight;
    readerThemeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === readerSettings.theme);
    });

    readerProgressTracker?.refresh({ fromStorage: true });
    modalProgressTracker?.refresh({ fromStorage: true });
  }

  function selectChapter(index) {
    if (!chapters.length) return;
    const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
    currentChapterIndex = safeIndex;
    renderChapter(safeIndex);
    renderChapter(safeIndex, modalArticle);
    highlightToc(safeIndex);
    updateModalList(safeIndex);
    syncModalTheme();
  }

  function renderChapter(index, target = readerContent) {
    const chapter = chapters[index];
    if (!chapter || !target) return;
    const slug = chapter.slug || chapter.id || `chapter-${index + 1}`;
    target.innerHTML = "";
    const title = document.createElement("h3");
    title.textContent = chapter.title;
    target.appendChild(title);

    if (target === modalArticle && chapter.summary) {
      const summary = document.createElement("p");
      summary.className = "chapter-summary";
      summary.textContent = chapter.summary;
      target.appendChild(summary);
    }

    chapter.paragraphs.forEach((paragraph) => {
      if (typeof paragraph === "string") {
        const p = document.createElement("p");
        p.textContent = paragraph;
        target.appendChild(p);
      } else if (paragraph && paragraph.type === "blockquote") {
        const block = document.createElement("blockquote");
        block.textContent = paragraph.text;
        target.appendChild(block);
      }
    });

    if (target === readerContent) {
      readerProgressTracker?.onChapterRendered(slug);
    }

    if (target === modalArticle) {
      modalProgressTracker?.onChapterRendered(slug);
    }

    refreshFocusTrapElements();
  }

  function renderToc() {
    if (!tocList) return;
    tocList.innerHTML = "";
    chapters.forEach((chapter, index) => {
      const item = document.createElement("li");
      item.textContent = chapter.title;
      item.dataset.slug = chapter.slug || chapter.id || `chapter-${index + 1}`;
      item.addEventListener("click", () => selectChapter(index));
      tocList.appendChild(item);
    });
    tocItems = Array.from(tocList.querySelectorAll("li"));
    refreshFocusTrapElements();
  }

  function highlightToc(index) {
    tocItems.forEach((item, idx) => {
      const isActive = idx === index;
      item.classList.toggle("active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "true");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function setupModalContents() {
    if (!modalArticle || !modalToc) return;
    modalArticle.dataset.theme = readerSettings.theme;
    modalToc.innerHTML = "";
    const list = document.createElement("ol");
    chapters.forEach((chapter, index) => {
      const item = document.createElement("li");
      const isActive = index === currentChapterIndex;
      item.textContent = chapter.title;
      item.dataset.slug = chapter.slug || chapter.id || `chapter-${index + 1}`;
      if (isActive) {
        item.classList.add("active");
        item.setAttribute("aria-current", "true");
      }
      item.addEventListener("click", () => selectChapter(index));
      list.appendChild(item);
    });
    modalToc.appendChild(list);
    updateModalList(currentChapterIndex);
    refreshFocusTrapElements();
  }

  function updateModalList(index) {
    if (!modalToc) return;
    modalToc.querySelectorAll("li").forEach((li, idx) => {
      const isActive = idx === index;
      li.classList.toggle("active", isActive);
      if (isActive) {
        li.setAttribute("aria-current", "true");
      } else {
        li.removeAttribute("aria-current");
      }
    });
    refreshFocusTrapElements();
  }

  function syncModalTheme() {
    if (modalArticle) {
      modalArticle.dataset.theme = readerSettings.theme;
    }
  }

  function activateFocusTrap() {
    if (!readerModal) return;
    updateFocusTrapElements();
    if (!focusTrapListener) {
      focusTrapListener = (event) => handleFocusTrapKeydown(event);
      readerModal.addEventListener("keydown", focusTrapListener);
    }
  }

  function deactivateFocusTrap() {
    if (readerModal && focusTrapListener) {
      readerModal.removeEventListener("keydown", focusTrapListener);
    }
    focusTrapListener = null;
    focusableModalElements = [];
    firstModalFocusable = null;
    lastModalFocusable = null;
  }

  function updateFocusTrapElements() {
    const container = modalContent || readerModal;
    focusableModalElements = getFocusableElements(container);
    firstModalFocusable = focusableModalElements[0] || null;
    lastModalFocusable = focusableModalElements[focusableModalElements.length - 1] || null;
  }

  function refreshFocusTrapElements() {
    if (readerModal?.classList.contains("active")) {
      updateFocusTrapElements();
    }
  }

  function focusFirstModalElement() {
    updateFocusTrapElements();
    if (firstModalFocusable) {
      firstModalFocusable.focus({ preventScroll: true });
    } else if (modalContent) {
      modalContent.focus({ preventScroll: true });
    }
  }

  function restoreFocus() {
    const focusTarget =
      lastFocusedElement && typeof lastFocusedElement.focus === "function"
        ? lastFocusedElement
        : openReaderBtn;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: true });
    }
    lastFocusedElement = null;
  }

  function handleFocusTrapKeydown(event) {
    if (event.key !== "Tab") return;
    updateFocusTrapElements();
    if (!focusableModalElements.length) {
      event.preventDefault();
      if (modalContent) {
        modalContent.focus({ preventScroll: true });
      }
      return;
    }

    const activeElement = document.activeElement;
    if (event.shiftKey) {
      if (activeElement === firstModalFocusable || !focusableModalElements.includes(activeElement)) {
        event.preventDefault();
        (lastModalFocusable || firstModalFocusable).focus({ preventScroll: true });
      }
    } else {
      if (activeElement === lastModalFocusable) {
        event.preventDefault();
        (firstModalFocusable || lastModalFocusable).focus({ preventScroll: true });
      }
    }
  }

  function getFocusableElements(container) {
    if (!container) return [];
    const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
    return elements.filter(
      (element) =>
        !element.hasAttribute("disabled") &&
        element.getAttribute("aria-hidden") !== "true" &&
        isElementVisible(element)
    );
  }

  function isElementVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  function handleGlobalKeydown(event) {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    const tagName = target?.tagName;
    if (
      target &&
      (target.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT")
    ) {
      return;
    }

    if (event.key === "Escape") {
      if (readerModal?.classList.contains("active")) {
        event.preventDefault();
        closeModal();
      }
      return;
    }

    if (!chapters.length) return;

    switch (event.key) {
      case "ArrowRight":
        if (currentChapterIndex < chapters.length - 1) {
          event.preventDefault();
          selectChapter(currentChapterIndex + 1);
        }
        break;
      case "ArrowLeft":
        if (currentChapterIndex > 0) {
          event.preventDefault();
          selectChapter(currentChapterIndex - 1);
        }
        break;
      case "j":
      case "J":
        event.preventDefault();
        scrollActiveContainer("down");
        break;
      case "k":
      case "K":
        event.preventDefault();
        scrollActiveContainer("up");
        break;
      default:
        break;
    }
  }

  function scrollActiveContainer(direction) {
    const container = readerModal?.classList.contains("active") && modalArticle ? modalArticle : readerContent;
    if (!container) return;
    const amount = Math.max(container.clientHeight * 0.9, 200);
    const offset = direction === "down" ? amount : -amount;
    container.scrollBy({ top: offset, behavior: "smooth" });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
  }

  function createProgressTracker({ container, progressBar, progressFill, context }) {
    if (!container || !progressBar || !progressFill) return null;

    let chapterSlug = null;
    let storedProgress = 0;
    let lastRun = 0;
    let trailingTimeout = null;
    const interval = 110;

    const onScroll = () => scheduleUpdate();
    container.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => refresh({ fromStorage: true });
    window.addEventListener("resize", onResize);

    let resizeObserver;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => refresh());
      resizeObserver.observe(container);
    }

    function scheduleUpdate(force = false) {
      if (force) {
        clearTimeout(trailingTimeout);
        trailingTimeout = null;
        runUpdate();
        return;
      }
      const now = performance.now();
      const remaining = interval - (now - lastRun);
      if (remaining <= 0) {
        clearTimeout(trailingTimeout);
        trailingTimeout = null;
        runUpdate();
      } else if (!trailingTimeout) {
        trailingTimeout = window.setTimeout(() => {
          trailingTimeout = null;
          runUpdate();
        }, remaining);
      }
    }

    function runUpdate() {
      lastRun = performance.now();
      const progress = getProgressFromScroll();
      renderProgress(progress);
      persistProgress(progress);
    }

    function getProgressFromScroll() {
      const { maxScroll, canScroll } = getScrollMetrics();
      if (!canScroll) {
        return 1;
      }
      const raw = maxScroll <= 0 ? 1 : container.scrollTop / maxScroll;
      return clampProgress(raw);
    }

    function getScrollMetrics() {
      const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 1);
      const canScroll = container.scrollHeight - container.clientHeight > 0;
      return { maxScroll, canScroll };
    }

    function renderProgress(progress) {
      const safeProgress = clampProgress(progress);
      const percent = safeProgress * 100;
      progressFill.style.width = `${percent}%`;
      progressBar.setAttribute("aria-valuenow", `${Math.round(percent)}`);
      progressBar.setAttribute("aria-valuetext", `已阅读 ${Math.round(percent)}%`);
    }

    function persistProgress(progress) {
      storedProgress = clampProgress(progress);
      const key = getStorageKey();
      if (!key) return;
      try {
        localStorage.setItem(key, storedProgress.toFixed(4));
      } catch (error) {
        console.warn("保存阅读进度失败：", error);
      }
    }

    function getStorageKey(slug = chapterSlug) {
      if (!slug) return null;
      const sanitizedSlug = String(slug).trim();
      if (!sanitizedSlug) return null;
      return context === "modal" ? STORAGE_KEYS.modal(sanitizedSlug) : STORAGE_KEYS.reader(sanitizedSlug);
    }

    function readStoredProgress() {
      const key = getStorageKey();
      if (!key) return 0;
      try {
        const raw = localStorage.getItem(key);
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? clampProgress(parsed) : 0;
      } catch (error) {
        console.warn("读取阅读进度失败：", error);
        return 0;
      }
    }

    function applyStoredScroll() {
      requestAnimationFrame(() => {
        const { maxScroll, canScroll } = getScrollMetrics();
        const targetProgress = canScroll ? storedProgress : 1;
        const targetScroll = canScroll ? targetProgress * maxScroll : 0;
        container.scrollTop = targetScroll;
        renderProgress(targetProgress);
        requestAnimationFrame(() => scheduleUpdate(true));
      });
    }

    function onChapterRendered(slug) {
      chapterSlug = slug;
      storedProgress = readStoredProgress();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          applyStoredScroll();
        });
      });
    }

    function refresh(options = {}) {
      const { fromStorage = false } = options;
      if (fromStorage) {
        storedProgress = readStoredProgress();
        applyStoredScroll();
      } else {
        scheduleUpdate(true);
      }
    }

    return {
      onChapterRendered,
      refresh
    };
  }

  function clampProgress(value) {
    if (Number.isNaN(value)) return 0;
    return Math.min(Math.max(value, 0), 1);
  }

  // ---------- Writer studio ----------
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const panelId = tab.dataset.panel;
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${panelId}`)?.classList.add("active");
    });
  });

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
    showToast("灵感已捕捉，稍后可在“章节笔记”查看。");
  });

  playMusicButton?.addEventListener("click", () => {
    const mood = musicSelect?.options[musicSelect.selectedIndex]?.text || "氛围配乐";
    showToast(`已为你准备「${mood}」氛围音轨，正式版即将上线。`);
    playMusicButton.textContent = "播放中...";
    playMusicButton.disabled = true;
    setTimeout(() => {
      playMusicButton.textContent = "播放预设";
      playMusicButton.disabled = false;
    }, 2200);
  });

  [draftTitle, draftTags, draftBody].forEach((input) => {
    input?.addEventListener("input", () => {
      updateWordCount();
      updatePreview();
      scheduleAutosave();
    });
  });

  exportButton?.addEventListener("click", handleExportMarkdown);
  importButton?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", handleImportMarkdown);

  function loadDraftFromStorage() {
    const draft = readDraftSnapshot();
    if (!draft) return;
    if (draftTitle) draftTitle.value = draft.title || "";
    if (draftTags) draftTags.value = draft.tags || "";
    if (draftBody) draftBody.value = draft.body || "";
    lastSavedSnapshot = JSON.stringify(buildDraftSnapshot());
    setAutosaveStatus("已自动保存");
  }

  function updateWordCount() {
    if (!wordCountDisplay) return;
    const text = draftBody?.value || "";
    const normalized = text.replace(/\s+/g, "");
    wordCountDisplay.textContent = normalized.length.toString();
  }

  function updatePreview() {
    if (previewTitle) {
      previewTitle.textContent = draftTitle?.value?.trim() || "第十三章 · 标题预览";
    }
    if (previewBody) {
      previewBody.textContent =
        draftBody?.value?.trim() || "你在写作空间中输入的内容会即时排版呈现，方便你检查节奏与段落流动。";
    }
    if (previewTags) {
      const tagsInput = draftTags?.value ?? "";
      const tagsForPreview = tagsInput ? getTagList(tagsInput, 6) : ["软科幻", "群像", "治愈"];
      const tagsFragment = document.createDocumentFragment();
      tagsForPreview.forEach((tag) => {
        const span = document.createElement("span");
        span.textContent = tag;
        tagsFragment.appendChild(span);
      });
      previewTags.innerHTML = "";
      previewTags.appendChild(tagsFragment);
    }
  }

  function scheduleAutosave(options = {}) {
    const { immediate = false } = options;
    if (!draftTitle && !draftTags && !draftBody) return;
    if (immediate) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
      performAutosave();
      return;
    }
    clearTimeout(autosaveTimer);
    setAutosaveStatus("保存中…", true);
    autosaveTimer = window.setTimeout(() => {
      performAutosave();
    }, AUTOSAVE_DELAY);
  }

  function performAutosave() {
    autosaveTimer = null;
    const snapshot = buildDraftSnapshot();
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSavedSnapshot) {
      setAutosaveStatus("已自动保存");
      return;
    }
    try {
      localStorage.setItem(draftStorageKey, serialized);
      lastSavedSnapshot = serialized;
      setAutosaveStatus("已自动保存");
    } catch (error) {
      console.error("草稿自动保存失败：", error);
      setAutosaveStatus("自动保存失败", false);
    }
  }

  function buildDraftSnapshot() {
    return {
      title: draftTitle?.value?.trim() || "",
      tags: draftTags?.value?.trim() || "",
      body: draftBody?.value || ""
    };
  }

  function readDraftSnapshot() {
    const keys = [draftStorageKey, "xinghai-draft"];
    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== "object") continue;
        return {
          title: typeof parsed.title === "string" ? parsed.title : "",
          tags: Array.isArray(parsed.tags) ? parsed.tags.join(", ") : typeof parsed.tags === "string" ? parsed.tags : "",
          body: typeof parsed.body === "string" ? parsed.body : ""
        };
      } catch (error) {
        console.warn("读取草稿失败：", error);
      }
    }
    return null;
  }

  function setAutosaveStatus(message, saving = false) {
    if (!autosaveStatus) return;
    autosaveStatus.textContent = message;
    autosaveStatus.classList.toggle("saving", Boolean(saving));
  }

  function getTagList(raw, limit) {
    const tags = (raw || "")
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (typeof limit === "number") {
      return tags.slice(0, limit);
    }
    return tags;
  }

  function handleExportMarkdown() {
    const snapshot = buildDraftSnapshot();
    const tags = getTagList(snapshot.tags);
    const exportTitle = (snapshot.title || "未命名草稿").replace(/\r?\n/g, " ").trim();
    const frontMatter = [
      "---",
      `title: "${escapeYamlString(exportTitle || "未命名草稿")}"`
    ];
    if (tags.length) {
      frontMatter.push("tags:");
      tags.forEach((tag) => {
        frontMatter.push(`  - "${escapeYamlString(tag)}"`);
      });
    } else {
      frontMatter.push("tags: []");
    }
    frontMatter.push("---", "");

    const body = snapshot.body || "";
    const content = `${frontMatter.join("\n")}${body}`;
    const filename = `${createFileSlug(exportTitle || "draft")}_${formatDate(new Date())}.md`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleImportMarkdown(event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseMarkdownFile(text);
      if (draftTitle) draftTitle.value = imported.title || "";
      if (draftTags) draftTags.value = imported.tags.length ? imported.tags.join(", ") : "";
      if (draftBody) draftBody.value = imported.body || "";
      updateWordCount();
      updatePreview();
      scheduleAutosave({ immediate: true });
    } catch (error) {
      console.error("导入 Markdown 失败：", error);
    } finally {
      if (importInput) {
        importInput.value = "";
      }
    }
  }

  function parseMarkdownFile(content) {
    const sanitized = content.replace(/^\uFEFF/, "");
    const { meta, body } = parseFrontMatter(sanitized);
    const tags = Array.isArray(meta.tags) ? meta.tags : getTagList(meta.tags || "");
    return {
      title: meta.title || "",
      tags,
      body
    };
  }

  function parseFrontMatter(text) {
    const lines = text.split(/\r?\n/);
    if (lines[0]?.trim() !== "---") {
      return { meta: {}, body: text };
    }
    const metaLines = [];
    let index = 1;
    let hasClosingFence = false;
    for (; index < lines.length; index++) {
      if (lines[index].trim() === "---") {
        index++;
        hasClosingFence = true;
        break;
      }
      metaLines.push(lines[index]);
    }
    if (!hasClosingFence) {
      return { meta: {}, body: text };
    }
    const meta = extractMeta(metaLines);
    const body = lines.slice(index).join("\n").replace(/^\n/, "");
    return { meta, body };
  }

  function extractMeta(lines) {
    const meta = {};
    const collectedTagLines = [];
    let collectingTags = false;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      if (collectingTags) {
        if (trimmed.startsWith("-")) {
          collectedTagLines.push(stripQuotes(trimmed.slice(1).trim()));
          continue;
        }
        collectingTags = false;
      }
      if (trimmed.startsWith("title:")) {
        meta.title = stripQuotes(trimmed.slice(6).trim());
      } else if (trimmed.startsWith("tags:")) {
        const value = trimmed.slice(5).trim();
        if (!value) {
          collectingTags = true;
          continue;
        } else if (value.startsWith("[") && value.endsWith("]")) {
          meta.tags = value
            .slice(1, -1)
            .split(/[,，]/)
            .map((tag) => stripQuotes(tag.trim()))
            .filter(Boolean);
        } else {
          meta.tags = value
            .split(/[,，]/)
            .map((tag) => stripQuotes(tag.trim()))
            .filter(Boolean);
        }
      }
    }
    if (collectedTagLines.length) {
      meta.tags = collectedTagLines;
    }
    return meta;
  }

  function stripQuotes(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  }

  function escapeYamlString(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function createFileSlug(value) {
    const normalized = (value || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\u4e00-\u9fa5-]+/g, "_");
    return normalized || "draft";
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function showToast(message) {
    if (!ideaToast) return;
    ideaToast.textContent = message;
    ideaToast.classList.add("active");
    clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      ideaToast.classList.remove("active");
    }, 2400);
  }

  registerServiceWorker();
});
