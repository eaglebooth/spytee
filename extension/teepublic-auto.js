/* global chrome */
(async () => {
  try {
    const [{ scanTeePublicPage }, { summarizeScan }, { showTeePublicPanel }, { startAutoScan }, { mountResearchLauncher }] = await Promise.all([
      import(chrome.runtime.getURL('scan.mjs')),
      import(chrome.runtime.getURL('research.mjs')),
      import(chrome.runtime.getURL('panel.mjs')),
      import(chrome.runtime.getURL('auto-controller.mjs')),
      import(chrome.runtime.getURL('launcher.mjs')),
    ]);
    const mount = () => {
      if (!/just a moment|security verification|verify you are human|access denied/i.test(document.title + ' ' + (document.querySelector('h1')?.textContent || ''))) mountResearchLauncher();
    };
    mount();
    startAutoScan({ scan: () => { mount(); return scanTeePublicPage(); }, summarize: summarizeScan, show: showTeePublicPanel, storage: chrome.storage });
  } catch (error) {
    console.warn('SPYTEE: hãy Reload extension và tải lại trang TeePublic.', error.message);
  }
})();
