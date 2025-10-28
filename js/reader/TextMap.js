/**
 * Builds a map between DOM text nodes and flattened text offsets.
 * Ignores wrapper elements like <mark> to maintain consistency
 * between search highlights and annotations.
 */

function isWrapperTag(tagName) {
  const wrapperTags = new Set(["MARK", "SPAN", "STRONG", "EM", "B", "I", "U"]);
  return wrapperTags.has(tagName);
}

function shouldIgnoreNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return true;
  if (!node.nodeValue) return false;
  const parent = node.parentElement;
  if (!parent) return false;
  const tag = parent.tagName;
  if (tag === "SCRIPT" || tag === "STYLE") return true;
  return false;
}

/**
 * Builds a text map from an article element
 * @param {HTMLElement} articleEl - The article container
 * @returns {Object} - { flatText, nodes, rangeToOffsets, offsetsToRange }
 */
export function buildTextMap(articleEl) {
  if (!articleEl) {
    throw new Error("buildTextMap requires articleEl");
  }

  const walker = document.createTreeWalker(articleEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldIgnoreNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });

  let flatText = "";
  const nodes = [];
  let node = walker.nextNode();

  while (node) {
    const value = node.nodeValue || "";
    const start = flatText.length;
    if (value) {
      flatText += value;
      nodes.push({
        node,
        start,
        end: flatText.length
      });
    }
    node = walker.nextNode();
  }

  /**
   * Converts a DOM Range to text offsets
   * @param {Range} range
   * @returns {Object|null} - { start, end } or null if invalid
   */
  function rangeToOffsets(range) {
    if (!range || !range.commonAncestorContainer) return null;

    // Find start position
    let startOffset = 0;
    const startNode = range.startContainer;
    const startPos = range.startOffset;

    if (startNode.nodeType === Node.TEXT_NODE) {
      // Find the node in our map
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].node === startNode) {
          startOffset = nodes[i].start + Math.min(startPos, startNode.nodeValue.length);
          break;
        }
      }
    } else {
      // Start container is an element - find first text node
      const startTextNode = findFirstTextNodeInRange(range, articleEl);
      if (startTextNode) {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].node === startTextNode) {
            startOffset = nodes[i].start;
            break;
          }
        }
      }
    }

    // Find end position
    let endOffset = startOffset;
    const endNode = range.endContainer;
    const endPos = range.endOffset;

    if (endNode.nodeType === Node.TEXT_NODE) {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].node === endNode) {
          endOffset = nodes[i].start + Math.min(endPos, endNode.nodeValue.length);
          break;
        }
      }
    } else {
      const endTextNode = findLastTextNodeInRange(range, articleEl);
      if (endTextNode) {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].node === endTextNode) {
            endOffset = nodes[i].end;
            break;
          }
        }
      }
    }

    if (startOffset < 0 || endOffset < 0 || startOffset >= endOffset) {
      return null;
    }

    return { start: startOffset, end: endOffset };
  }

  /**
   * Converts text offsets to a DOM Range
   * @param {number} start - Start offset
   * @param {number} end - End offset
   * @returns {Range|null} - DOM Range or null if invalid
   */
  function offsetsToRange(start, end) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0 || start >= end) {
      return null;
    }

    // Find start position
    let startNode = null;
    let startOffset = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (start >= n.start && start <= n.end) {
        startNode = n.node;
        startOffset = start - n.start;
        break;
      }
    }

    if (!startNode) {
      return null;
    }

    // Find end position
    let endNode = startNode;
    let endOffset = startOffset;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (end >= n.start && end <= n.end) {
        endNode = n.node;
        endOffset = end - n.start;
        break;
      }
    }

    if (!endNode) {
      return null;
    }

    try {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    } catch (error) {
      console.warn("[TextMap] Failed to create range:", error);
      return null;
    }
  }

  function findFirstTextNodeInRange(range, root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldIgnoreNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let node = walker.nextNode();
    while (node) {
      if (range.intersectsNode(node)) {
        return node;
      }
      node = walker.nextNode();
    }
    return null;
  }

  function findLastTextNodeInRange(range, root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldIgnoreNode(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let lastNode = null;
    let node = walker.nextNode();
    while (node) {
      if (range.intersectsNode(node)) {
        lastNode = node;
      }
      node = walker.nextNode();
    }
    return lastNode;
  }

  return {
    flatText,
    nodes,
    rangeToOffsets,
    offsetsToRange
  };
}

export default {
  buildTextMap
};

