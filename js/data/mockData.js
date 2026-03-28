/**
 * Mock data for Star Sea Novel
 * Demo data for development and presentation
 */

export const MOCK_USERS = [
  {
    id: 'user_001',
    username: 'starlight_writer',
    displayName: '星河漫步',
    email: 'starlight@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=starlight&backgroundColor=b6e3f4',
    coverImage: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200&h=400&fit=crop',
    bio: '科幻与奇幻交织的叙事者，专注于构建独特的宇宙观。喜欢探索记忆、时间与人性的边界。\n代表作《晨光谱系》正在连载中。',
    tags: ['科幻', '长篇连载', '世界观构筑', '群像叙事'],
    location: '北京',
    website: 'https://starlight.example.com',
    socialLinks: {
      twitter: '@starlight_writer',
      weibo: '星河漫步'
    },
    stats: {
      works: 3,
      collections: 12847,
      following: 342,
      followers: 12856,
      totalReads: 2894000
    },
    joinedAt: '2023-03-15',
    lastActive: '2026-03-28'
  },
  {
    id: 'user_002',
    username: 'neon_ink',
    displayName: '霓虹墨客',
    email: 'neonink@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neon&backgroundColor=ffd5dc',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop',
    bio: '都市情感与悬疑的探索者。文字如霓虹般璀璨，又如墨色深沉。\n《霓虹与海》完结、《墨影录》连载中。',
    tags: ['都市', '悬疑', '群像', '情感'],
    location: '上海',
    website: '',
    socialLinks: {
      twitter: '',
      weibo: '霓虹墨客'
    },
    stats: {
      works: 2,
      collections: 8963,
      following: 128,
      followers: 5420,
      totalReads: 1567000
    },
    joinedAt: '2023-06-20',
    lastActive: '2026-03-27'
  },
  {
    id: 'user_003',
    username: 'ancient_palace',
    displayName: '古殿幽影',
    email: 'ancientpalace@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ancient&backgroundColor=d1f4d1',
    coverImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&h=400&fit=crop',
    bio: '古风武侠与仙侠的传承者。笔下江湖，快意恩仇。\n《浮城纪年》正在连载，《墨影录》古风篇筹备中。',
    tags: ['古风', '武侠', '仙侠', '破案'],
    location: '西安',
    website: '',
    socialLinks: {
      twitter: '',
      weibo: ''
    },
    stats: {
      works: 1,
      collections: 31255,
      following: 89,
      followers: 31205,
      totalReads: 4890000
    },
    joinedAt: '2022-11-08',
    lastActive: '2026-03-26'
  },
  {
    id: 'current_user',
    username: 'demo_user',
    displayName: '演示用户',
    email: 'demo@star-sea-novel.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo&backgroundColor=c0aede',
    coverImage: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1200&h=400&fit=crop',
    bio: '热爱阅读与写作的普通人，正在探索星海世界的无限可能。',
    tags: ['读者', '新手作者'],
    location: '杭州',
    website: '',
    socialLinks: {
      twitter: '',
      weibo: ''
    },
    stats: {
      works: 1,
      collections: 156,
      following: 45,
      followers: 12,
      totalReads: 45600
    },
    joinedAt: '2024-01-15',
    lastActive: '2026-03-28'
  }
];

