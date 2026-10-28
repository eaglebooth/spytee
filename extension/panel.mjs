// Runs in Chrome's isolated world. Shadow DOM keeps page styles and scan selectors separate.
export function showTeePublicPanel(scan, summary) {
  if (!['www.teepublic.com', 'teepublic.com'].includes(location.hostname)) {
    throw new Error('Hay mo trang TeePublic de xem bang SPYTEE.');
  }
  if (scan.sourceUrl !== location.href) {
    throw new Error('Trang da thay doi. Bam Quet trang hien tai de cap nhat.');
  }
  document.getElementById('spytee-teepublic-panel')?.remove();
  const host = document.createElement('div');
  host.id = 'spytee-teepublic-panel';
  host.style.cssText = 'all:initial;position:fixed;top:16px;right:16px;width:min(390px,calc(100vw - 32px));z-index:2147483647;display:block;color-scheme:light;';
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host{font:14px/1.5 system-ui,sans-serif;color:#0f172a}*{box-sizing:border-box}
    .panel{font:14px/1.5 system-ui,sans-serif;color:#0f172a;background:#fff;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 12px 48px #0f172a40;overflow:hidden}
    header{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#0f172a;color:#fff}
    header strong{font-size:18px;color:#5eead4}header span{flex:1;font-size:12px}
    button,input{font:inherit}button{border:1px solid #cbd5e1;border-radius:6px;padding:5px 9px;background:#f8fafc;color:#0f172a;cursor:pointer}
    header button{background:#1e293b;color:#fff;border-color:#475569}
    .content{padding:14px;max-height:calc(100vh - 105px);overflow:auto}
    .counts{display:flex;gap:8px}.count{flex:1;background:#f1f5f9;padding:8px;border-radius:8px;font-size:11px}.count b{display:block;font-size:21px}
    p{margin:8px 0}h3{font-size:14px;margin:16px 0 6px}small,.note{font-size:11px;color:#64748b}
    ol{margin:6px 0;padding-left:24px}li{padding:4px 0;overflow-wrap:anywhere}a{color:#0f766e;text-decoration:underline}
    input{padding:7px;border:1px solid #cbd5e1;border-radius:6px;width:100%;margin:8px 0}
    .tags{display:flex;flex-wrap:wrap;gap:5px}.tag{background:#ecfdf5;color:#065f46;border-radius:5px;padding:3px 7px;font-size:12px}
    .source{overflow-wrap:anywhere}.status{color:#0f766e;font-size:12px}.note{padding-top:10px;border-top:1px solid #e2e8f0}
    [hidden]{display:none!important}
  `;
  root.append(style);
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const panel = element('section', undefined, 'panel');
  panel.setAttribute('aria-label', 'SPYTEE TeePublic Research');
  const header = element('header');
  header.append(element('strong', 'SPYTEE'), element('span', 'TeePublic Research'));
  const collapse = element('button', 'Thu gọn');
  collapse.setAttribute('aria-expanded', 'true');
  const close = element('button', 'Đóng');
  close.setAttribute('aria-label', 'Đóng bảng SPYTEE');
  header.append(collapse, close);
  const content = element('div', undefined, 'content');
  collapse.addEventListener('click', () => {
    content.hidden = !content.hidden;
    collapse.textContent = content.hidden ? 'Mở rộng' : 'Thu gọn';
    collapse.setAttribute('aria-expanded', String(!content.hidden));
  });
  close.addEventListener('click', () => host.remove());
  const counts = element('div', undefined, 'counts');
  for (const [label, value] of [['Thiết kế', summary.designs], ['Tag', summary.topTags.length], ['Người bán', summary.authors.length]]) {
    const count = element('div', undefined, 'count');
    count.append(element('b', String(value)), element('span', label));
    counts.append(count);
  }
  content.append(counts, element('p', new Date(scan.scannedAt).toLocaleString('vi-VN'), 'source'));
  content.append(element('h3', scan.kind === 'tags' ? 'Trending Tags từ Tag Directory' : 'Top Tags trong mẫu đã quét'));
  const tags = element('div', undefined, 'tags');
  for (const item of summary.topTags.slice(0, 30)) {
    tags.append(element('span', item.rank ? `#${item.rank} ${item.tag}` : `${item.tag} (${item.count})`, 'tag'));
  }
  if (!summary.topTags.length) {
    tags.append(element('p', 'Chưa đọc được tag. Mở chi tiết thiết kế rồi bấm quét lại.'));
  }
  content.append(tags);
  const copy = element('button', 'Copy Top Tags');
  copy.disabled = summary.topTags.length === 0;
  const status = element('p', '', 'status');
  status.setAttribute('role', 'status');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summary.topTags.slice(0, 30).map((item) => item.tag).join(', '));
      status.textContent = 'Đã copy Top Tags.';
    } catch { status.textContent = 'Trình duyệt chưa cho phép copy. Bạn có thể chọn và sao chép tag trên bảng.'; }
  });
  content.append(copy, status);
  if (scan.kind === 'tags') {
    content.append(element('p', 'Đây là thứ tự tag trong Tag Directory của TeePublic, không phải lượt tìm kiếm.', 'note'));
    panel.append(header, content);
    root.append(panel);
    document.documentElement.append(host);
    return { shown: true };
  }
  content.append(element('h3', 'Người bán đọc được'));
  const authors = element('ol');
  summary.authors.slice(0, 10).forEach((item) => authors.append(element('li', `${item.author}: ${item.count} thiết kế`)));
  if (!summary.authors.length) authors.append(element('li', 'Chưa đọc được thông tin người bán.'));
  const group = element('select');
  group.setAttribute('aria-label', 'Chọn nhóm sản phẩm');
  for (const [value, label] of [['all', 'Tất cả sản phẩm'], ['best-sellers', 'Best Sellers'], ['trending-today', 'Trending Today']]) {
    const option = element('option', label);
    option.value = value;
    group.append(option);
  }
  const requested = new URLSearchParams(location.hash.slice(1)).get('spytee');
  group.value = ['best-sellers', 'trending-today'].includes(requested) ? requested : 'all';
  content.append(authors, element('h3', 'Sản phẩm trên trang'), group);
  const filter = element('input');
  filter.type = 'search';
  filter.placeholder = 'Lọc sản phẩm, người bán, tag...';
  filter.setAttribute('aria-label', 'Lọc sản phẩm SPYTEE');
  const products = element('ol');
  const renderProducts = () => {
    products.replaceChildren();
    const matches = scan.products.filter((item) => (group.value === 'all' || item.section === group.value)
      && [item.title, item.author, item.mainTag, ...item.tags].join(' ').toLowerCase().includes(filter.value.toLowerCase()));
    for (const item of matches) {
      const li = element('li');
      let safe = false;
      try {
        const url = new URL(item.url);
        safe = url.protocol === 'https:' && ['www.teepublic.com', 'teepublic.com'].includes(url.hostname);
      } catch { /* Display the title as text when the URL is invalid. */ }
      const title = element(safe ? 'a' : 'span', item.title);
      if (safe) { title.href = item.url; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
      li.append(title);
      if (item.author) li.append(element('div', `by ${item.author}`));
      if (item.mainTag) li.append(element('div', `Main Tag: ${item.mainTag}`));
      if (item.tags.length) li.append(element('small', item.tags.join(', ')));
      products.append(li);
    }
    if (!matches.length) products.append(element('li', group.value !== 'all' && !scan.products.some((item) => item.section === group.value)
      ? 'Chưa đọc được nhóm này trên trang. Đợi trang tải đủ hoặc chuyển sang Tất cả sản phẩm; SPYTEE không tự đoán nhóm.'
      : 'Không có sản phẩm phù hợp.'));
  };
  filter.addEventListener('input', renderProducts);
  group.addEventListener('change', renderProducts);
  renderProducts();
  content.append(filter, products, element('p', 'Dữ liệu chỉ từ trang vừa quét. Để cập nhật: cuộn tải thêm sản phẩm rồi bấm icon SPYTEE → Quét trang hiện tại. Tần suất tag không phải lượt tìm kiếm hoặc doanh số.', 'note'));
  panel.append(header, content);
  root.append(panel);
  document.documentElement.append(host);
  if (group.value !== 'all') {
    [...document.querySelectorAll('h1,h2,h3,h4')].find((node) => node.textContent.trim().toLowerCase()
      === (group.value === 'best-sellers' ? 'best sellers' : 'trending today'))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return { shown: true };
}
