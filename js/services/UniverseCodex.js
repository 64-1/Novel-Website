import { CodexStore } from "./Stores.js";

const TYPE_LABELS = {
  character: "角色",
  location: "地点",
  concept: "设定",
  timeline: "时间线",
  artifact: "器物"
};

const FALLBACK_ENTRIES = [
  {
    id: "character-lichuan",
    type: "character",
    name: "黎川",
    summary: "浮城的记忆架构师，负责重构晨光谱系，并在记忆回廊开启前承担核心决策。",
    tags: ["核心角色", "晨光谱系"],
    chapters: ["lightfall-ode", "tide-echoes", "nocturne-resonance"],
    terms: ["黎川"],
    details: [
      { label: "身份", value: "浮城记忆架构师" },
      { label: "内在驱动力", value: "对“真实”的执念与守护承诺" }
    ],
    timeline: [
      { label: "晨光谱系数据回传", value: "第十二章中确认记忆回廊将在 30 分钟后开启。" },
      { label: "废弃实验室影像", value: "第十三章中与夏茗面对兄长留下的记录。" }
    ]
  },
  {
    id: "character-xiami",
    type: "character",
    name: "夏茗",
    summary: "浮城的感应分析师，同时也是黎川的同伴，深藏对记忆的恐惧与兄长失踪之谜。",
    tags: ["核心角色", "情感线"],
    chapters: ["lightfall-ode", "tide-echoes"],
    terms: ["夏茗"],
    details: [
      { label: "身份", value: "浮城感应分析师" },
      { label: "羁绊", value: "与黎川互为支点，守护浮城的真相" }
    ],
    timeline: [
      { label: "记忆回廊倒计时", value: "赶在黎川决策前抵达观星台，提醒计划提前。" },
      { label: "外海实验室", value: "第十三章中寻回兄长留下的真相记录。" }
    ]
  },
  {
    id: "location-floating-city",
    type: "location",
    name: "浮城",
    summary: "悬浮于云海之上的多层都市，由记忆回廊维系心智与秩序，被晨光谱系照亮。",
    tags: ["地点", "主舞台"],
    chapters: ["lightfall-ode", "tide-echoes", "nocturne-resonance"],
    terms: ["浮城", "漂浮群岛"],
    details: [
      { label: "构造", value: "中央塔楼、观星台与环状居住带组成多层空间。" },
      { label: "关键机制", value: "记忆回廊同步市民心智，防止集体记忆断裂。" }
    ],
    timeline: [
      { label: "晨光谱系", value: "定期调用光谱以维持城体结构稳定。" },
      { label: "记忆回廊开启", value: "第十四章前夜，市民以光带共振支持仪式。" }
    ]
  },
  {
    id: "concept-memory-arcade",
    type: "concept",
    name: "记忆回廊",
    summary: "浮城通过量化记忆片段所搭建的共鸣系统，可让过去与未来瞬间交叠。",
    tags: ["设定", "关键装置"],
    chapters: ["lightfall-ode", "nocturne-resonance"],
    terms: ["记忆回廊"],
    details: [
      { label: "作用", value: "整合个人记忆，生成共享的城市走向模拟。" },
      { label: "风险", value: "若未准备充分，真实冲击可能使市民无法承受。" }
    ],
    timeline: [
      { label: "数据回传完成", value: "第十二章宣布准备启动流程。" },
      { label: "正式启动", value: "第十四章的午夜仪式开启新一轮共鸣。" }
    ]
  }
];

const DEFAULT_OPTIONS = {
  url: "/data/universe.json",
  fallback: FALLBACK_ENTRIES
};

let baseEntries = [];
let loaded = false;
let loadPromise = null;
let mergedCache = null;
const subscribers = [];

