export function initApp({
  stores,
  chaptersRepo,
  themeService,
  audioPlayer,
  createProgressTracker,
  createReaderView,
  createTocList,
  createReaderModal,
  initShortcuts,
  router,
  strings
} = {}) {
  if (!stores) {
    throw new Error("initApp requires stores dependency");
  }
  const { ReaderSettingsStore, DraftStore, LastReadStore, CodexStore } = stores;
  if (!ReaderSettingsStore || !DraftStore) {
    throw new Error("stores missing ReaderSettingsStore or DraftStore");
  }
  if (!CodexStore) {
    throw new Error("stores missing CodexStore");
  }
  if (!chaptersRepo) {
    throw new Error("initApp requires chaptersRepo");
  }
  if (!themeService) {
    throw new Error("initApp requires themeService");
  }
  if (!audioPlayer) {
    throw new Error("initApp requires audioPlayer");
  }
  if (typeof createProgressTracker !== "function") {
    throw new Error("initApp requires createProgressTracker function");
  }
  if (typeof createReaderView !== "function") {
    throw new Error("initApp requires createReaderView function");
  }
  if (typeof createTocList !== "function") {
    throw new Error("initApp requires createTocList function");
  }
  if (typeof createReaderModal !== "function") {
    throw new Error("initApp requires createReaderModal function");
  }
  if (typeof initShortcuts !== "function") {
    throw new Error("initApp requires initShortcuts function");
  }
  if (!router || typeof router.startRouter !== "function" || typeof router.linkToChapter !== "function") {
    throw new Error("initApp requires router startRouter/linkToChapter");
  }

  const Strings = strings || {};

  const CODEX_TYPE_LABELS = {
    character: "角色",
    location: "地点",
    concept: "设定",
    timeline: "时间线",
    artifact: "器物"
  };

  document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
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
    const readerProgressBar = document.querySelector('[data-progress="reader"]');
    const readerProgressFill = readerProgressBar?.querySelector(".progress-fill");
    const readerModalElement = document.getElementById("reader-modal");
    const modalTocContainer = readerModalElement ? readerModalElement.querySelector(".modal-toc") : null;
    const modalArticle = readerModalElement ? readerModalElement.querySelector(".modal-article") : null;
    const modalCloseElements = readerModalElement ? readerModalElement.querySelectorAll('[data-action="close-modal"]') : [];
    const modalProgressBar = document.querySelector('[data-progress="modal"]');
    const modalProgressFill = modalProgressBar?.querySelector(".progress-fill");
    const modalContent = readerModalElement ? readerModalElement.querySelector(".modal-content") : null;
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
    const playMusicButtonLabel = playMusicButton?.querySelector(".btn-label");
    const volumeSlider = document.getElementById("music-volume");
    const volumeValue = document.getElementById("volume-value");
    const codexSidebar = document.getElementById("codexSidebar");
    const codexSidebarList = document.getElementById("codexSidebarList");
    const codexEntryCount = document.getElementById("codexEntryCount");
    const codexToggleButton = document.getElementById("codexToggleButton");
    const codexForm = document.getElementById("codexForm");
    const codexTypeField = document.getElementById("codexType");
    const codexNameField = document.getElementById("codexName");
    const codexSummaryField = document.getElementById("codexSummary");
    const codexTagsField = document.getElementById("codexTags");
    const codexTermsField = document.getElementById("codexTerms");
    const codexChaptersField = document.getElementById("codexChapters");
    const codexDetailsField = document.getElementById("codexDetails");
    const codexTimelineField = document.getElementById("codexTimeline");
    const codexFormHint = document.getElementById("codexFormHint");

    if (musicSelect) {
      enhanceMusicSelect(musicSelect);
    }

    let toastTimeout;
    let currentChapterIndex = 0;
    let readerProgressTracker;
    let modalProgressTracker;
    let autosaveTimer = null;
    let lastSavedSnapshot = "";
    const AUTOSAVE_DELAY = 1000;
    let chaptersReady = false;
    let pendingRoute = null;
    let lastRoute = null;
    let readerModalController = null;
    let chapters = [];
    let preparedNextSlug = null;
    let preparedPrevSlug = null;
    let codexEntries = [];
    let codexStoreUnsubscribe = null;

    const readerSettings = loadReaderSettings();
    applyReaderSettings();

    themeService.init({ body, toggleButton: themeToggleBtn });
    themeService.applyStoredShellMode();
    themeService.syncReaderTheme({
      readerSettings,
      applyReaderSettings,
      persistReaderSettings,
      syncModalTheme,
      respectOverride: false
    });

    readerProgressTracker = createProgressTracker({
      container: readerContent,
      progressBar: readerProgressBar,
      progressFill: readerProgressFill,
      context: "reader",
      onProgress: handleReaderProgress
    });

    modalProgressTracker = createProgressTracker({
      container: modalArticle,
      progressBar: modalProgressBar,
      progressFill: modalProgressFill,
      context: "modal"
    });

    const readerView = createReaderView({
      readerContainer: readerContent,
      modalContainer: modalArticle,
      readerTracker: readerProgressTracker,
      modalTracker: modalProgressTracker
    });

    readerModalController = readerModalElement
      ? createReaderModal({
          modalElement: readerModalElement,
          modalContent,
          openButton: openReaderBtn,
          closeElements: modalCloseElements,
          progressTracker: modalProgressTracker,
          syncTheme: syncModalTheme
        })
      : null;

    const tocListController = createTocList({
      tocContainer: tocList,
      modalContainer: modalTocContainer,
      onChapterSelect: (index) => selectChapter(index)
    });

    const shortcutsController = initShortcuts({
      onEscape: () => {
        if (readerModalController?.isOpen()) {
          readerModalController.close();
          return true;
        }
        return false;
      },
      onLeft: () => {
        if (!chaptersReady || !chapters.length) {
          return false;
        }
        if (currentChapterIndex > 0) {
          selectChapter(currentChapterIndex - 1);
          return true;
        }
        return false;
      },
      onRight: () => {
        if (!chaptersReady || !chapters.length) {
          return false;
        }
        if (currentChapterIndex < chapters.length - 1) {
          selectChapter(currentChapterIndex + 1);
          return true;
        }
        return false;
      },
      onScrollDown: () => {
        scrollActiveContainer("down");
        return true;
      },
      onScrollUp: () => {
        scrollActiveContainer("up");
        return true;
      }
    });

    router.startRouter({
      onRoute: (route) => {
        lastRoute = route;
        if (!route) {
          pendingRoute = null;
          return;
        }
        if (!chaptersReady) {
          pendingRoute = route;
          return;
        }
        applyRoute(route);
      }
    });

    loadDraftFromStorage();
    updateWordCount();
    updatePreview();
    initChapters();
    initCodexSidebar();

    themeToggleBtn?.addEventListener("click", () => {
      themeService.toggleShellMode();
      themeService.syncReaderTheme({
        readerSettings,
        applyReaderSettings,
        persistReaderSettings,
        syncModalTheme
      });
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        readerView.clearCache?.();
        preparedNextSlug = null;
        preparedPrevSlug = null;
      }
    });

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
        themeService.handleReaderThemeSelection(selectedTheme, {
          readerSettings,
          applyReaderSettings,
          persistReaderSettings,
          syncModalTheme
        });
      });
    });

    function updateReaderLayoutLabel() {
      if (!readerLayoutBtn) return;
      const labels = Strings?.buttons?.toggleWide || {};
      const expandedLabel = labels.expanded || "切换常规";
      const collapsedLabel = labels.collapsed || "切换宽屏";
      readerLayoutBtn.textContent = readerLayoutBtn.classList.contains("active")
        ? expandedLabel
        : collapsedLabel;
    }

    readerLayoutBtn?.addEventListener("click", () => {
      readerGrid?.classList.toggle("expanded");
      readerLayoutBtn.classList.toggle("active");
      updateReaderLayoutLabel();
      readerProgressTracker?.refresh({ fromStorage: true });
    });
    updateReaderLayoutLabel();

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
      showToast(Strings?.toasts?.ideaCaptured || "灵感已捕捉，稍后可在“章节笔记”查看。");
    });

    // Music player functionality
    function updateMusicButtonUI() {
      if (!playMusicButton || !playMusicButtonLabel) return;

      const isPlaying = audioPlayer.getIsPlaying();
      const currentTrack = audioPlayer.getCurrentTrack();
      const selectedTrack = musicSelect?.value;

      if (isPlaying && currentTrack === selectedTrack) {
        playMusicButtonLabel.textContent = "暂停播放";
        playMusicButton.classList.add("playing");
      } else {
        playMusicButtonLabel.textContent = "播放预设";
        playMusicButton.classList.remove("playing");
      }
    }

    // Initialize button state
    if (playMusicButton && audioPlayer) {
      updateMusicButtonUI();

      // Listen to audio player events
      audioPlayer.addEventListener('play', updateMusicButtonUI);
      audioPlayer.addEventListener('pause', updateMusicButtonUI);
    }

    playMusicButton?.addEventListener("click", async () => {
      const selectedTrack = musicSelect?.value || "ambient";
      const mood = musicSelect?.options[musicSelect.selectedIndex]?.text || "氛围配乐";

      try {
        const isPlaying = await audioPlayer.toggle(selectedTrack);

        if (isPlaying) {
          const musicMessage = `正在播放「${mood}」`;
          showToast(musicMessage);
        } else {
          showToast("音乐已暂停");
        }

        updateMusicButtonUI();
      } catch (err) {
        console.warn('Music playback failed:', err);
        showToast("音乐加载失败，请稍后再试");
        updateMusicButtonUI();
      }
    });

    // Update button when music selection changes
    musicSelect?.addEventListener("change", () => {
      updateMusicButtonUI();
    });

    // Volume control functionality
    if (volumeSlider && audioPlayer) {
      // Initialize volume from saved state
      const currentVolume = audioPlayer.getVolume();
      volumeSlider.value = Math.round(currentVolume * 100);
      if (volumeValue) {
        volumeValue.textContent = `${Math.round(currentVolume * 100)}%`;
      }

      // Handle volume changes
      volumeSlider.addEventListener("input", (e) => {
        const volume = parseInt(e.target.value, 10);
        audioPlayer.setVolume(volume / 100);
        if (volumeValue) {
          volumeValue.textContent = `${volume}%`;
        }
      });
    }

    function initCodexSidebar() {
      if (!codexSidebarList || !CodexStore) {
        return;
      }

      codexEntries = CodexStore.loadAll() || [];
      renderCodexSidebar(codexEntries);

      codexStoreUnsubscribe = CodexStore.subscribe(() => {
        codexEntries = CodexStore.loadAll() || [];
        renderCodexSidebar(codexEntries);
      });

      codexSidebarList.addEventListener("click", (event) => {
        const deleteButton = event.target.closest('[data-action="delete-codex-entry"]');
        if (!deleteButton) return;
        const item = deleteButton.closest("[data-codex-id]");
        const entryId = item?.dataset.codexId;
        if (!entryId) return;
        event.preventDefault();
        const removed = CodexStore.remove(entryId);
        if (removed) {
          showToast((Strings?.codex?.removed) || "条目已删除。阅读端将同步更新。");
        } else {
          showToast("删除失败，请稍后再试。");
        }
      });

      codexForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        handleCodexFormSubmit();
      });

      const cancelCodexButton = codexForm?.querySelector('[data-action="cancel-codex-entry"]');
      cancelCodexButton?.addEventListener("click", () => {
        closeCodexForm({ focusToggle: true });
      });

      codexToggleButton?.addEventListener("click", () => {
        toggleCodexForm();
      });

      window.addEventListener("beforeunload", () => {
        if (typeof codexStoreUnsubscribe === "function") {
          codexStoreUnsubscribe();
        }
      });
    }

    function renderCodexSidebar(entries) {
      if (!codexSidebarList) return;
      codexSidebarList.innerHTML = "";

      const total = Array.isArray(entries) ? entries.length : 0;
      if (codexEntryCount) {
        codexEntryCount.textContent = `${total} 条`;
      }

      if (!total) {
        return;
      }

      const sorted = entries
        .slice()
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      const visible = sorted.slice(0, 4);

      visible.forEach((entry) => {
        const item = document.createElement("li");
        item.className = "codex-sidebar-item";
        item.dataset.codexId = entry.id;

        const meta = document.createElement("div");
        meta.className = "codex-sidebar-item__meta";

        const nameNode = document.createElement("strong");
        nameNode.textContent = entry.name;
        meta.appendChild(nameNode);

        const typeNode = document.createElement("span");
        typeNode.className = "codex-sidebar-item__type";
        typeNode.textContent = CODEX_TYPE_LABELS[entry.type] || CODEX_TYPE_LABELS.concept;
        meta.appendChild(typeNode);

        if (entry.summary) {
          const summaryNode = document.createElement("p");
          summaryNode.className = "codex-sidebar-item__summary";
          summaryNode.textContent = entry.summary;
          summaryNode.title = entry.summary;
          meta.appendChild(summaryNode);
        }

        if (Array.isArray(entry.tags) && entry.tags.length) {
          const tagsNode = document.createElement("div");
          tagsNode.className = "codex-sidebar-tags";
          entry.tags.slice(0, 4).forEach((tag) => {
            const chip = document.createElement("span");
            chip.textContent = tag;
            tagsNode.appendChild(chip);
          });
          meta.appendChild(tagsNode);
        }

        item.appendChild(meta);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "codex-sidebar-item__delete";
        deleteButton.dataset.action = "delete-codex-entry";
        deleteButton.setAttribute("aria-label", `删除 ${entry.name}`);
        deleteButton.textContent = "×";
        item.appendChild(deleteButton);

        codexSidebarList.appendChild(item);
      });

      if (sorted.length > visible.length) {
        const moreItem = document.createElement("li");
        moreItem.className = "codex-sidebar-item codex-sidebar-item--more";
        moreItem.textContent = `还有 ${sorted.length - visible.length} 条条目，继续在写作中拓展吧。`;
        codexSidebarList.appendChild(moreItem);
      }
    }

    function toggleCodexForm() {
      if (!codexForm) return;
      const isHidden = codexForm.hasAttribute("hidden");
      if (isHidden) {
        openCodexForm();
      } else {
        closeCodexForm({ focusToggle: false });
      }
    }

    function openCodexForm() {
      if (!codexForm) return;
      codexForm.removeAttribute("hidden");
      if (codexToggleButton) {
        codexToggleButton.textContent = "收起表单";
      }
      showCodexHint("");
      codexNameField?.focus();
    }

    function closeCodexForm({ focusToggle = false } = {}) {
      if (!codexForm) return;
      codexForm.reset();
      codexForm.setAttribute("hidden", "");
      showCodexHint("");
      if (codexToggleButton) {
        codexToggleButton.textContent = "新增条目";
      }
      if (focusToggle) {
        codexToggleButton?.focus();
      }
    }

    function handleCodexFormSubmit() {
      const name = (codexNameField?.value || "").trim();
      if (!name) {
        showCodexHint("请填写条目名称。", "error");
        codexNameField?.focus();
        return;
      }

      const type = (codexTypeField?.value || "concept").trim() || "concept";
      const summary = (codexSummaryField?.value || "").trim();
      const tags = parseCommaSeparated(codexTagsField?.value);
      const terms = parseCommaSeparated(codexTermsField?.value);
      const chapters = parseCommaSeparated(codexChaptersField?.value);
      const details = parseKeyValueLines(codexDetailsField?.value);
      const timeline = parseKeyValueLines(codexTimelineField?.value);

      if (!terms.length) {
        terms.push(name);
      }

      const entry = {
        id: generateCodexId(type, name),
        type,
        name,
        summary,
        tags,
        terms,
        chapters,
        details,
        timeline
      };

      const saved = CodexStore.add(entry);
      if (!saved) {
        showCodexHint("保存失败，请稍后再试。", "error");
        return;
      }

      showToast((Strings?.codex?.saved) || "条目已保存，可在阅读端查看。");
      closeCodexForm({ focusToggle: true });
    }

    function parseCommaSeparated(value = "") {
      return String(value)
        .split(/[，,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    function parseKeyValueLines(value = "") {
      return String(value)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separatorMatch = line.match(/[:：]/);
          if (!separatorMatch) {
            return { label: "", value: line };
          }
          const separatorIndex = separatorMatch.index ?? line.indexOf(separatorMatch[0]);
          const label = line.slice(0, separatorIndex).trim();
          const content = line.slice(separatorIndex + 1).trim();
          return { label, value: content };
        })
        .filter((item) => item.label || item.value);
    }

    function slugify(value) {
      return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    function generateCodexId(type, name) {
      const base = slugify(name);
      if (base) {
        return `user-${type}-${base}`;
      }
      return `user-${type}-${Date.now()}`;
    }

    function showCodexHint(message, tone = "info") {
      if (!codexFormHint) return;
      codexFormHint.textContent = message;
      codexFormHint.classList.remove("is-error", "is-success");
      if (!message) {
        return;
      }
      if (tone === "error") {
        codexFormHint.classList.add("is-error");
      } else if (tone === "success") {
        codexFormHint.classList.add("is-success");
      }
    }

    function enhanceMusicSelect(nativeSelect) {
      const container = nativeSelect.closest("[data-music-select]");
      if (!container) {
        return null;
      }

      const trigger = container.querySelector(".music-select__trigger");
      const valueNode = container.querySelector(".music-select__value");
      const menu = container.querySelector(".music-select__menu");
      if (!trigger || !valueNode || !menu) {
        return null;
      }

      nativeSelect.setAttribute("aria-hidden", "true");
      nativeSelect.tabIndex = -1;
      menu.tabIndex = -1;

      let optionNodes = [];
      let isOpen = false;
      let activeIndex = Math.max(nativeSelect.selectedIndex, 0);
      const idPrefix = `music-option-${Math.random().toString(36).slice(2, 8)}-`;

      renderOptions();

      trigger.addEventListener("click", () => {
        if (isOpen) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      trigger.addEventListener("keydown", (event) => {
        switch (event.key) {
          case "ArrowDown":
          case "Down":
            event.preventDefault();
            if (!isOpen) {
              openMenu();
            }
            setActive(Math.min(activeIndex + 1, optionNodes.length - 1));
            break;
          case "ArrowUp":
          case "Up":
            event.preventDefault();
            if (!isOpen) {
              openMenu();
            }
            setActive(Math.max(activeIndex - 1, 0));
            break;
          case "Enter":
          case " ":
            event.preventDefault();
            if (isOpen) {
              commitSelection(activeIndex);
            } else {
              openMenu();
            }
            break;
          case "Escape":
            if (isOpen) {
              event.preventDefault();
              closeMenu();
            }
            break;
          default:
            break;
        }
      });

      menu.addEventListener("keydown", (event) => {
        switch (event.key) {
          case "ArrowDown":
          case "Down":
            event.preventDefault();
            setActive(Math.min(activeIndex + 1, optionNodes.length - 1));
            break;
          case "ArrowUp":
          case "Up":
            event.preventDefault();
            setActive(Math.max(activeIndex - 1, 0));
            break;
          case "Home":
            event.preventDefault();
            setActive(0);
            break;
          case "End":
            event.preventDefault();
            setActive(optionNodes.length - 1);
            break;
          case "Enter":
          case " ":
            event.preventDefault();
            commitSelection(activeIndex);
            break;
          case "Escape":
            event.preventDefault();
            closeMenu({ focusTrigger: true });
            break;
          default:
            break;
        }
      });

      nativeSelect.addEventListener("change", () => {
        const selectedIdx = nativeSelect.selectedIndex;
        updateSelectedState(selectedIdx);
        setActive(selectedIdx, { scroll: false });
        valueNode.textContent = nativeSelect.options[selectedIdx]?.text || "";
      });

      function renderOptions() {
        menu.innerHTML = "";
        optionNodes = [];
        const selectOptions = Array.from(nativeSelect.options || []);
        if (!selectOptions.length) {
          valueNode.textContent = "";
          return;
        }
        selectOptions.forEach((option, index) => {
          const item = document.createElement("li");
          item.className = "music-select__option";
          item.id = `${idPrefix}${index}`;
          item.setAttribute("role", "option");
          item.tabIndex = -1;
          item.dataset.value = option.value;
          item.textContent = option.textContent;
          item.setAttribute("aria-selected", option.selected ? "true" : "false");
          if (option.selected) {
            activeIndex = index;
            item.classList.add("is-selected", "is-active");
            menu.setAttribute("aria-activedescendant", item.id);
            valueNode.textContent = option.textContent;
          }
          item.addEventListener("click", () => commitSelection(index));
          item.addEventListener("mouseenter", () => setActive(index, { scroll: false }));
          menu.appendChild(item);
          optionNodes.push(item);
        });

        if (activeIndex < 0 && optionNodes.length) {
          activeIndex = 0;
          optionNodes[0].classList.add("is-active");
          valueNode.textContent = selectOptions[0].textContent;
        }
        updateSelectedState(nativeSelect.selectedIndex);
      }

      function openMenu() {
        if (isOpen || !optionNodes.length) {
          return;
        }
        isOpen = true;
        container.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        menu.hidden = false;
        setActive(nativeSelect.selectedIndex >= 0 ? nativeSelect.selectedIndex : 0);
        document.addEventListener("pointerdown", handleDocumentPointer, true);
        document.addEventListener("focusin", handleFocusIn, true);
        document.addEventListener("keydown", handleGlobalKeydown, true);
        requestAnimationFrame(() => {
          menu.focus({ preventScroll: true });
        });
      }

      function closeMenu({ focusTrigger = false } = {}) {
        if (!isOpen) {
          return;
        }
        isOpen = false;
        container.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        menu.hidden = true;
        document.removeEventListener("pointerdown", handleDocumentPointer, true);
        document.removeEventListener("focusin", handleFocusIn, true);
        document.removeEventListener("keydown", handleGlobalKeydown, true);
        if (focusTrigger) {
          trigger.focus({ preventScroll: true });
        }
      }

      function setActive(index, { scroll = true } = {}) {
        if (!optionNodes.length) {
          return;
        }
        const safeIndex = Math.max(0, Math.min(index, optionNodes.length - 1));
        optionNodes.forEach((node, nodeIndex) => {
          node.classList.toggle("is-active", nodeIndex === safeIndex);
        });
        activeIndex = safeIndex;
        const activeNode = optionNodes[safeIndex];
        if (activeNode) {
          menu.setAttribute("aria-activedescendant", activeNode.id);
          if (scroll) {
            activeNode.scrollIntoView({ block: "nearest" });
          }
        }
      }

      function commitSelection(index) {
        if (!optionNodes.length) {
          return;
        }
        const safeIndex = Math.max(0, Math.min(index, optionNodes.length - 1));
        if (nativeSelect.selectedIndex !== safeIndex) {
          nativeSelect.selectedIndex = safeIndex;
          nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          updateSelectedState(safeIndex);
        }
        activeIndex = safeIndex;
        valueNode.textContent = nativeSelect.options[safeIndex]?.text || "";
        closeMenu({ focusTrigger: true });
      }

      function updateSelectedState(selectedIndex) {
        if (!optionNodes.length) {
          activeIndex = -1;
          return;
        }
        optionNodes.forEach((node, nodeIndex) => {
          const isSelected = nodeIndex === selectedIndex;
          node.classList.toggle("is-selected", isSelected);
          node.setAttribute("aria-selected", isSelected ? "true" : "false");
        });
        activeIndex = Math.max(0, Math.min(selectedIndex, optionNodes.length - 1));
      }

      function handleDocumentPointer(event) {
        if (!container.contains(event.target)) {
          closeMenu();
        }
      }

      function handleFocusIn(event) {
        if (!container.contains(event.target)) {
          closeMenu();
        }
      }

      function handleGlobalKeydown(event) {
        if (event.key === "Escape" && isOpen) {
          event.preventDefault();
          closeMenu({ focusTrigger: true });
        }
      }

      return {
        close: closeMenu,
        refresh: () => {
          renderOptions();
          updateSelectedState(nativeSelect.selectedIndex);
        }
      };
    }

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

    async function initChapters() {
      await chaptersRepo.load();
      chapters = chaptersRepo.list();

      tocListController.render();
      readerModalController?.refreshFocusTrap();
      if (!chapters.length) {
        console.warn("未找到任何章节数据。");
        return;
      }

      currentChapterIndex = Math.min(currentChapterIndex, chapters.length - 1);
      selectChapter(currentChapterIndex, { updateHash: false });
      chaptersReady = true;
      let routeHandled = false;
      if (pendingRoute) {
        routeHandled = applyRoute(pendingRoute);
        pendingRoute = null;
      } else if (lastRoute) {
        routeHandled = applyRoute(lastRoute);
      }
      if (!routeHandled) {
        const initialSlug = chaptersRepo.getSlugByIndex(currentChapterIndex);
        if (!window.location.hash || window.location.hash.startsWith("#novel/")) {
          router.linkToChapter(initialSlug, { mode: "hash" });
          lastRoute = {
            type: "novel",
            slug: initialSlug,
            encodedSlug: encodeURIComponent(initialSlug),
            initial: false
          };
        }
      }
    }

    function loadReaderSettings() {
      const stored = ReaderSettingsStore.load();
      if (stored && typeof stored === "object") {
        return {
          fontSize: Number(stored.fontSize) || 18,
          lineHeight: Number(stored.lineHeight) || 1.6,
          theme: stored.theme || "day"
        };
      }
      return { fontSize: 18, lineHeight: 1.6, theme: "day" };
    }

    function persistReaderSettings() {
      ReaderSettingsStore.save(readerSettings);
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

    function syncModalTheme() {
      if (modalArticle) {
        modalArticle.dataset.theme = readerSettings.theme;
      }
    }

    function selectChapter(index, options = {}) {
      const { updateHash = true } = options;
      if (!chapters.length) {
        chapters = chaptersRepo.list();
      }
      if (!chapters.length) {
        return;
      }
      const safeIndex = Math.max(0, Math.min(index, chapters.length - 1));
      const chapter = readerView.render(safeIndex);
      if (!chapter) return;
      currentChapterIndex = safeIndex;
      tocListController.setActive(safeIndex);
      readerModalController?.refreshFocusTrap();
      syncModalTheme();
      if (LastReadStore && typeof LastReadStore.set === "function") {
        LastReadStore.set({ slug: chapter.slug });
      }
      preparedNextSlug = null;
      preparedPrevSlug = null;
      prepareAdjacentChapters(safeIndex);
      if (updateHash) {
        router.linkToChapter(chapter.slug, { mode: "hash" });
        lastRoute = {
          type: "novel",
          slug: chapter.slug,
          encodedSlug: encodeURIComponent(chapter.slug),
          initial: false
        };
      }
    }

    function applyRoute(route) {
      if (!route) {
        return false;
      }
      const behavior = route.initial ? "auto" : "smooth";
      switch (route.type) {
        case "reader":
          scrollToSection("reader", behavior);
          return true;
        case "writer":
          scrollToSection("writer", behavior);
          return true;
        case "novel": {
          if (!chapters.length) {
            chapters = chaptersRepo.list();
          }
          const slug = route.slug;
          const fallbackSlug = route.encodedSlug || slug;
          const index = (() => {
            const fromSlug = chaptersRepo.getIndexBySlug(slug);
            if (typeof fromSlug === "number" && fromSlug >= 0) {
              return fromSlug;
            }
            const fromFallback = chaptersRepo.getIndexBySlug(fallbackSlug);
            if (typeof fromFallback === "number" && fromFallback >= 0) {
              return fromFallback;
            }
            return -1;
          })();
          if (index >= 0 && index < chapters.length) {
            selectChapter(index, { updateHash: false });
            scrollToSection("reader", behavior);
            const resolvedChapter = chapters[index];
            if (resolvedChapter) {
              lastRoute = {
                type: "novel",
                slug: resolvedChapter.slug,
                encodedSlug: encodeURIComponent(resolvedChapter.slug),
                initial: Boolean(route.initial)
              };
            }
            return true;
          }
          return false;
        }
        default:
          return false;
      }
    }

    function handleReaderProgress(progress, detail) {
      if (!detail || detail.context !== "reader" || typeof progress !== "number") {
        return;
      }
      const currentChapter = chapters[currentChapterIndex];
      if (!currentChapter || detail.slug !== currentChapter.slug) {
        return;
      }
      if (progress >= 0.7) {
        prepareChapter(currentChapterIndex + 1, "next");
      } else if (progress <= 0.3) {
        prepareChapter(currentChapterIndex - 1, "prev");
      }
    }

    function prepareAdjacentChapters(index) {
      prepareChapter(index + 1, "next");
      prepareChapter(index - 1, "prev");
    }

    function prepareChapter(index, direction) {
      if (!Number.isFinite(index) || index < 0 || index >= chapters.length) {
        return;
      }
      const chapter = chapters[index] || chaptersRepo.getByIndex(index);
      if (!chapter || !chapter.slug) {
        return;
      }
      const slug = chapter.slug;
      if (direction === "next" && slug === preparedNextSlug) {
        return;
      }
      if (direction === "prev" && slug === preparedPrevSlug) {
        return;
      }

      if (direction === "next") {
        preparedNextSlug = slug;
      } else {
        preparedPrevSlug = slug;
      }

      runWhenIdle(() => {
        const prepared = readerView.prepare(index);
        if (!prepared) {
          if (direction === "next" && preparedNextSlug === slug) {
            preparedNextSlug = null;
          }
          if (direction === "prev" && preparedPrevSlug === slug) {
            preparedPrevSlug = null;
          }
        }
      });
    }

    function runWhenIdle(callback) {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(callback, { timeout: 120 });
      } else {
        window.setTimeout(callback, 0);
      }
    }

    function scrollToSection(id, behavior = "smooth") {
      const section = document.getElementById(id);
      if (!section) return;
      section.scrollIntoView({ behavior, block: "start" });
    }

    function scrollActiveContainer(direction) {
      const container = readerModalController?.isOpen() && modalArticle ? modalArticle : readerContent;
      if (!container) return;
      const amount = Math.max(container.clientHeight * 0.9, 200);
      const offset = direction === "down" ? amount : -amount;
      container.scrollBy({ top: offset, behavior: "smooth" });
    }

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
        const success = DraftStore.save(snapshot);
        if (success === false) {
          throw new Error("DraftStore.save returned false");
        }
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
      const draft = DraftStore.load();
      if (!draft || typeof draft !== "object") {
        return null;
      }
      return {
        title: typeof draft.title === "string" ? draft.title : "",
        tags: Array.isArray(draft.tags) ? draft.tags.join(", ") : typeof draft.tags === "string" ? draft.tags : "",
        body: typeof draft.body === "string" ? draft.body : ""
      };
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
        `title: "${escapeYamlString(exportTitle || "未命名草稿" )}"`
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

    function registerServiceWorker() {
      if (!("serviceWorker" in navigator)) {
        return;
      }
      navigator.serviceWorker
        .register("/service-worker.js")
        .catch((error) => {
          console.warn("Service worker registration failed:", error);
        });
    }

    registerServiceWorker();
  });
}

export default {
  initApp
};
