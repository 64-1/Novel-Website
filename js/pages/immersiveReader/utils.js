export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
  } catch (error) {
    console.warn("复制链接失败", error);
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function populateHighlightSnippets(highlights, article, annotationList) {
  if (!Array.isArray(highlights) || !highlights.length) return;
  try {
    const { buildTextMap } = await import("../../reader/TextMap.js");
    const textMap = buildTextMap(article);
    highlights.forEach((item) => {
      const range = textMap.offsetsToRange(item.start, item.end);
      if (!range) return;
      const snippet = range.toString().trim();
      const target = annotationList?.querySelector(`[data-ann-id="${item.id}"] .annotation-snippet`);
      if (target) {
        const formatted = snippet.length > 60 ? `${snippet.slice(0, 60)}…` : snippet;
        target.textContent = formatted || "高亮片段";
      }
    });
  } catch (error) {
    console.warn("[ImmersiveReader] 生成高亮摘要失败", error);
  }
}
