export default async function handler(request, response) {
  const query = request.query.q;

  if (!query) {
    response.status(400).json({ error: 'Missing query.' });
    return;
  }

  const url = new URL('https://search.brave.com/search');
  url.searchParams.set('q', query);
  url.searchParams.set('source', request.query.source || 'web');
  if (request.query.offset) url.searchParams.set('offset', request.query.offset);

  try {
    const upstream = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    const body = await upstream.text();

    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.status(upstream.ok ? 200 : upstream.status).send(body);
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
}
