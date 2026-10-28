export const PRODUCTS = [
  { value: 't-shirts', label: 'T-Shirt' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'stickers', label: 'Sticker' },
  { value: 'mug', label: 'Mug' },
];

export function getResearchUrl(mode, product) {
  if (!PRODUCTS.some((item) => item.value === product)) throw new Error('Loại sản phẩm không hợp lệ.');
  if (!['tags', 'best-sellers', 'trending-today'].includes(mode)) throw new Error('Mục quét không hợp lệ.');
  const path = mode === 'tags'
    ? `tag-directory${product === 't-shirts' ? '' : '/' + product}`
    : product;
  const url = new URL(path, 'https://www.teepublic.com/');
  // Extension-only fragment selects the view; it does not claim a separate TeePublic endpoint.
  url.hash = `spytee=${mode}`;
  return url.href;
}
