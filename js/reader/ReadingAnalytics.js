const MAX_IDLE_MS = 5 * 60 * 1000;
const MIN_COMMIT_DURATION_MS = 30 * 1000;
const MIN_COMMIT_WORDS = 200;

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function toPositiveNumber(value) {
  const num = Number(value) || 0;
  return num > 0 ? num : 0;
}

function formatDateKeyFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const parts = typeof key === "string" ? key.split("-") : [];
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month, day);
}

function stepDate(date, deltaDays) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + deltaDays);
  return next;
}

function cloneDayStats(day) {
  if (!day || typeof day !== "object") {
    return { durationMs: 0, wordsRead: 0, updatedAt: 0 };
  }
  return {
    durationMs: toPositiveNumber(day.durationMs),
    wordsRead: toPositiveNumber(day.wordsRead),
    updatedAt: Number(day.updatedAt) || 0
  };
}

function computeStreak(dayMap, todayKey) {
  if (!todayKey) return 0;
  const todayDate = parseDateKey(todayKey);
  if (!todayDate) return 0;
  let streak = 0;
  let cursor = new Date(todayDate.getTime());
  while (true) {
    const key = formatDateKeyFromDate(cursor);
    const stats = dayMap[key];
    const hasReading =
      stats && (toPositiveNumber(stats.durationMs) > 0 || toPositiveNumber(stats.wordsRead) > 0);
    if (!hasReading) {
      break;
    }
    streak += 1;
    cursor = stepDate(cursor, -1);
  }
  return streak;
}

function aggregateWindow(dayMap, todayKey, windowSize) {
  if (!todayKey || !Number.isFinite(windowSize) || windowSize <= 0) {
    return { totalWords: 0, totalDurationMs: 0 };
  }
  const todayDate = parseDateKey(todayKey);
  if (!todayDate) {
    return { totalWords: 0, totalDurationMs: 0 };
  }
  let cursor = new Date(todayDate.getTime());
  let totalWords = 0;
  let totalDuration = 0;
  for (let i = 0; i < windowSize; i += 1) {
    const key = formatDateKeyFromDate(cursor);
    const stats = dayMap[key];
    if (stats) {
      totalWords += toPositiveNumber(stats.wordsRead);
      totalDuration += toPositiveNumber(stats.durationMs);
    }
    cursor = stepDate(cursor, -1);
  }
  return { totalWords, totalDurationMs: totalDuration };
}

