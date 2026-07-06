import axios from 'axios';

const DIRECTORY_MARKER = 'automatically generated based on tag usage';
const TAG_LINK_PATTERN = /^\[([^\]]+)\]\((https?:\/\/www\.teepublic\.com\/t-shirts\/[^)\s]+)(?:\s+"[^"]*")?\)$/;
const MAIN_TAG_PATTERN = /^Main Tag:\s+\[([^\]]+)\]\((https?:\/\/www\.teepublic\.com\/[^)\s]+)\)$/;
const PRODUCT_PATTERN = /^## \[([^\]]+)\]\((https?:\/\/www\.teepublic\.com\/[^)\s]+)\)$/;
const CARD_PATTERN = /^\[!\[Image \d+: ([^\]]+)\]\([^)]+\)\]\((https?:\/\/www\.teepublic\.com\/[^)\s]+)\)$/;

export const TEEPUBLIC_PRODUCTS = [
  { value: 't-shirts', label: 'T-Shirt' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'stickers', label: 'Sticker' },
  { value: 'mug', label: 'Mug' },
];

export function parseTrendingTags(source) {
  const lines = String(source).split(/\r?\n/);
  const markerIndex = lines.findIndex((line) => line.includes(DIRECTORY_MARKER));

  if (markerIndex === -1) {
    throw new Error('Không tìm thấy danh sách tag trong dữ liệu TeePublic.');
  }

  const seen = new Set();
  const tags = [];

  for (const line of lines.slice(markerIndex + 1)) {
    if (line.startsWith('## Subscribe') || line.startsWith('#### Support')) break;

    const match = line.trim().match(TAG_LINK_PATTERN);
    if (!match) continue;

    const keyword = match[1].trim();
    const normalized = keyword.toLowerCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    tags.push({
      key: normalized,
      rank: tags.length + 1,
      keywords: keyword,
      url: match[2].replace('http://', 'https://'),
    });
  }

  if (tags.length === 0) {
    throw new Error('TeePublic hiện không trả về tag xu hướng.');
  }

  return tags;
}

function parseProductSection(source, product, sectionTitle, nextSectionTitle) {
  const lines = String(source).split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === `## ${sectionTitle}`);
  const endIndex = lines.findIndex(
    (line, index) => index > startIndex && line.trim() === `## ${nextSectionTitle}`
  );

  if (startIndex === -1) {
    const cards = parseProductCards(lines, product);
    const slice = sectionTitle === 'Best Sellers' ? cards.slice(0, 16) : cards.slice(16, 44);

    if (slice.length === 0) {
      throw new Error(`TeePublic hiện không trả về sản phẩm ${sectionTitle}.`);
    }

    return slice.map((item, index) => ({ ...item, rank: index + 1 }));
  }

  return parseMarkedProductSection(lines, product, sectionTitle, startIndex, endIndex);
}

function parseProductCards(lines, product) {
  const cards = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const cardMatch = lines[index].trim().match(CARD_PATTERN);
    if (!cardMatch) continue;

    const url = cardMatch[2].replace('http://', 'https://');
    const uniqueKey = `${url}-${cards.length}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const chunk = lines.slice(index + 1, index + 18).map((line) => line.trim());
    const descriptionLine = chunk.find((line) => line.startsWith('Description:'));
    const tagsLine = chunk.find((line) => line.startsWith('Tags:'));
    const headingIndex = chunk.findIndex((line) => line.match(PRODUCT_PATTERN));
    const author = headingIndex >= 0 && chunk[headingIndex + 2]?.startsWith('by ')
      ? chunk[headingIndex + 2].slice(3)
      : '';
    const title = cardMatch[1].trim();
    const description = descriptionLine?.slice('Description:'.length).trim() || '';
    const relatedTags = tagsLine
      ? tagsLine
        .slice(5)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      : [];

    cards.push({
      key: `${url}-${cards.length + 1}`,
      rank: cards.length + 1,
      product,
      title,
      url,
      author,
      mainTag: description || title.replace(/\s+(T-Shirt|Hoodie|Sticker|Mug)$/i, ''),
      mainTagUrl: url,
      relatedTags,
    });
  }

  return cards;
}

function parseMarkedProductSection(lines, product, sectionTitle, startIndex, endIndex) {
  if (startIndex === -1) {
    throw new Error(`Không tìm thấy danh sách ${sectionTitle}.`);
  }

  const section = lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex);
  const products = [];
  let current = null;

  for (let index = 0; index < section.length; index += 1) {
    const line = section[index].trim();
    const mainTagMatch = line.match(MAIN_TAG_PATTERN);

    if (mainTagMatch) {
      current = {
        mainTag: mainTagMatch[1],
        mainTagUrl: mainTagMatch[2].replace('http://', 'https://'),
        relatedTags: [],
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith('Tags:')) {
      current.relatedTags = line
        .slice(5)
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      continue;
    }

    const productMatch = line.match(PRODUCT_PATTERN);
    if (!productMatch) continue;

    const authorLine = section.slice(index + 1).find((candidate) => candidate.trim());
    const author = authorLine?.trim().startsWith('by ')
      ? authorLine.trim().slice(3)
      : '';

    products.push({
      key: productMatch[2],
      rank: products.length + 1,
      product,
      title: productMatch[1],
      url: productMatch[2].replace('http://', 'https://'),
      author,
      ...current,
    });
    current = null;
  }

  if (products.length === 0) {
    throw new Error(`TeePublic hiện không trả về sản phẩm ${sectionTitle}.`);
  }

  return products;
}

export function parseBestSellers(source, product) {
  return parseProductSection(source, product, 'Best Sellers', 'Trending Today');
}

export function parseTrendingToday(source, product) {
  return parseProductSection(source, product, 'Trending Today', 'More Categories');
}

async function fetchProductPage(product) {
  if (!TEEPUBLIC_PRODUCTS.some((item) => item.value === product)) {
    throw new Error('Loại sản phẩm không hợp lệ.');
  }

  const { data } = await axios.get('/api/teepublic-products', {
    params: { product },
    responseType: 'text',
    timeout: 30000,
  });
  return data;
}

export async function fetchTrendingTags() {
  const { data } = await axios.get('/api/teepublic-tags', {
    responseType: 'text',
    timeout: 30000,
  });
  return parseTrendingTags(data);
}

export async function fetchBestSellers(product) {
  return parseBestSellers(await fetchProductPage(product), product);
}

export async function fetchTrendingToday(product) {
  return parseTrendingToday(await fetchProductPage(product), product);
}
