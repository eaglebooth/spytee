const STORAGE_KEYS = {
  trends: 'spypod_trend_snapshots',
  products: 'spypod_redbubble_product_snapshots',
  competition: 'spypod_redbubble_competition_snapshots',
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function createEntry(data) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    data,
  };
}

export function loadSnapshots() {
  return readJson(STORAGE_KEYS.trends, []);
}

export function saveSnapshot(snapshot) {
  const entry = createEntry(snapshot);
  localStorage.setItem(
    STORAGE_KEYS.trends,
    JSON.stringify([entry, ...loadSnapshots()].slice(0, 100))
  );
  return entry;
}

export function loadScopedSnapshots(mode, scope) {
  const all = readJson(STORAGE_KEYS[mode], {});
  return all[scope] || [];
}

export function saveScopedSnapshot(mode, scope, data) {
  const all = readJson(STORAGE_KEYS[mode], {});
  const entry = createEntry(data);
  all[scope] = [entry, ...(all[scope] || [])].slice(0, 100);
  localStorage.setItem(STORAGE_KEYS[mode], JSON.stringify(all));
  return entry;
}

export function compareRankings(current, history, keySelector) {
  if (!history.length) {
    return current.map((item) => ({ ...item, trend: 'new', rankChange: 0 }));
  }

  const previous = history[0].data.trending_searches || history[0].data;
  const previousRanks = new Map(
    previous.map((item, index) => [keySelector(item), index + 1])
  );

  return current.map((item) => {
    const previousRank = previousRanks.get(keySelector(item));
    if (previousRank === undefined) return { ...item, trend: 'new', rankChange: 0 };

    const change = previousRank - item.rank;
    if (change > 0) return { ...item, trend: 'up', rankChange: change };
    if (change < 0) return { ...item, trend: 'down', rankChange: Math.abs(change) };
    return { ...item, trend: 'same', rankChange: 0 };
  });
}
