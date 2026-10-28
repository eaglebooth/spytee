import axios from 'axios';
import { assertTeePublicSource } from '../../lib/teepublicSource.mjs';

const DIRECTORY_MARKER = 'automatically generated based on tag usage';
const TAG_LINK_PATTERN = /^\[([^\]]+)\]\((https?:\/\/www\.teepublic\.com\/t-shirts\/[^)\s]+)(?:\s+"[^"]*")?\)$/;
const MAIN_TAG_PATTERN = /^Main Tag:\s+\[([^\]]+)\]\((https?:\/\/www\.teepublic\.com\/[^)\s]+)\)$/;
const PRODUCT_PATTERN = /^#{1,6}\s+\[([^\]]+)\]\((https?:\/\/www\.teepublic\.com\/[^/]+\/\d+-[^)\s]+)\)$/;
const CARD_PATTERN = /^\[!\[[^\]]*?:\s*([^\]]+)\]\([^)]+\)\]\((https?:\/\/www\.teepublic\.com\/[^/]+\/\d+-[^)\s]+)\)/;

export const TEEPUBLIC_PRODUCTS = [
  { value: 't-shirts', label: 'T-Shirt' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'stickers', label: 'Sticker' },
  { value: 'mug', label: 'Mug' },
];

export function parseTrendingTags(source) {
  const lines = assertTeePublicSource(source).split(/\r?\n/);
  const markerIndex = lines.findIndex((line) => line.includes(DIRECTORY_MARKER));
  if (markerIndex === -1) throw new Error('Không tìm thấy danh sách tag trong dữ liệu TeePublic.');
  const seen = new Set();
  const tags = [];
  for (const line of lines.slice(markerIndex + 1)) {
    if (/^#{1,6}\s+(Subscribe|Support)/.test(line)) break;
    const match = line.trim().match(TAG_LINK_PATTERN);
    if (!match) continue;
    const keyword = match[1].trim();
    const normalized = keyword.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    tags.push({ key: normalized, rank: tags.length + 1, keywords: keyword, url: match[2].replace('http://', 'https://') });
  }
  if (!tags.length) throw new Error('TeePublic hiện không trả về tag xu hướng.');
  return tags;
}

function heading(line, next) {
  const match = line.trim().match(/^#{1,6}\s+(.+?)\s*#*$/);
  if (match && !PRODUCT_PATTERN.test(line.trim())) return match[1].trim();
  if (/^\s*(?:={3,}|-{3,})\s*$/.test(next || '')) return line.trim();
  return '';
}

function parseProductSection(source, product, sectionTitle) {
  const lines = assertTeePublicSource(source).split(/\r?\n/);
  const start = lines.findIndex((line, index) => heading(line, lines[index + 1]).toLowerCase() === sectionTitle.toLowerCase());
  if (start === -1) {
    throw new Error('Nguồn hiện không có nhãn ' + sectionTitle + ' để xác định đúng danh sách. Hãy dùng extension trên trang TeePublic; ứng dụng không tự chia sản phẩm theo số lượng cố định.');
  }
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const title = heading(lines[index], lines[index + 1]);
    if (title && !/^by\s/i.test(title)) { end = index; break; }
  }
  const products = [];
  const seen = new Set();
  let current = null;
  const finish = () => {
    if (!current || seen.has(current.url)) return;
    seen.add(current.url);
    products.push({ ...current, key: current.url, rank: products.length + 1, product });
  };
  for (const raw of lines.slice(start + 1, end)) {
    const line = raw.trim();
    const card = line.match(CARD_PATTERN);
    const title = line.match(PRODUCT_PATTERN);
    if (card || title) {
      const match = card || title;
      const url = match[2].replace('http://', 'https://');
      if (current?.url !== url) {
        finish();
        current = { title: match[1], url, author: '', mainTag: '', mainTagUrl: '', relatedTags: [] };
      } else if (title) current.title = title[1];
      continue;
    }
    if (!current) continue;
    const mainTag = line.match(MAIN_TAG_PATTERN);
    if (mainTag) { current.mainTag = mainTag[1]; current.mainTagUrl = mainTag[2].replace('http://', 'https://'); }
    if (line.startsWith('Tags:')) current.relatedTags = [...new Set(line.slice(5).split(',').map((tag) => tag.trim()).filter(Boolean))];
    if (line.startsWith('by ')) current.author = line.slice(3).trim();
  }
  finish();
  if (!products.length) throw new Error('Nguồn không cung cấp sản phẩm trong mục ' + sectionTitle + '. Vui lòng thử lại sau hoặc dùng extension.');
  return products;
}

export function parseBestSellers(source, product) {
  return parseProductSection(source, product, 'Best Sellers');
}

export function parseTrendingToday(source, product) {
  return parseProductSection(source, product, 'Trending Today');
}

async function requestSource(path, params) {
  try {
    const { data } = await axios.get(path, { params, responseType: 'text', timeout: 30000 });
    return assertTeePublicSource(data);
  } catch (error) {
    let payload = error.response?.data;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = null; }
    }
    if (payload?.error) throw new Error(payload.error, { cause: error });
    throw error;
  }
}

async function fetchProductPage(product) {
  if (!TEEPUBLIC_PRODUCTS.some((item) => item.value === product)) throw new Error('Loại sản phẩm không hợp lệ.');
  return requestSource('/api/teepublic-products', { product });
}

export async function fetchTrendingTags() {
  return parseTrendingTags(await requestSource('/api/teepublic-tags'));
}

export async function fetchBestSellers(product) {
  return parseBestSellers(await fetchProductPage(product), product);
}

export async function fetchTrendingToday(product) {
  return parseTrendingToday(await fetchProductPage(product), product);
}