function normalizeEntry(entry, origin = "base") {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : null;
  const type = typeof entry.type === "string" && entry.type.trim() ? entry.type.trim() : "concept";
  const name = typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : null;
  if (!id || !name) {
    return null;
  }

  const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
  const tags = Array.isArray(entry.tags)
    ? entry.tags.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)
    : [];
  const terms = Array.isArray(entry.terms)
    ? entry.terms.map((term) => (typeof term === "string" ? term.trim() : "")).filter(Boolean)
    : [];
  const chapters = Array.isArray(entry.chapters)
    ? entry.chapters.map((chap) => (typeof chap === "string" ? chap.trim() : "")).filter(Boolean)
    : [];
  const details = Array.isArray(entry.details)
    ? entry.details
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const label = typeof item.label === "string" ? item.label.trim() : "";
          const value = typeof item.value === "string" ? item.value.trim() : "";
          if (!label && !value) return null;
          return { label, value };
        })
        .filter(Boolean)
    : [];
  const timeline = Array.isArray(entry.timeline)
    ? entry.timeline
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const label = typeof item.label === "string" ? item.label.trim() : "";
          const value = typeof item.value === "string" ? item.value.trim() : "";
          if (!label && !value) return null;
          return { label, value };
        })
        .filter(Boolean)
    : [];

  return {
    id,
    type,
    name,
    summary,
    tags,
    terms,
    chapters,
    details,
    timeline,
    origin
  };
}

function ingest(entries, origin = "base") {
  if (!Array.isArray(entries)) {
    baseEntries = [];
    return baseEntries;
  }
  baseEntries = entries.map((entry) => normalizeEntry(entry, origin)).filter(Boolean);
  loaded = true;
  mergedCache = null;
  notify();
  return baseEntries;
}

function getMergedEntries() {
  if (mergedCache) {
    return mergedCache.slice();
  }
  const combined = new Map();
  baseEntries.forEach((entry) => {
    combined.set(entry.id, { ...entry });
  });
  const customEntries = CodexStore.loadAll().map((entry) => ({ ...entry, origin: "user" }));
  customEntries.forEach((entry) => {
    combined.set(entry.id, entry);
  });
  mergedCache = Array.from(combined.values());
  return mergedCache.slice();
}

function notify() {
  subscribers.forEach((fn) => {
    try {
      fn(getMergedEntries());
    } catch (error) {
      console.warn("[UniverseCodex] Subscriber error:", error);
    }
  });
}

CodexStore.subscribe(() => {
  mergedCache = null;
  notify();
});

async function load(options = {}) {
  if (loaded) {
    return baseEntries;
  }
  if (loadPromise) {
    return loadPromise;
  }
  const { url, fallback } = { ...DEFAULT_OPTIONS, ...options };
  loadPromise = fetch(url, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch universe codex (${response.status})`);
      }
      return response.json();
    })
    .then((data) => ingest(data, "base"))
    .catch((error) => {
      console.warn("[UniverseCodex] Falling back to embedded codex data.", error);
      return ingest(Array.isArray(fallback) ? fallback : FALLBACK_ENTRIES, "base");
    })
    .finally(() => {
      loadPromise = null;
    });
  return loadPromise;
}

function list() {
  return getMergedEntries();
}

function getEntryById(id) {
  if (!id) return null;
  return getMergedEntries().find((entry) => entry.id === id) || null;
}

function getEntriesForSlug(slug) {
  if (!slug) {
    return [];
  }
  const key = String(slug).trim();
  if (!key) return [];
  return getMergedEntries().filter((entry) => {
    if (!entry.chapters || !entry.chapters.length) {
      return true;
    }
    return entry.chapters.includes(key);
  });
}

function getEntriesByType(entries = list()) {
  const groups = new Map();
  entries.forEach((entry) => {
    const type = entry.type || "concept";
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type).push(entry);
  });
  return groups;
}

function getTermIndex(entries = list()) {
  const map = new Map();
  entries.forEach((entry) => {
    if (!Array.isArray(entry.terms)) return;
    entry.terms.forEach((term) => {
      if (!term) return;
      const key = term.trim();
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, new Set());
      }
      map.get(key).add(entry.id);
    });
  });
  return map;
}

function getTypeLabel(type) {
  return TYPE_LABELS[type] || TYPE_LABELS.concept;
}

function subscribe(fn) {
  if (typeof fn !== "function") {
    return () => {};
  }
  subscribers.push(fn);
  return () => {
    const index = subscribers.indexOf(fn);
    if (index >= 0) {
      subscribers.splice(index, 1);
    }
  };
}

export default {
  load,
  list,
  getEntryById,
  getEntriesForSlug,
  getEntriesByType,
  getTermIndex,
  getTypeLabel,
  subscribe
};
