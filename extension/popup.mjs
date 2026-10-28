import { scanTeePublicPage } from './scan.mjs';
import { summarizeScan, toCsv } from './research.mjs';
import { showTeePublicPanel } from './panel.mjs';
import { getResearchUrl } from './navigation.mjs';

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
  const summary = summarizeScan(scan);
  $('result').hidden = false;
  $('summary').textContent = scan.kind === 'tags' ? `${scan.directoryTags.length} tag trong Tag Directory` : `${scan.products.length} vị trí / ${summary.designs} thiết kế riêng biệt`;
  $('source').textContent = `${new Date(scan.scannedAt).toLocaleString('vi-VN')} - ${scan.sourceUrl}`;
  for (const [id, entries, getLabel] of [
    ['tags', summary.topTags.slice(0, 30), (item) => item.rank ? `#${item.rank} ${item.tag}` : `${item.tag}: ${item.count} thiết kế`],
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
    $('history').append(new Option(`${new Date(scan.scannedAt).toLocaleString('vi-VN')} - ${scan.kind === 'tags' ? scan.directoryTags.length + ' tag' : scan.products.length + ' sản phẩm'}`, String(index)));
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
    if (!result?.products?.length && !result?.directoryTags?.length) throw new Error('Không đọc được dữ liệu TeePublic.');
    history = [result, ...history].slice(0, 30);
    await chrome.storage.local.set({ [STORAGE_KEY]: history });
    renderHistory();
    render(result);
    const panelResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showTeePublicPanel,
      args: [result, summarizeScan(result)],
    });
    if (!panelResults[0]?.result?.shown) throw new Error('Đã lưu kết quả; chưa mở được bảng. Hãy quét lại trang hiện tại.');
    status('Đã hiển thị bảng SPYTEE ngay trên trang TeePublic.');
  } catch (error) {
    status(error.message, true);
  } finally {
    $('scan').disabled = false;
  }
});

$('show-panel').addEventListener('click', async () => {
  if (!current) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id }, func: showTeePublicPanel,
      args: [current, summarizeScan(current)],
    });
    if (!results[0]?.result?.shown) throw new Error('Hãy quét lại trang hiện tại để hiển thị bảng.');
    status('Đã mở bảng trên trang TeePublic.');
  } catch (error) { status(error.message, true); }
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
$('open-dashboard').addEventListener('click', async () => {
  try {
    await chrome.tabs.create({ url: 'https://spytee.vercel.app/teepublic-extension' });
  } catch (error) { status(error.message, true); }
});
$('csv').addEventListener('click', () => current && download('\uFEFF' + toCsv(current.products, current.directoryTags), 'text/csv;charset=utf-8', 'csv'));
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
  const preferences = await chrome.storage.local.get(['spyteeAutoScan', 'spyteeProduct']);
  $('auto-scan').checked = preferences.spyteeAutoScan !== false;
  $('product').value = preferences.spyteeProduct || 't-shirts';
  history = (await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY] || [];
  renderHistory();
  if (history[0]) render(history[0]);
} catch (error) {
  status(error.message, true);
}

$('auto-scan').addEventListener('change', async () => {
  try { await chrome.storage.local.set({ spyteeAutoScan: $('auto-scan').checked }); }
  catch (error) { status(error.message, true); }
});
document.querySelectorAll('[data-research]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      const product = $('product').value;
      const url = getResearchUrl(button.dataset.research, product);
      await chrome.storage.local.set({ spyteeProduct: product });
      await chrome.tabs.create({ url });
    } catch (error) { status(error.message, true); }
  });
});
