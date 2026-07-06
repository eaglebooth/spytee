export default async function handler(request, response) {
  try {
    const upstream = await fetch('https://r.jina.ai/http://www.teepublic.com/tag-directory');
    const body = await upstream.text();

    response.setHeader('content-type', 'text/plain; charset=utf-8');
    response.status(upstream.ok ? 200 : upstream.status).send(body);
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
}
