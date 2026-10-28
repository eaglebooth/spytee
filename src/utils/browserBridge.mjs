export function requestBrowserScan(targetWindow = window, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const cleanup = () => {
      clearTimeout(timer);
      targetWindow.removeEventListener('message', receive);
    };
    const receive = (event) => {
      if (event.source !== targetWindow || event.origin !== targetWindow.location.origin
        || event.data?.type !== 'SPYTEE_SCAN_RESPONSE_V1' || event.data.requestId !== requestId) return;
      cleanup();
      if (event.data.error) reject(new Error(String(event.data.error).slice(0, 500)));
      else if (event.data.scan) resolve(event.data.scan);
      else reject(new Error('Extension chưa cung cấp phiên quét hợp lệ.'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Không kết nối được extension. Cài/cập nhật SPYTEE 0.3 rồi tải lại trang này.'));
    }, timeoutMs);
    targetWindow.addEventListener('message', receive);
    try {
      targetWindow.postMessage({ type: 'SPYTEE_SCAN_REQUEST_V1', requestId }, targetWindow.location.origin);
    } catch (error) { cleanup(); reject(error); }
  });
}
