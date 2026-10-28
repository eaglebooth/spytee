import { proxyTeePublic } from '../lib/teepublicSource.mjs';

export default async function handler(request, response) {
  await proxyTeePublic('tag-directory', response);
}
