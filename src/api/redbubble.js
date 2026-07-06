import axios from 'axios';

const API_BASE = 'https://www.redbubble.com';

export const REDBUBBLE_PRODUCTS = [
  { value: 't-shirt', label: 'T-Shirt', query: 't-shirt' },
  { value: 'sticker', label: 'Sticker', query: 'sticker' },
  { value: 'hoodie', label: 'Hoodie', query: 'hoodie' },
  { value: 'mug', label: 'Mug', query: 'mug' },
];

export async function fetchTrendingSearches() {
  const { data } = await axios.get(`${API_BASE}/typeahead`, {
    params: { locale: 'en', query: 'q' },
  });
  return data;
}

export async function fetchSearchCompletions(query) {
  const { data } = await axios.get(`${API_BASE}/typeahead`, {
    params: { locale: 'en', query },
  });
  return data;
}

export function parseIndexedProducts(html) {
  const document = new DOMParser().parseFromString(String(html), 'text/html');
  const results = [];

  document.querySelectorAll('.snippet[data-type="web"]').forEach((result) => {
    const link = result.querySelector('a[href*="redbubble.com/i/"]');
    if (!link) return;

    const url = link.getAttribute('href') || '';
    const titleNode = result.querySelector('.search-snippet-title');
    const title = titleNode?.getAttribute('title') || titleNode?.textContent.trim() || '';
    const snippet = (
      result.querySelector('.product-review .line-clamp-2')
      || result.querySelector('.snippet-description')
    )?.textContent.trim() || '';
    const artistMatch = title.match(/\bby\s+([^|]+?)(?:\s*\|\s*Redbubble)?$/i);

    results.push({
      key: url,
      title,
      url,
      artist: artistMatch?.[1]?.trim() || '',
      snippet,
    });
  });

  return results;
}

export async function fetchIndexedProducts({ keyword = '', product = '', pages = 1 }) {
  const productTerm = REDBUBBLE_PRODUCTS.find((item) => item.value === product)?.query || '';
  const terms = ['site:redbubble.com/i/', keyword, productTerm, 'Redbubble']
    .filter(Boolean)
    .map((term) => term.includes(' ') ? `"${term}"` : term)
    .join(' ');

  const responses = await Promise.all(
    Array.from({ length: pages }, (_, index) =>
      axios.get('/api/redbubble-index', {
        params: { q: terms, source: 'web', offset: index },
        responseType: 'text',
        timeout: 30000,
      })
    )
  );

  const unique = new Map();
  responses.flatMap((response) => parseIndexedProducts(response.data)).forEach((item) => {
    unique.set(item.url, item);
  });

  const products = [...unique.values()].map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  if (products.length === 0) {
    throw new Error('Nguồn index đang giới hạn truy cập hoặc chưa có kết quả phù hợp.');
  }

  return products;
}

export function getCompetitionLevel(count) {
  if (count >= 15) return { key: 'high', label: 'Cao', color: 'red' };
  if (count >= 7) return { key: 'medium', label: 'Trung bình', color: 'gold' };
  return { key: 'low', label: 'Thấp', color: 'green' };
}
