import { test } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { assertTeePublicSource, proxyTeePublic } from '../lib/teepublicSource.mjs';
import { parseBestSellers, parseTrendingToday, parseTrendingTags, fetchTrendingToday } from '../src/api/teepublic.js';

const challenge = 'Title: Just a moment...\n\n## Performing security verification\nThis website uses a security service.';
const card = (id, name, tag) => [
  `[![Image 1: ${name}](https://images.teepublic.com/example.jpg)](https://www.teepublic.com/t-shirt/${id}-design)`,
  `Tags: ${tag}`,
  `## [${name}](https://www.teepublic.com/t-shirt/${id}-design)`,
  '', 'by ExampleArtist',
].join('\n');
const page = `## Best Sellers\n${card(11, 'First design', 'first')}\n## Trending Today\n${card(22, 'Second design', 'second')}\n## More Categories\n${card(33, 'Not trending', 'excluded')}`;

test('challenge pages never become empty successful product or tag scans', () => {
  for (const parser of [parseBestSellers, parseTrendingToday, parseTrendingTags]) {
    assert.throws(() => parser(challenge, 't-shirts'), { code: 'TEEPUBLIC_VERIFICATION_REQUIRED' });
  }
});

test('successful HTTP challenge is reported as 503 JSON and not cached', async () => {
  const response = mockResponse();
  await proxyTeePublic('t-shirts', response, async () => ({ ok: true, status: 200, text: async () => challenge }));
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'TEEPUBLIC_VERIFICATION_REQUIRED');
  assert.equal(response.headers['Cache-Control'], 'no-store');
});

test('real markdown passes through proxy intact', async () => {
  const response = mockResponse();
  await proxyTeePublic('t-shirts', response, async (url) => {
    assert.equal(url, 'https://r.jina.ai/https://www.teepublic.com/t-shirts');
    return { ok: true, status: 200, text: async () => page };
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body, page);
});

test('source rate limiting and network errors stay errors', async () => {
  const limited = mockResponse();
  await proxyTeePublic('t-shirts', limited, async () => ({ ok: false, status: 429, text: async () => 'Too many requests' }));
  assert.equal(limited.statusCode, 429);
  const offline = mockResponse();
  await proxyTeePublic('t-shirts', offline, async () => { throw new Error('network'); });
  assert.equal(offline.statusCode, 502);
});

test('section boundaries keep Best Sellers, Trending Today and recommendations separate', () => {
  const best = parseBestSellers(page, 't-shirts');
  const today = parseTrendingToday(page, 't-shirts');
  assert.equal(best.length, 1);
  assert.equal(today.length, 1);
  assert.match(best[0].url, /11-design/);
  assert.match(today[0].url, /22-design/);
  assert.deepEqual(best[0].relatedTags, ['first']);
  assert.deepEqual(today[0].relatedTags, ['second']);
  assert.equal(today[0].author, 'ExampleArtist');
  assert.equal(today[0].mainTag, '');
});

test('unlabelled product lists are never divided into guessed 16/28 sections', () => {
  const unlabelled = Array.from({ length: 44 }, (_, index) => card(index + 1, 'Design', 'tag')).join('\n');
  assert.throws(() => parseBestSellers(unlabelled, 't-shirts'), /không có nhãn/);
  assert.throws(() => parseTrendingToday(unlabelled, 't-shirts'), /không có nhãn/);
});

test('Main Tag is read explicitly, never inferred from description', () => {
  const source = `## Trending Today\n${card(23, 'Explicit', 'tag')}\nDescription: Not a tag\nMain Tag: [Cat](https://www.teepublic.com/t-shirts/cat)\n## More Categories`;
  assert.equal(parseTrendingToday(source, 't-shirts')[0].mainTag, 'Cat');
  assert.equal(parseTrendingToday(page, 't-shirts')[0].mainTag, '');
});

test('headings and card links support common markdown variants', () => {
  const variant = `Trending Today\n--------------\n${card(41, 'Variant', 'tag')}\n### More Categories`;
  assert.equal(parseTrendingToday(variant, 't-shirts')[0].title, 'Variant');
});

test('client surfaces the server verification message rather than generic Axios 503', async () => {
  const original = axios.defaults.adapter;
  axios.defaults.adapter = async () => {
    const error = new Error('Request failed with status code 503');
    error.response = { data: JSON.stringify({ error: 'TeePublic đang yêu cầu xác minh Cloudflare.' }) };
    throw error;
  };
  try { await assert.rejects(fetchTrendingToday('t-shirts'), /yêu cầu xác minh Cloudflare/); }
  finally { axios.defaults.adapter = original; }
});

test('React HTML fallback is an API error', () => {
  assert.throws(() => assertTeePublicSource('<!doctype html><div id="root"></div>'), /API đang trả về/);
});

function mockResponse() {
  return {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; },
    send(body) { this.body = body; },
  };
}