export function createReadingAnalytics({ store, onSummary } = {}) {
  const safeStore = store && typeof store.load === "function" && typeof store.save === "function" ? store : null;

  const cache = safeStore ? safeStore.load() : { days: {} };
  if (!cache.days || typeof cache.days !== "object") {
    cache.days = {};
  }

  const session = {
    currentSlug: null,
    lastTimestamp: null,
    lastBookProgress: 0,
    pendingDurationMs: 0,
    pendingWords: 0,
    totalBookWords: 0
  };

  let lastSummary = null;

  function setTotalBookWords(totalWords) {
    session.totalBookWords = Math.max(0, Number(totalWords) || 0);
    notifySummary();
  }

  function setActiveChapter(slug) {
    if (!slug || typeof slug !== "string") return;
    if (session.currentSlug && session.currentSlug !== slug) {
      persistPending();
    }
    session.currentSlug = slug;
    session.lastTimestamp = Date.now();
  }

  function recordProgress({ slug, bookProgress, timestamp = Date.now() } = {}) {
    if (!slug || typeof slug !== "string") return;
    const clampedProgress = clamp01(Number(bookProgress) || 0);
    const now = Number(timestamp) || Date.now();

    if (!session.currentSlug) {
      session.currentSlug = slug;
      session.lastTimestamp = now;
      session.lastBookProgress = clampedProgress;
      notifySummary();
      return;
    }

    if (slug !== session.currentSlug) {
      persistPending({ timestamp: now });
      session.currentSlug = slug;
      session.lastTimestamp = now;
      session.lastBookProgress = clampedProgress;
      notifySummary();
      return;
    }

    if (session.lastTimestamp) {
      const deltaTime = Math.max(0, Math.min(now - session.lastTimestamp, MAX_IDLE_MS));
      if (deltaTime > 0) {
        session.pendingDurationMs += deltaTime;
      }
    }

    const previousProgress = clamp01(session.lastBookProgress);
    const deltaProgress = Math.max(0, clampedProgress - previousProgress);

    if (deltaProgress > 0 && session.totalBookWords > 0) {
      session.pendingWords += deltaProgress * session.totalBookWords;
    }

    session.lastTimestamp = now;
    session.lastBookProgress = clampedProgress;

    const shouldPersist =
      session.pendingDurationMs >= MIN_COMMIT_DURATION_MS || session.pendingWords >= MIN_COMMIT_WORDS;

    if (shouldPersist) {
      persistPending({ timestamp: now });
    } else {
      notifySummary();
    }
  }

  function persistPending({ timestamp = Date.now() } = {}) {
    const duration = session.pendingDurationMs;
    const words = session.pendingWords;
    if (duration <= 0 && words <= 0) {
      notifySummary();
      return;
    }
    const dateKey = formatDateKeyFromTimestamp(timestamp);
    const merged = cloneDayStats(cache.days[dateKey]);
    merged.durationMs += duration;
    merged.wordsRead += words;
    merged.updatedAt = Math.max(merged.updatedAt, timestamp);
    cache.days[dateKey] = merged;
    session.pendingDurationMs = 0;
    session.pendingWords = 0;
    if (safeStore) {
      safeStore.save({ days: cache.days });
    }
    notifySummary();
  }

  function buildSummary() {
    const now = Date.now();
    const todayKey = formatDateKeyFromTimestamp(now);

    const mergedDays = {};
    Object.entries(cache.days).forEach(([key, day]) => {
      mergedDays[key] = cloneDayStats(day);
    });

    if (!mergedDays[todayKey]) {
      mergedDays[todayKey] = { durationMs: 0, wordsRead: 0, updatedAt: now };
    }
    mergedDays[todayKey].durationMs += session.pendingDurationMs;
    mergedDays[todayKey].wordsRead += session.pendingWords;
    mergedDays[todayKey].updatedAt = Math.max(mergedDays[todayKey].updatedAt, now);

    const hasData = Object.values(mergedDays).some((day) => {
      if (!day) return false;
      return toPositiveNumber(day.durationMs) > 0 || toPositiveNumber(day.wordsRead) > 0;
    });

    const todayStats = cloneDayStats(mergedDays[todayKey]);
    const windowStats = aggregateWindow(mergedDays, todayKey, 7);

    const avgWordsPerMinute =
      windowStats.totalDurationMs > 0
        ? Math.round((windowStats.totalWords / windowStats.totalDurationMs) * 60000)
        : 0;

    const progress = clamp01(session.lastBookProgress);
    const percentComplete = Math.round(progress * 100);

    let remainingMinutes = null;
    let remainingWords = 0;
    if (session.totalBookWords > 0) {
      remainingWords = Math.round(Math.max(0, session.totalBookWords * (1 - progress)));
    }
    if (avgWordsPerMinute > 0 && remainingWords > 0) {
      remainingMinutes = Math.max(1, Math.round(remainingWords / avgWordsPerMinute));
    }

    return {
      hasData,
      todayMinutes: Math.round(todayStats.durationMs / 60000),
      todayWords: Math.round(todayStats.wordsRead),
      streakDays: computeStreak(mergedDays, todayKey),
      averageWordsPerMinute: avgWordsPerMinute,
      remainingMinutes,
      percentComplete,
      bookProgress: progress,
      remainingWords,
      totalWordsTracked: Math.round(windowStats.totalWords),
      totalDurationMsTracked: windowStats.totalDurationMs,
      updatedAt: now
    };
  }

  function notifySummary() {
    const summary = buildSummary();
    lastSummary = summary;
    if (typeof onSummary === "function") {
      onSummary(summary);
    }
  }

  function getSummary() {
    if (lastSummary) {
      return lastSummary;
    }
    const summary = buildSummary();
    lastSummary = summary;
    return summary;
  }

  function flush() {
    persistPending();
  }

  notifySummary();

  return {
    setTotalBookWords,
    setActiveChapter,
    recordProgress,
    flush,
    getSummary
  };
}

export default {
  createReadingAnalytics
};
