const Strings = {
  buttons: {
    toggleWide: {
      expanded: "切换常规",
      collapsed: "切换宽屏"
    }
  },
  updates: {
    available: "有更新",
    refresh: "刷新",
    later: "稍后"
  },
  meta: {
    siteName: "星海小说",
    defaultDescription: "沉浸式阅读空间与创作工具，陪你探索原创长篇的每一次心跳。",
    shareImage: "/icons/icon-512.png"
  },
  toasts: {
    ideaCaptured: "灵感已捕捉，稍后可在「章节笔记」查看。",
    musicLoading: (mood) => `已为你准备「${mood}」氛围音轨，正式版即将上线。`
  },
  search: {
    placeholder: "搜索全书…",
    noResults: "无结果",
    chaptersMatched: (count) => `共 ${count} 章命中`
  },
  codex: {
    drawerTitle: "世界观手册",
    empty: "本章暂未收录世界观条目。",
    jump: "定位正文",
    noMention: "该条目在正文中暂未出现。",
    saved: "条目已保存，可在阅读端的世界观手册中查看。",
    removed: "条目已删除，阅读端将同步更新。",
    origin: {
      base: "官方设定",
      user: "本地草稿"
    }
  },
  annotations: {
    addBookmark: "添加书签",
    bookmarks: "书签",
    highlights: "高亮",
    highlight: "高亮",
    addNote: "备注",
    noBookmarks: "暂无书签",
    noHighlights: "暂无高亮",
    delete: "删除",
    jumpTo: "跳转到",
    addedBookmark: "书签已保存",
    addedHighlight: "高亮已添加",
    highlightFailed: "无法添加高亮",
    bookmarkFailed: "无法添加书签",
    removed: "标注已删除",
    highlightColors: {
      ylw: "琥珀高亮",
      grn: "松柏高亮",
      blu: "雾蓝高亮",
      pnk: "烟粉高亮"
    },
    drawer: {
      title: "书签",
      all: "全部",
      currentChapter: "本章",
      locate: "定位",
      emptyAll: "暂无书签",
      emptyCurrent: "本章暂无书签"
    },
    fab: {
      addBookmark: "添加书签",
      addNoteOptional: "添加备注（可选）",
      bookmarkAdded: (chapterNum, percent) => `已添加书签 · 第 ${chapterNum} 章 · ${percent}%`
    }
  },
  analytics: {
    title: "阅读统计",
    subtitle: "回顾你的节奏与进度。",
    empty: "开始阅读，我们会在这里记录你的节奏。",
    minutes: (mins) => `${mins} 分钟`,
    wordsShort: (words) => {
      const safe = Math.max(0, Math.round(words || 0));
      if (safe >= 10000) {
        const value = safe / 10000;
        return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} 万字`;
      }
      if (safe >= 1000) {
        const value = safe / 1000;
        return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} 千字`;
      }
      return `${safe} 字`;
    },
    streak: (days) => `${days} 天`,
    streakMetaActive: "今日已打卡",
    streakMetaIdle: "今日尚未打卡",
    pace: (wpm) => `${wpm} 字/分钟`,
    paceMeta: "最近 7 天",
    paceUnavailable: "--",
    remaining: (mins) => `约 ${mins} 分钟`,
    remainingUnknown: "阅读越多，预测会更准确",
    completed: "已完本",
    progressMeta: (percent) => `已完成 ${percent}%`
  },
  comments: {
    title: "章节讨论",
    empty: "目前还没有讨论，来分享你的第一条想法吧！",
    placeholder: "写下你对本章的想法或问题…",
    submit: "发布",
    submitting: "发布中…",
    hint: "最多 280 字",
    count: (current, max) => `${current}/${max}`,
    localAuthor: "我",
    added: "评论已发布",
    failed: "暂时无法发布，请稍后再试",
    validation: "评论内容不能为空哦。",
    timestamp: (date) => {
      if (!(date instanceof Date)) return "";
      const now = new Date();
      const diff = now - date;
      const minute = 60 * 1000;
      const hour = 60 * minute;
      const day = 24 * hour;
      if (diff < minute) return "刚刚";
      if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
      if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
      if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
      return date.toLocaleDateString("zh-Hans", { month: "long", day: "numeric" });
    }
  }
};

export default Strings;
