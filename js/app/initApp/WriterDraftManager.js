/**
 * Writer Draft Manager Module
 * Handles draft loading, autosave, word count, and preview functionality
 */

const AUTOSAVE_DELAY = 1000;

export function createWriterDraftManager({
  draftTitle,
  draftTags,
  draftBody,
  wordCountDisplay,
  previewTitle,
  previewBody,
  previewTags,
  autosaveStatus,
  DraftStore
} = {}) {
  if (!DraftStore) {
    return null;
  }

  let autosaveTimer = null;
  let lastSavedSnapshot = "";

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

  function initialize() {
    // Set up input listeners
    [draftTitle, draftTags, draftBody].forEach((input) => {
      input?.addEventListener("input", () => {
        updateWordCount();
        updatePreview();
        scheduleAutosave();
      });
    });

    // Load initial state
    loadDraftFromStorage();
    updateWordCount();
    updatePreview();
  }

  return {
    initialize,
    loadDraftFromStorage,
    updateWordCount,
    updatePreview,
    scheduleAutosave,
    buildDraftSnapshot,
    getTagList
  };
}
