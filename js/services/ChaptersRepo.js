const FALLBACK_CHAPTERS = [
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

const DEFAULT_OPTIONS = {
  url: "/chapters.json",
  fallback: FALLBACK_CHAPTERS
};

let chapters = [];
let slugToIndex = new Map();
let loaded = false;
let loadPromise = null;

function normalizeChapter(raw, index) {
  if (!raw || typeof raw !== "object") return null;

  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `chapter-${index + 1}`;
  const slugSource = typeof raw.slug === "string" && raw.slug.trim() ? raw.slug.trim() : id;
  const slug = slugSource.replace(/\s+/g, "-");
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : `章节 ${index + 1}`;
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";

  const paragraphs = Array.isArray(raw.paragraphs)
    ? raw.paragraphs.map((entry) => normalizeParagraph(entry)).filter((entry) => entry !== null)
    : [];

  const readingStats = computeReadingStats(paragraphs);

  return {
    id,
    slug,
    title,
    summary,
    paragraphs,
    wordCount: readingStats.words,
    readingMinutes: readingStats.minutes
  };
}

function normalizeParagraph(entry) {
  if (typeof entry === "string") {
    return entry;
  }
  if (entry && typeof entry === "object") {
    if (entry.type === "blockquote") {
      const text = typeof entry.text === "string" ? entry.text : "";
      if (!text) {
        return null;
      }
      return { type: "blockquote", text };
    }
    if (typeof entry.text === "string") {
      return entry.text;
    }
  }
  return null;
}

function computeReadingStats(paragraphs) {
  const textPieces = [];
  paragraphs.forEach((paragraph) => {
    if (typeof paragraph === "string") {
      textPieces.push(paragraph);
    } else if (paragraph && typeof paragraph.text === "string") {
      textPieces.push(paragraph.text);
    }
  });
  const text = textPieces.join(" ");
  const words = countWordsApprox(text);
  const minutes = Math.max(1, Math.round(words / 220));
  return { words, minutes };
}

function countWordsApprox(text) {
  if (!text) return 0;
  const cjkMatches = text.match(/[\u3400-\u9FFF]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  const nonCjkText = text.replace(/[\u3400-\u9FFF]/g, " ");
  const latinTokens = nonCjkText
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return cjkCount + latinTokens.length;
}

function ingest(rawList) {
  chapters = rawList.map((chapter, index) => normalizeChapter(chapter, index)).filter(Boolean);

  slugToIndex = new Map();
  chapters.forEach((chapter, index) => {
    const slug = chapter.slug;
    slugToIndex.set(slug, index);
    slugToIndex.set(encodeURIComponent(slug), index);
  });

  loaded = true;
  return chapters;
}

export async function load(options = {}) {
  if (loaded) {
    return chapters;
  }
  if (loadPromise) {
    return loadPromise;
  }

  const { url, fallback } = { ...DEFAULT_OPTIONS, ...options };

  loadPromise = fetch(url, { cache: "no-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch chapters.json (${response.status})`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error("Chapters JSON must be an array.");
      }
      return ingest(data);
    })
    .catch((error) => {
      console.warn("[ChaptersRepo] Falling back to built-in chapters.", error);
      const safeFallback = Array.isArray(fallback) ? fallback : FALLBACK_CHAPTERS;
      return ingest(safeFallback);
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

export function list() {
  return chapters.slice();
}

export function getByIndex(index) {
  if (!Number.isFinite(index)) return null;
  const safeIndex = Math.max(0, Math.min(Number(index), chapters.length - 1));
  return chapters[safeIndex] || null;
}

export function getIndexBySlug(slug) {
  if (!slug) return -1;
  const key = String(slug).trim();
  if (!key) return -1;
  return slugToIndex.get(key) ?? -1;
}

export function getSlugByIndex(index) {
  const chapter = getByIndex(index);
  return chapter ? chapter.slug : null;
}

export function getStats(chapter) {
  if (!chapter) {
    return { minutes: 1, words: 0 };
  }
  const minutes =
    typeof chapter.readingMinutes === "number"
      ? Math.max(1, Math.round(chapter.readingMinutes))
      : 1;
  const words =
    typeof chapter.wordCount === "number"
      ? Math.max(0, Math.round(chapter.wordCount))
      : 0;
  return { minutes, words };
}

export function isLoaded() {
  return loaded;
}

export function getFallbackChapters() {
  return FALLBACK_CHAPTERS.slice();
}

const ChaptersRepo = {
  load,
  list,
  getByIndex,
  getIndexBySlug,
  getSlugByIndex,
  getStats,
  isLoaded,
  getFallbackChapters
};

export default ChaptersRepo;
