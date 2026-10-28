export function validateScan(input) {
  if (input?.schemaVersion !== 1 || input.source !== 'teepublic'
    || !Array.isArray(input.products) || !input.products.length || input.products.length > 500
    || !Number.isFinite(Date.parse(input.scannedAt))) {
    throw new Error('File không phải phiên quét TeePublic hợp lệ (tối đa 500 mục).');
  }
  const safeUrl = (value) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['www.teepublic.com', 'teepublic.com'].includes(url.hostname)) {
      throw new Error('File chứa URL ngoài TeePublic.');
    }
    return url.href;
  };
  const text = (value) => typeof value === 'string' ? value.slice(0, 500) : '';
  return {
    schemaVersion: 1,
    source: 'teepublic',
    sourceUrl: safeUrl(input.sourceUrl),
    pageTitle: text(input.pageTitle),
    scannedAt: new Date(input.scannedAt).toISOString(),
    products: input.products.map((product, index) => {
      if (!product || !Array.isArray(product.tags) || product.tags.length > 100) {
        throw new Error('Dữ liệu sản phẩm không hợp lệ.');
      }
      return {
        id: text(product.id), type: text(product.type), url: safeUrl(product.url),
        title: text(product.title), author: text(product.author), mainTag: text(product.mainTag),
        tags: product.tags.map(text).filter(Boolean), section: text(product.section) || 'page',
        rank: Number.isInteger(product.rank) && product.rank > 0 ? product.rank : index + 1,
      };
    }),
  };
}
