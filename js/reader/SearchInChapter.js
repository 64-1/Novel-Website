function collectText(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let text = "";
  let node = walker.nextNode();
  while (node) {
    const value = node.nodeValue || "";
    if (value) {
      text += value;
    }
    node = walker.nextNode();
  }
  return { text };
}

function findMatches(source, query, maxHighlights) {
  const normalizedQuery = query.toLowerCase();
  const normalizedSource = source.toLowerCase();
  const matches = [];
  let total = 0;
  if (!normalizedQuery) {
    return { matches, total, capped: false };
  }

  const step = Math.max(normalizedQuery.length, 1);
  let index = normalizedSource.indexOf(normalizedQuery);
  while (index !== -1) {
    total += 1;
    if (matches.length < maxHighlights) {
      matches.push({ start: index, end: index + normalizedQuery.length });
    }
    index = normalizedSource.indexOf(normalizedQuery, index + step);
  }
  return {
    matches,
    total,
    capped: total > maxHighlights
  };
}

function locatePosition(root, offset) {
  if (offset < 0) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node || !node.nodeValue) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node = walker.nextNode();
  let traversed = 0;
  let lastNode = null;
  let lastLength = 0;

  while (node) {
    const value = node.nodeValue || "";
    const length = value.length;
    if (offset <= traversed + length) {
      return { node, offset: offset - traversed };
    }
    traversed += length;
    lastNode = node;
    lastLength = length;
    node = walker.nextNode();
  }

  if (offset === traversed && lastNode) {
    return { node: lastNode, offset: lastLength };
  }
  return null;
}

function unwrapMarks(root) {
  const marks = root.querySelectorAll("mark.chap-hit");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

export function createSearchController({ articleEl, onNavigate, maxHighlights = 200 } = {}) {
  if (!articleEl) {
    throw new Error("createSearchController requires articleEl");
  }

  let currentIndex = -1;
  let matches = [];
  let totalMatches = 0;
  let capped = false;
  let currentQuery = "";
  let stateListener = () => {};

  function notify() {
    stateListener(getState());
  }

  function highlightMatches(matchList) {
    const created = [];
    for (let i = matchList.length - 1; i >= 0; i--) {
      const { start, end } = matchList[i];
      const startPos = locatePosition(articleEl, start);
      const endPos = locatePosition(articleEl, end);
      if (!startPos || !endPos) {
        continue;
      }
      const range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset);
      if (range.collapsed) {
        range.detach();
        continue;
      }
      const mark = document.createElement("mark");
      mark.className = "chap-hit";
      mark.tabIndex = -1;
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
      range.detach();
      created.unshift(mark);
    }
    return created;
  }

  function setQuery(query) {
    const trimmed = (query || "").trim();
    if (trimmed === currentQuery) {
      notify();
      return;
    }
    currentQuery = trimmed;
    clearHighlights();

    if (!trimmed) {
      notify();
      return;
    }

    const { text } = collectText(articleEl);
    const result = findMatches(text, trimmed, maxHighlights);
    totalMatches = result.total;
    capped = result.capped;
    if (!result.matches.length) {
      notify();
      return;
    }

    matches = highlightMatches(result.matches).map((mark, hitIndex) => {
      mark.dataset.hitIndex = String(hitIndex);
      return mark;
    });

    moveTo(0);
  }

  function moveTo(index) {
    if (!matches.length) {
      currentIndex = -1;
      notify();
      return;
    }
    const safeIndex = ((index % matches.length) + matches.length) % matches.length;
    const previous = matches[currentIndex];
    if (previous) {
      previous.classList.remove("is-current");
    }
    currentIndex = safeIndex;
    const current = matches[currentIndex];
    if (current) {
      current.classList.add("is-current");
      current.scrollIntoView({ behavior: "smooth", block: "center" });
      current.focus({ preventScroll: true });
      if (typeof onNavigate === "function") {
        onNavigate(articleEl.dataset.slug || "", currentIndex);
      }
    }
    notify();
  }

  function clear() {
    clearHighlights();
    currentQuery = "";
    notify();
  }

  function next() {
    if (!matches.length) return;
    moveTo(currentIndex + 1);
  }

  function prev() {
    if (!matches.length) return;
    moveTo(currentIndex - 1);
  }

  function getState() {
    return {
      total: totalMatches,
      highlighted: matches.length,
      index: currentIndex,
      capped,
      query: currentQuery
    };
  }

  function clearHighlights() {
    unwrapMarks(articleEl);
    matches = [];
    totalMatches = 0;
    capped = false;
    currentIndex = -1;
  }

  function onChapterChanged() {
    if (!currentQuery) {
      clearHighlights();
      notify();
      return;
    }
    const query = currentQuery;
    currentQuery = "";
    clearHighlights();
    setQuery(query);
  }

  function onStateChange(listener) {
    stateListener = typeof listener === "function" ? listener : () => {};
  }

  return {
    setQuery,
    clear,
    next,
    prev,
    getState,
    onChapterChanged,
    onStateChange
  };
}

export default {
  createSearchController
};
