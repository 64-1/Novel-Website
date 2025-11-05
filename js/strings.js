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
  }
};

export default Strings;