export const MOCK_NOVELS = [
  {
    id: 'novel_001',
    slug: 'dawn-spectrum',
    title: '晨光谱系',
    author: MOCK_USERS[0],
    coverImage: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=600&fit=crop',
    synopsis: '在重构记忆的时代，一群探索星海的人们寻找真实的自我。当科技可以篡改过去，他们如何在真相与安宁之间抉择？',
    tags: ['科幻', '群像', '慢热', '赛博朋克'],
    category: 'soft-sci-fi',
    status: 'ongoing',
    wordCount: 210300,
    chapterCount: 45,
    views: 156000,
    bookmarks: 96013,
    likes: 45200,
    updatedAt: '2026-03-25',
    featured: true,
    chapters: [
      { number: 45, title: '光落之歌', wordCount: 5420, updatedAt: '2026-03-25' },
      { number: 44, title: '回廊深处', wordCount: 4890, updatedAt: '2026-03-20' },
      { number: 43, title: '黎明之前', wordCount: 5100, updatedAt: '2026-03-15' }
    ]
  },
  {
    id: 'novel_002',
    slug: 'neon-sea',
    title: '霓虹与海',
    author: MOCK_USERS[1],
    coverImage: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400&h=600&fit=crop',
    synopsis: '四个年轻人在夜色之城中互相取暖。平行的人生轨迹交错，每个人都有自己的秘密与伤痛。当真相浮出水面，他们的友情能否经受考验？',
    tags: ['都市', '群像', '情感', '悬疑'],
    category: 'urban',
    status: 'completed',
    wordCount: 89500,
    chapterCount: 28,
    views: 89000,
    bookmarks: 54120,
    likes: 28900,
    updatedAt: '2025-12-15',
    featured: true,
    chapters: [
      { number: 28, title: '潮汐', wordCount: 3200, updatedAt: '2025-12-15' }
    ]
  },
  {
    id: 'novel_003',
    slug: 'floating-city',
    title: '浮城纪年',
    author: MOCK_USERS[2],
    coverImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&h=600&fit=crop',
    synopsis: '浮城与地表的千年对峙中，少年们试图改写命运。当天空之城即将陨落，他们能否找到拯救家园的方法？',
    tags: ['奇幻', '冒险', '少年', '史诗'],
    category: 'fantasy',
    status: 'ongoing',
    wordCount: 143000,
    chapterCount: 38,
    views: 145000,
    bookmarks: 82406,
    likes: 41800,
    updatedAt: '2026-03-22',
    featured: true,
    chapters: [
      { number: 38, title: '云裂', wordCount: 4100, updatedAt: '2026-03-22' },
      { number: 37, title: '风暴前夕', wordCount: 3950, updatedAt: '2026-03-18' }
    ]
  },
  {
    id: 'novel_004',
    slug: 'ink-shadows',
    title: '墨影录',
    author: MOCK_USERS[1],
    coverImage: 'https://images.unsplash.com/photo-1551269901-5c5e14c25df7?w=400&h=600&fit=crop',
    synopsis: '身负墨纹的年轻捕快，破解潜藏在京城的千年秘密。每一条线索都指向一个惊人的真相，而他自己的身世之谜，也逐渐浮出水面。',
    tags: ['古风', '悬疑', '破案', '武侠'],
    category: 'historical',
    status: 'ongoing',
    wordCount: 67200,
    chapterCount: 22,
    views: 56000,
    bookmarks: 31255,
    likes: 18600,
    updatedAt: '2026-03-26',
    featured: false,
    chapters: [
      { number: 22, title: '墨纹觉醒', wordCount: 3200, updatedAt: '2026-03-26' }
    ]
  },
  {
    id: 'novel_005',
    slug: 'lightfall-ode',
    title: '光陨之歌',
    author: MOCK_USERS[0],
    coverImage: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=600&fit=crop',
    synopsis: '一颗陨石引发的文明变革。当光芒坠落，新的秩序在废墟中诞生。一个女孩的成长史诗，见证一个宇宙的兴衰。',
    tags: ['科幻', '史诗', '女性主角', '宇宙探索'],
    category: 'space-opera',
    status: 'completed',
    wordCount: 320000,
    chapterCount: 86,
    views: 245000,
    bookmarks: 128000,
    likes: 67200,
    updatedAt: '2025-08-30',
    featured: false,
    chapters: [
      { number: 86, title: '永恒', wordCount: 3800, updatedAt: '2025-08-30' }
    ]
  },
  {
    id: 'novel_006',
    slug: 'midnight-library',
    title: '午夜图书馆',
    author: MOCK_USERS[0],
    coverImage: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&h=600&fit=crop',
    synopsis: '每本书都是一个可能的世界。图书馆管理员发现，她可以通过阅读改变现实。但每一次改变，都有代价。',
    tags: ['奇幻', '文学', '治愈', '悬疑'],
    category: 'fantasy',
    status: 'completed',
    wordCount: 78000,
    chapterCount: 24,
    views: 67000,
    bookmarks: 38900,
    likes: 21400,
    updatedAt: '2025-06-12',
    featured: false,
    chapters: [
      { number: 24, title: '最后一页', wordCount: 3400, updatedAt: '2025-06-12' }
    ]
  },
  {
    id: 'novel_007',
    slug: 'spring-dreams',
    title: '浮梦春日',
    author: MOCK_USERS[1],
    coverImage: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=600&fit=crop',
    synopsis: '一个关于春天、梦想和重逢的故事。四段交织的人生，在樱花飘落的季节找到了彼此。',
    tags: ['青春', '治愈', '短篇集'],
    category: 'slice-of-life',
    status: 'completed',
    wordCount: 45000,
    chapterCount: 12,
    views: 34000,
    bookmarks: 18200,
    likes: 9800,
    updatedAt: '2025-04-01',
    featured: false,
    chapters: [
      { number: 12, title: '春风', wordCount: 3800, updatedAt: '2025-04-01' }
    ]
  },
  {
    id: 'novel_008',
    slug: 'demo-novel',
    title: '星际迷途',
    author: MOCK_USERS[3],
    coverImage: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=600&fit=crop',
    synopsis: '一个年轻飞行员的星际冒险。当飞船迷失在未知星域，他必须学会信任陌生的同伴，找到回家的路。',
    tags: ['科幻', '冒险', '新手作品'],
    category: 'space-opera',
    status: 'ongoing',
    wordCount: 12500,
    chapterCount: 5,
    views: 890,
    bookmarks: 45,
    likes: 120,
    updatedAt: '2026-03-27',
    featured: false,
    chapters: [
      { number: 5, title: '陌生星系', wordCount: 2800, updatedAt: '2026-03-27' }
    ]
  }
];

