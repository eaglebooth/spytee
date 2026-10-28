import { scanTeePublicPage } from './scan.mjs';
import { summarize, toCsv } from './research.mjs';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'spyteeTeepublicScans';
let current = null;
let history = [];

function status(text, error = false) {
  $('status').textContent = text;
  $('status').dataset.error = String(error);
}

function render(scan) {
  current = scan;
  const summary = summarize(scan.products);
  $('result').hidden = false;
  $('summary').textContent = `${scan.products.length} vị trí / ${summary.designs} thiết kế riêng biệt`;
  $('source').textContent = `${new Date(scan.scannedAt).toLocaleString('vi-VN')} - ${scan.sourceUrl}`;
  for (const [id, entries, getLabel] of [
    ['tags', summary.topTags.slice(0, 30), (item) => `${item.tag}: ${item.count} thiết kế`],
    ['authors', summary.authors.slice(0, 10), (item) => `${item.author}: ${item.count} thiết kế`],
  ]) {
    $(id).replaceChildren();
    for (const entry of entries) {
      const li = document.createElement('li');
      li.textContent = getLabel(entry);
      $(id).append(li);
    }
  }
  status(summary.topTags.length ? 'Đã quét xong.' : 'Đã lấy sản phẩm; chưa đọc được tag. Mở trang chi tiết thiết kế rồi quét để lấy thêm tag.');
}

function renderHistory() {
  $('history').replaceChildren(new Option('Chọn phiên quét', ''));
  history.forEach((scan, index) => {
    $('history').append(new Option(`${new Date(scan.scannedAt).toLocaleString('vi-VN')} - ${scan.products.length} mục`, String(index)));
  });
}

$('scan').addEventListener('click', async () => {
  $('scan').disabled = true;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanTeePublicPage,
    });
    if (!result?.products?.length) throw new Error('Không đọc được dữ liệu TeePublic.');
    history = [result, ...history].slice(0, 30);
    await chrome.storage.local.set({ [STORAGE_KEY]: history });
    renderHistory();
    render(result);
  } catch (error) {
    status(error.message, true);
  } finally {
    $('scan').disabled = false;
  }
});

function download(body, type, suffix) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `spytee-teepublic-${current.scannedAt.replace(/[:.]/g, '-')}.${suffix}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

$('json').addEventListener('click', () => current && download(JSON.stringify(current, null, 2), 'application/json', 'json'));
$('csv').addEventListener('click', () => current && download('\uFEFF' + toCsv(current.products), 'text/csv;charset=utf-8', 'csv'));
$('history').addEventListener('change', () => {
  if ($('history').value !== '') render(history[Number($('history').value)]);
});
$('clear').addEventListener('click', async () => {
  if (!confirm('Xóa tất cả phiên quét đã lưu trong extension?')) return;
  await chrome.storage.local.remove(STORAGE_KEY);
  history = [];
  current = null;
  renderHistory();
  $('result').hidden = true;
  status('Đã xóa lịch sử.');
});

try {
  history = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || [];
  renderHistory();
  if (history[0]) render(history[0]);
} catch (error) {
  status(error.message, true);
}
