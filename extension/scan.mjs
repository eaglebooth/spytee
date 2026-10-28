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
  const tagsFrom = (root) => [...new Set([...root.querySelectorAll('a[href]')]
    .filter((link) => {
      const url = safeUrl(link.getAttribute('href'));
      return url && /^\/(?:t-shirts|hoodie|stickers|mug|tank-top|kids-t-shirt)\/[^/]+\/?$/.test(new URL(url).pathname)
        && !productInfo(url);
    }).map((link) => clean(link.textContent)).filter(Boolean))].slice(0, 100);
  const products = [];
  const seen = new Set();
  const sections = [...document.querySelectorAll('h1,h2,h3,h4')]
    .filter((node) => /^(best sellers|trending today)$/i.test(clean(node.textContent)));
  const getSection = (element) => {
    let section = 'page';
    for (const heading of sections) {
      if (heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) {
        section = /best sellers/i.test(heading.textContent) ? 'best-sellers' : 'trending-today';
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
