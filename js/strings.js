const Strings = {
  buttons: {
    toggleWide: {
      expanded: "切换常规",
      collapsed: "切换宽屏"
    }
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
    drawer: {
      title: "书签",
      all: "全部",
      currentChapter: "本章",
      locate: "定位",
      emptyAll: "暂无书签",
      emptyCurrent: "本章暂无书签"
    }
  }
};

export default Strings;
