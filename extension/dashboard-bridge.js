/* global chrome */
// Only the SPYTEE origin (or local development) can request the latest local scan.
(() => {
  const trusted = location.origin === 'https://spytee.vercel.app'
    || (location.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(location.hostname));
  if (!trusted) return;
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.type !== 'SPYTEE_SCAN_REQUEST_V1' || typeof message.requestId !== 'string'
      || message.requestId.length > 80) return;
    const reply = { type: 'SPYTEE_SCAN_RESPONSE_V1', requestId: message.requestId };
    try {
      const saved = await chrome.storage.local.get('spyteeTeepublicScans');
      const latest = saved.spyteeTeepublicScans?.[0];
      if (!latest || latest.source !== 'teepublic' || !Array.isArray(latest.products)) {
        reply.error = 'Chưa có phiên quét. Mở TeePublic và bấm icon SPYTEE → Quét trang hiện tại trước.';
      } else reply.scan = latest;
    } catch {
      reply.error = 'Extension đã cập nhật hoặc bị ngắt. Hãy tải lại trang SPYTEE và thử lại.';
    }
    window.postMessage(reply, location.origin);
  });
})();
