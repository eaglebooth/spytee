const allowedProducts = new Set(['t-shirts', 'hoodie', 'stickers', 'mug']);

export default async function handler(request, response) {
  const product = request.query.product;

  if (!allowedProducts.has(product)) {
    response.status(400).json({ error: 'Invalid TeePublic product type.' });
    return;
  }

  try {
    const upstream = await fetch(`https://r.jina.ai/http://www.teepublic.com/${product}`);
    const body = await upstream.text();

    response.setHeader('content-type', 'text/plain; charset=utf-8');
    response.status(upstream.ok ? 200 : upstream.status).send(body);
  } catch (error) {
    response.status(502).json({ error: error.message });
  }
}
