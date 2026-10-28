export function summarize(products) {
  const tags = new Map();
  const authors = new Map();
  const designs = new Map(products.map((item) => [item.id || item.url, item]));
  for (const item of designs.values()) {
    const uniqueTags = new Map([item.mainTag, ...item.tags].filter(Boolean)
      .map((tag) => [tag.toLowerCase(), tag]));
    for (const [key, label] of uniqueTags) {
      const entry = tags.get(key) || { tag: label, count: 0 };
      entry.count += 1;
      tags.set(key, entry);
    }
    if (item.author) authors.set(item.author, (authors.get(item.author) || 0) + 1);
  }
  return {
    designs: designs.size,
    topTags: [...tags.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    authors: [...authors].map(([author, count]) => ({ author, count })).sort((a, b) => b.count - a.count),
  };
}

export function toCsv(products) {
  // Spreadsheet applications interpret these leading characters as formulas.
  const cell = (value) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [['section', 'rank', 'title', 'author', 'mainTag', 'tags', 'url'],
    ...products.map((p) => [p.section, p.rank, p.title, p.author, p.mainTag, p.tags.join(' | '), p.url])]
    .map((row) => row.map(cell).join(',')).join('\r\n');
}
