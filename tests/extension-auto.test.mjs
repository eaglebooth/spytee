import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startAutoScan } from '../extension/auto-controller.mjs';
import { getResearchUrl } from '../extension/navigation.mjs';

const sleep = () => new Promise((resolve) => setTimeout(resolve, 25));

test('all four product types have shortcuts for all three modes', () => {
  for (const product of ['t-shirts', 'hoodie', 'stickers', 'mug']) {
    for (const mode of ['tags', 'best-sellers', 'trending-today']) {
      const url = new URL(getResearchUrl(mode, product));
      assert.equal(url.origin, 'https://www.teepublic.com');
      assert.equal(url.hash, '#spytee=' + mode);
    }
  }
  assert.throws(() => getResearchUrl('tags', '//other.example'));
  assert.throws(() => getResearchUrl('unknown', 't-shirts'));
});

test('auto scanner waits for content, avoids duplicate snapshots, respects preference and stops', async () => {
  const originalObserver = globalThis.MutationObserver;
  let observer;
  globalThis.MutationObserver = class {
    constructor(callback) { this.callback = callback; observer = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const listeners = new Set();
  const storageData = { spyteeAutoScan: true, spyteeTeepublicScans: [] };
  const storage = {
    local: {
      async get(key) { return { [key]: storageData[key] }; },
      async set(values) { Object.assign(storageData, values); },
    },
    onChanged: { addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); } },
  };
  const page = { visibilityState: 'visible', body: {}, addEventListener() {}, removeEventListener() {}, getElementById() { return null; } };
  const pageWindow = { addEventListener() {}, removeEventListener() {} };
  let ready = false;
  let revision = 1;
  let shown = 0;
  const stop = startAutoScan({ storage, page, pageWindow, delayMs: 1,
    scan() {
      if (!ready) throw new Error('Page verification');
      return { sourceUrl: 'https://www.teepublic.com/t-shirts', products: [{ id: revision }] };
    }, summarize() { return {}; }, show() { shown += 1; },
  });
  const mutate = () => observer.callback([{ target: {}, addedNodes: [{}], removedNodes: [] }]);
  try {
    await sleep();
    assert.equal(storageData.spyteeTeepublicScans.length, 0);
    ready = true;
    mutate(); await sleep();
    assert.equal(shown, 1);
    mutate(); await sleep();
    assert.equal(storageData.spyteeTeepublicScans.length, 1);
    for (const fn of listeners) fn({ spyteeAutoScan: { newValue: false } }, 'local');
    revision = 2;
    mutate(); await sleep();
    assert.equal(shown, 1);
    for (const fn of listeners) fn({ spyteeAutoScan: { newValue: true } }, 'local');
    await sleep();
    assert.equal(shown, 2);
    assert.equal(storageData.spyteeTeepublicScans.length, 2);
    stop(); mutate(); await sleep();
    assert.equal(shown, 2);
    assert.equal(listeners.size, 0);
    assert.equal(observer.disconnected, true);
  } finally { stop(); globalThis.MutationObserver = originalObserver; }
});