export const MOCK_BOOKMARKS = [
  {
    id: 'bm_001',
    userId: 'current_user',
    novelId: 'novel_001',
    novel: MOCK_NOVELS[0],
    chapter: 12,
    progress: 0.45,
    createdAt: '2026-03-20'
  },
  {
    id: 'bm_002',
    userId: 'current_user',
    novelId: 'novel_003',
    novel: MOCK_NOVELS[2],
    chapter: 5,
    progress: 0.1,
    createdAt: '2026-03-18'
  },
  {
    id: 'bm_003',
    userId: 'current_user',
    novelId: 'novel_002',
    novel: MOCK_NOVELS[1],
    chapter: 28,
    progress: 1.0,
    createdAt: '2026-03-15'
  }
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif_001',
    type: 'follow',
    actor: MOCK_USERS[0],
    content: '关注了你',
    novel: null,
    createdAt: '2026-03-28T10:30:00',
    read: false
  },
  {
    id: 'notif_002',
    type: 'bookmark',
    actor: MOCK_USERS[1],
    content: '收藏了你的作品《星际迷途》',
    novel: MOCK_NOVELS[7],
    createdAt: '2026-03-28T09:15:00',
    read: false
  },
  {
    id: 'notif_003',
    type: 'comment',
    actor: MOCK_USERS[2],
    content: '评论了你的作品《星际迷途》',
    novel: MOCK_NOVELS[7],
    comment: '设定很有意思，期待后续发展！',
    createdAt: '2026-03-27T22:45:00',
    read: true
  },
  {
    id: 'notif_004',
    type: 'system',
    content: '您的作品《星际迷途》获得了编辑推荐',
    novel: MOCK_NOVELS[7],
    createdAt: '2026-03-27T18:00:00',
    read: true
  }
];

export const MOCK_DRAFTS = [
  {
    id: 'draft_001',
    userId: 'current_user',
    novelId: 'novel_008',
    title: '第六章 · 星云风暴',
    content: '飞船穿越密集的星云区域，警报声不断。窗外的光芒变得扭曲而诡异...',
    wordCount: 2100,
    lastModified: '2026-03-28T14:20:00',
    status: 'in_progress'
  },
  {
    id: 'draft_002',
    userId: 'current_user',
    title: '新作品构思',
    content: '',
    wordCount: 0,
    lastModified: '2026-03-26T10:00:00',
    status: 'concept'
  }
];

export const MOCK_READING_HISTORY = [
  {
    novel: MOCK_NOVELS[0],
    chapter: 12,
    progress: 0.45,
    lastRead: '2026-03-28T15:30:00',
    totalTime: 45
  },
  {
    novel: MOCK_NOVELS[2],
    chapter: 5,
    progress: 0.1,
    lastRead: '2026-03-27T20:15:00',
    totalTime: 12
  },
  {
    novel: MOCK_NOVELS[1],
    chapter: 28,
    progress: 1.0,
    lastRead: '2026-03-26T18:00:00',
    totalTime: 38
  }
];

export const MOCK_DASHBOARD_STATS = {
  today: {
    reads: 127,
    newBookmarks: 8,
    wordsWritten: 2100,
    newFollowers: 3
  },
  week: {
    reads: 892,
    newBookmarks: 45,
    wordsWritten: 8500,
    newFollowers: 18
  },
  streak: {
    current: 7,
    longest: 14
  },
  calendar: [
    { date: '2026-03-28', words: 2100 },
    { date: '2026-03-27', words: 3200 },
    { date: '2026-03-26', words: 0 },
    { date: '2026-03-25', words: 1800 },
    { date: '2026-03-24', words: 2400 },
    { date: '2026-03-23', words: 0 },
    { date: '2026-03-22', words: 1200 }
  ]
};

// Helper functions
export function getUserByUsername(username) {
  return MOCK_USERS.find(u => u.username === username);
}

export function getUserById(id) {
  return MOCK_USERS.find(u => u.id === id);
}

export function getNovelsByAuthor(authorId) {
  return MOCK_NOVELS.filter(n => n.author.id === authorId);
}

export function getNovelBySlug(slug) {
  return MOCK_NOVELS.find(n => n.slug === slug);
}

export function getUserBookmarks(userId) {
  return MOCK_BOOKMARKS.filter(b => b.userId === userId);
}

export function getUserNotifications(userId) {
  return MOCK_NOTIFICATIONS;
}

export function getUnreadNotificationCount() {
  return MOCK_NOTIFICATIONS.filter(n => !n.read).length;
}
