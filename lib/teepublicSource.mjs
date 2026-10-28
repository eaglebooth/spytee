export function assertTeePublicSource(body) {
  const text = String(body);
  if (/^Title:\s*(?:Just a moment|Access denied)/im.test(text)
    || /^#{1,6}\s+(?:Performing security verification|Verify you are human)/im.test(text)
    || /Warning:.*(?:CAPTCHA|error 403)/i.test(text)) {
    const error = new Error('TeePublic đang yêu cầu xác minh Cloudflare nên máy chủ chưa lấy được dữ liệu mới. Hãy dùng extension trên trang TeePublic hoặc xem lịch sử quét.');
    error.code = 'TEEPUBLIC_VERIFICATION_REQUIRED';
    throw error;
  }
  if (/<!doctype html/i.test(text) && /id=["']root["']/i.test(text)) {
    throw new Error('API đang trả về trang web thay vì dữ liệu TeePublic.');
  }
  return text;
}

export async function proxyTeePublic(path, response, fetchImpl = fetch) {
  response.setHeader('Cache-Control', 'no-store');
  try {
    const upstream = await fetchImpl(`https://r.jina.ai/https://www.teepublic.com/${path}`, {
      signal: AbortSignal.timeout(25000),
    });
    const body = await upstream.text();
    assertTeePublicSource(body);
    if (!upstream.ok) {
      response.status(upstream.status === 429 ? 429 : 502).json({
        code: 'TEEPUBLIC_SOURCE_UNAVAILABLE',
        error: 'Nguồn TeePublic tạm thời chưa truy cập được. Vui lòng thử lại sau hoặc dùng extension.',
      });
      return;
    }
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.status(200).send(body);
  } catch (error) {
    const blocked = error.code === 'TEEPUBLIC_VERIFICATION_REQUIRED';
    response.status(blocked ? 503 : 502).json({
      code: blocked ? error.code : 'TEEPUBLIC_SOURCE_UNAVAILABLE',
      error: blocked ? error.message : 'Không kết nối được nguồn TeePublic. Vui lòng thử lại sau hoặc dùng extension.',
    });
  }
}
