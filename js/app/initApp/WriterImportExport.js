/**
 * Writer Import/Export Module
 * Handles markdown import and export functionality
 */

export function createWriterImportExport({
  exportButton,
  importButton,
  importInput,
  draftTitle,
  draftTags,
  draftBody,
  buildDraftSnapshot,
  getTagList,
  updateWordCount,
  updatePreview,
  scheduleAutosave
} = {}) {
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
      updateWordCount?.();
      updatePreview?.();
      scheduleAutosave?.({ immediate: true });
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

  function initialize() {
    exportButton?.addEventListener("click", handleExportMarkdown);
    importButton?.addEventListener("click", () => importInput?.click());
    importInput?.addEventListener("change", handleImportMarkdown);
  }

  return {
    initialize,
    handleExportMarkdown,
    handleImportMarkdown
  };
}
