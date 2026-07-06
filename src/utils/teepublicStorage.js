const TAGS_KEY = 'spypod_teepublic_trend_snapshots';
const PRODUCT_KEYS = {
  'best-sellers': 'spypod_teepublic_best_sellers_snapshots',
  'trending-today': 'spypod_teepublic_trending_today_snapshots',
};

function createEntry(data) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    data,
  };
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function loadTeepublicSnapshots() {
  return readJson(TAGS_KEY, []);
}

export function saveTeepublicSnapshot(tags) {
  const entry = createEntry(tags);
  localStorage.setItem(
    TAGS_KEY,
    JSON.stringify([entry, ...loadTeepublicSnapshots()].slice(0, 100))
  );
  return entry;
}

export function loadProductSnapshots(mode, product) {
  const snapshots = readJson(PRODUCT_KEYS[mode], {});
  return snapshots[product] || [];
}

export function saveProductSnapshot(mode, product, products) {
  const storageKey = PRODUCT_KEYS[mode];
  const snapshots = readJson(storageKey, {});
  const entry = createEntry(products);

  snapshots[product] = [entry, ...(snapshots[product] || [])].slice(0, 100);
  localStorage.setItem(storageKey, JSON.stringify(snapshots));
  return entry;
}

export function compareRankings(current, history, keySelector) {
  if (!history.length) {
    return current.map((item) => ({ ...item, trend: 'new', rankChange: 0 }));
  }

  const previousRanks = new Map(
    history[0].data.map((item, index) => [keySelector(item), index + 1])
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
