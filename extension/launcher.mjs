import { getResearchUrl, PRODUCTS } from './navigation.mjs';

export function mountResearchLauncher(page = document) {
  if (page.getElementById('spytee-teepublic-launcher')) return;
  const host = page.createElement('div');
  host.id = 'spytee-teepublic-launcher';
  host.style.cssText = 'all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483646;display:block;';
  const root = host.attachShadow({ mode: 'open' });
  const style = page.createElement('style');
  style.textContent = '*{box-sizing:border-box}aside{width:260px;font:14px/1.5 system-ui,sans-serif;background:white;color:#0f172a;border:1px solid #cbd5e1;border-radius:12px;box-shadow:0 6px 24px #0f172a30;padding:12px}button{width:100%;font:inherit;background:#0f766e;color:white;border:0;border-radius:6px;padding:9px;cursor:pointer}select{width:100%;font:inherit;padding:7px;margin:10px 0;border:1px solid #cbd5e1;border-radius:6px}a{display:block;color:#0f766e;padding:7px 0}small{display:block;color:#64748b}[hidden]{display:none!important}';
  root.append(style);
  const aside = page.createElement('aside');
  const toggle = page.createElement('button');
  toggle.textContent = 'SPYTEE · mở mục spy';
  toggle.setAttribute('aria-expanded', 'false');
  const content = page.createElement('div');
  content.hidden = true;
  toggle.addEventListener('click', () => {
    content.hidden = !content.hidden;
    toggle.setAttribute('aria-expanded', String(!content.hidden));
  });
  const product = page.createElement('select');
  product.setAttribute('aria-label', 'Loại sản phẩm TeePublic');
  for (const item of PRODUCTS) {
    const option = page.createElement('option');
    option.value = item.value; option.textContent = item.label; product.append(option);
  }
  content.append(product);
  const links = [];
  for (const [mode, label] of [['tags', 'Trending Tags'], ['best-sellers', 'Best Sellers'], ['trending-today', 'Trending Today']]) {
    const link = page.createElement('a');
    link.textContent = label;
    link.href = getResearchUrl(mode, product.value);
    content.append(link); links.push({ link, mode });
  }
  product.addEventListener('change', () => {
    for (const { link, mode } of links) link.href = getResearchUrl(mode, product.value);
  });
  const hint = page.createElement('small');
  hint.textContent = 'Chọn mục để tới đúng trang. Bật Tự spy trong extension để quét sau khi tải.';
  content.append(hint);
  aside.append(toggle, content);
  root.append(aside);
  page.documentElement.append(host);
}
