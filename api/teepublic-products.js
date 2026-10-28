import { proxyTeePublic } from '../lib/teepublicSource.mjs';

const allowedProducts = new Set(['t-shirts', 'hoodie', 'stickers', 'mug']);

export default async function handler(request, response) {
  const product = request.query.product;
  if (!allowedProducts.has(product)) {
    response.status(400).json({ error: 'Invalid TeePublic product type.' });
    return;
  }
  await proxyTeePublic(product, response);
}
