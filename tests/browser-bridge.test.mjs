import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { requestBrowserScan } from '../src/utils/browserBridge.mjs';
import { validateScan } from '../src/utils/extensionImport.mjs';

const bridgeSource = readFileSync(new URL('../extension/dashboard-bridge.js', import.meta.url), 'utf8');
const scan = {
  schemaVersion: 1, source: 'teepublic', sourceUrl: 'https://www.teepublic.com/t-shirts',
  pageTitle: 'Example', scannedAt: '2026-10-28T00:00:00.000Z',
  products: [{ id: '100', title: 'Design', author: '', mainTag: '', tags: ['example'],
    section: 'page', rank: 1, type: 't-shirt', url: 'https://www.teepublic.com/t-shirt/100-design' }],
};

function fakeWindow(url = 'https://spytee.vercel.app/teepublic-extension') {
  const listeners = new Set();
  const win = {
    location: new URL(url), listeners,
    addEventListener(type, fn) { if (type === 'message') listeners.add(fn); },
    removeEventListener(type, fn) { if (type === 'message') listeners.delete(fn); },
    dispatch(event) { for (const fn of [...listeners]) fn(event); },
    postMessage(data, origin) {
      assert.equal(origin, win.location.origin);
      queueMicrotask(() => win.dispatch({ data, source: win, origin }));
    },
  };
  return win;
}

function installBridge(win, get) {
  vm.runInNewContext(bridgeSource, {
    window: win, location: win.location,
    chrome: { storage: { local: { get } } },
  });
}

test('transfers only latest scan, preserves original date, removes request listener', async () => {
  const win = fakeWindow();
  installBridge(win, async (key) => {
    assert.equal(key, 'spyteeTeepublicScans');
    return { spyteeTeepublicScans: [scan, { ...scan, pageTitle: 'older' }] };
  });
  const received = validateScan(await requestBrowserScan(win));
  assert.equal(received.scannedAt, scan.scannedAt);
  assert.equal(received.pageTitle, scan.pageTitle);
  assert.equal(received.products.length, 1);
  assert.equal(win.listeners.size, 1);
});

test('no stored scan produces actionable error, no invented data', async () => {
  const win = fakeWindow();
  installBridge(win, async () => ({}));
  await assert.rejects(requestBrowserScan(win), /Chưa có phiên quét/);
  assert.equal(win.listeners.size, 1);
});

test('website without extension times out and cleans up', async () => {
  const win = fakeWindow();
  await assert.rejects(requestBrowserScan(win, 10), /Không kết nối được extension/);
  assert.equal(win.listeners.size, 0);
});

test('foreign origin and iframe messages cannot read extension storage', async () => {
  const win = fakeWindow();
  let reads = 0;
  installBridge(win, async () => { reads += 1; return {}; });
  const data = { type: 'SPYTEE_SCAN_REQUEST_V1', requestId: 'abc' };
  win.dispatch({ data, source: win, origin: 'https://other.example' });
  win.dispatch({ data, source: {}, origin: win.location.origin });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(reads, 0);
});

test('bridge does not install on a lookalike dashboard domain', () => {
  const win = fakeWindow('https://spytee.vercel.app.other.example/');
  installBridge(win, async () => ({}));
  assert.equal(win.listeners.size, 0);
});

test('spoofed response ID and origin cannot replace requested result', async () => {
  const win = fakeWindow();
  const pending = requestBrowserScan(win, 100);
  win.dispatch({ data: { type: 'SPYTEE_SCAN_RESPONSE_V1', requestId: 'wrong', scan: {} }, source: win, origin: win.location.origin });
  installBridge(win, async () => ({ spyteeTeepublicScans: [scan] }));
  const received = await pending;
  assert.equal(received.scannedAt, scan.scannedAt);
});

test('storage failures return useful update/reload message', async () => {
  const win = fakeWindow();
  installBridge(win, async () => { throw new Error('context invalidated'); });
  await assert.rejects(requestBrowserScan(win), /tải lại trang SPYTEE/);
});
