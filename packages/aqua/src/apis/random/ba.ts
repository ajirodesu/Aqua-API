import axios from 'axios';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

const LINKS_URL =
  'https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json';
const CACHE_TTL_MS = 30 * 60 * 1000;

/** Cached list of image URLs — refreshed at most once per 30 minutes. */
let cachedLinks: string[] | null = null;
let cacheExpiresAt = 0;

async function getLinks(): Promise<string[]> {
  if (cachedLinks && Date.now() < cacheExpiresAt) {
    return cachedLinks;
  }

  const { data } = await axios.get<string[]>(LINKS_URL);
  cachedLinks = data;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedLinks;
}

export const meta: ApiMeta = {
  name: 'Blue Archive',
  desc: 'Blue Archive random image',
  method: 'get',
  category: 'random',
};

export async function initialize(ctx: EndpointCtx) {
  const { set } = ctx;
  try {
    const data = await getLinks();

    const imageUrl = data[Math.floor(Math.random() * data.length)];
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imgBuffer = Buffer.from(response.data);

    return new Response(new Uint8Array(imgBuffer), { status: 200, headers: { 'content-type': 'image/png' } });
  } catch (error) {
    set.status = 500;
    return { status: false, error: (error as Error).message };
  }
};
