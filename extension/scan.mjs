// Self-contained because Chrome serializes this function into the active tab.
export function scanTeePublicPage() {
  if (!['www.teepublic.com', 'teepublic.com'].includes(location.hostname)) {
    throw new Error('Hay mo mot trang TeePublic truoc khi quet.');
  }
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (/just a moment|security verification|verify you are human|access denied/i.test(
    document.title + ' ' + (document.querySelector('h1')?.textContent || '')
  )) throw new Error('Trang dang yeu cau xac minh. Hay hoan thanh xac minh TeePublic roi quet lai.');
  const safeUrl = (value) => {
    try {
      const url = new URL(value, location.href);
      if (url.protocol !== 'https:' || !['www.teepublic.com', 'teepublic.com'].includes(url.hostname)) return '';
      url.search = '';
      url.hash = '';
      return url.href;
    } catch { return ''; }
  };
  const productInfo = (value) => {
    const url = safeUrl(value);
    const match = url && new URL(url).pathname.match(/^\/([^/]+)\/(\d+)-([^/]+)/);
    return match ? { url, id: match[2], type: match[1], slug: match[3] } : null;
  };
  if (/^\/tag-directory(?:\/|$)/.test(location.pathname)) {
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5')];
    const marker = headings.find((node) => /automatically generated based on tag usage/i.test(node.textContent));
    const directoryTitle = headings.find((node) => /tag directory/i.test(node.textContent));
    const start = marker || directoryTitle;
    if (!start) throw new Error('Chưa tìm thấy Tag Directory. Đợi trang TeePublic tải xong rồi thử lại.');
    const end = headings.find((node) => /subscribe|support|similar designs/i.test(node.textContent)
      && (start.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
    const directoryTags = [];
    const seenTags = new Set();
    for (const link of document.querySelectorAll('a[href]')) {
      if (!(start.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (end && !(link.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      if (link.closest('footer,nav,header')) continue;
      const url = safeUrl(link.getAttribute('href'));
      if (!url || productInfo(url) || !/^\/(?:t-shirts|hoodie|stickers|mug)\/[^/]+\/?$/.test(new URL(url).pathname)) continue;
      const keyword = clean(link.textContent);
      const normalized = keyword.toLowerCase();
      if (!keyword || seenTags.has(normalized)) continue;
      seenTags.add(normalized);
      directoryTags.push({ keyword, url, rank: directoryTags.length + 1 });
      if (directoryTags.length >= 500) break;
    }
    if (!directoryTags.length) throw new Error('Tag Directory chưa có tag đọc được. Đợi tải trang hoặc hoàn thành xác minh rồi thử lại.');
    return { schemaVersion: 1, source: 'teepublic', kind: 'tags', sourceUrl: location.href, pageTitle: clean(document.title), scannedAt: new Date().toISOString(), products: [], directoryTags };
  }
  const tagsFrom = (root) => [...new Set([...root.querySelectorAll('a[href]')]
    .filter((link) => {
      const url = safeUrl(link.getAttribute('href'));
      return url && /^\/(?:t-shirts|hoodie|stickers|mug|tank-top|kids-t-shirt)\/[^/]+\/?$/.test(new URL(url).pathname)
        && !productInfo(url);
    }).map((link) => clean(link.textContent)).filter(Boolean))].slice(0, 100);
  const products = [];
  const seen = new Set();
  const sections = [...document.querySelectorAll('h1,h2,h3,h4')]
    .filter((node) => /^(best sellers|trending today|more categories|trending tags|similar designs|subscribe to our newsletter)$/i.test(clean(node.textContent)));
  const getSection = (element) => {
    let section = 'page';
    for (const heading of sections) {
      if (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
        section = /^best sellers$/i.test(clean(heading.textContent)) ? 'best-sellers'
          : /^trending today$/i.test(clean(heading.textContent)) ? 'trending-today' : 'page';
      }
    }
    return section;
  };
  for (const link of document.querySelectorAll('a[href]')) {
    const info = productInfo(link.getAttribute('href'));
    if (!info) continue;
    // A card boundary keeps one product's tags from leaking into its neighbors.
    const card = link.closest('[data-design-id], [data-product-id], .design-card, .design-tile, .design, .product-card, .product-tile, article, li');
    const root = card || link;
    const section = getSection(link);
    const key = `${section}:${info.type}:${info.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const image = root.querySelector('img');
    const titleNode = root.querySelector('h2,h3,h4,[class*="title"]');
    const authorLink = root.querySelector('a[href*="/user/"]');
    const mainTagNode = root.querySelector('[class*="main-tag"] a, [class*="main_tag"] a, a[data-main-tag]');
    products.push({
      id: info.id,
      type: info.type,
      url: info.url,
      title: clean(titleNode?.textContent || image?.getAttribute('alt') || link.getAttribute('title') || link.textContent || info.slug.replace(/-/g, ' ')),
      author: clean(authorLink?.textContent).replace(/^by\s+/i, ''),
      mainTag: clean(mainTagNode?.textContent),
      tags: tagsFrom(root),
      section,
      rank: products.filter((item) => item.section === section).length + 1,
    });
    if (products.length >= 500) break;
  }
  // Design detail pages often expose tags outside the title link's card.
  const current = productInfo(location.href);
  if (current) {
    const title = clean(document.querySelector('h1')?.textContent || document.title);
    const tagRoot = document.querySelector('[class*="design-tags"], [class*="design_tags"], [class*="product-tags"], [class*="product_tags"]');
    const authorLink = document.querySelector('main a[href*="/user/"], a[rel="author"]');
    const detail = {
      id: current.id, type: current.type, url: current.url, title,
      author: clean(authorLink?.textContent).replace(/^by\s+/i, ''),
      mainTag: '', tags: tagsFrom(tagRoot || document.querySelector('main') || document.body),
      section: 'detail', rank: 1,
    };
    return { schemaVersion: 1, source: 'teepublic', sourceUrl: location.href, pageTitle: clean(document.title), scannedAt: new Date().toISOString(), products: [detail] };
  }
  if (!products.length) throw new Error('Khong tim thay san pham. Hay mo trang tim kiem/san pham va doi tai xong, hoac hoan thanh xac minh TeePublic.');
  return { schemaVersion: 1, source: 'teepublic', sourceUrl: location.href, pageTitle: clean(document.title), scannedAt: new Date().toISOString(), products };
}
