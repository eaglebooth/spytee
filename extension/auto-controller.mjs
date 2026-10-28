export function startAutoScan({ scan, summarize, show, storage, page = document, pageWindow = window, delayMs = 1200 }) {
  let enabled = true;
  let stopped = false;
  let timer;
  let busy = false;
  let fingerprint = '';
  const run = async () => {
    timer = undefined;
    if (stopped || !enabled || busy || page.visibilityState === 'hidden') return;
    busy = true;
    try {
      const result = scan();
      const nextFingerprint = JSON.stringify([result.sourceUrl, result.products, result.directoryTags]);
      if (fingerprint === nextFingerprint) return;
      const saved = await storage.local.get('spyteeTeepublicScans');
      if (stopped || !enabled) return;
      const history = Array.isArray(saved.spyteeTeepublicScans) ? saved.spyteeTeepublicScans : [];
      const next = [result, ...history].slice(0, 30);
      await storage.local.set({ spyteeTeepublicScans: next });
      if (stopped || !enabled) return;
      show(result, summarize(result));
      fingerprint = nextFingerprint;
    } catch {
      // Challenge or incomplete page: wait for a real DOM change, never reload or solve it.
    } finally { busy = false; }
  };
  const schedule = () => {
    if (!stopped && enabled && timer === undefined) timer = setTimeout(run, delayMs);
  };
  const observer = new MutationObserver((mutations) => {
    const changed = mutations.some((mutation) => {
      if (mutation.target.id === 'spytee-teepublic-panel') return false;
      return [...mutation.addedNodes, ...mutation.removedNodes].some((node) => node.id !== 'spytee-teepublic-panel');
    });
    if (changed) schedule();
  });
  const preferenceChanged = (changes, area) => {
    if (area !== 'local' || !changes.spyteeAutoScan) return;
    enabled = changes.spyteeAutoScan.newValue !== false;
    if (enabled) schedule();
    else page.getElementById('spytee-teepublic-panel')?.remove();
  };
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
    observer.disconnect();
    storage.onChanged.removeListener(preferenceChanged);
    page.removeEventListener('visibilitychange', schedule);
    pageWindow.removeEventListener('hashchange', viewChanged);
    pageWindow.removeEventListener('pagehide', stop);
  };
  const viewChanged = () => { fingerprint = ''; schedule(); };
  storage.onChanged.addListener(preferenceChanged);
  page.addEventListener('visibilitychange', schedule);
  pageWindow.addEventListener('hashchange', viewChanged);
  pageWindow.addEventListener('pagehide', stop, { once: true });
  storage.local.get('spyteeAutoScan').then((saved) => {
    enabled = saved.spyteeAutoScan !== false;
    if (!stopped) { observer.observe(page.body, { childList: true, subtree: true }); schedule(); }
  }).catch(stop);
  return stop;
}
