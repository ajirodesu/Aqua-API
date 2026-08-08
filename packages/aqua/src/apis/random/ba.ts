import axios from 'axios';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Blue Archive',
  desc: 'Blue Archive random image',
  method: 'get',
  category: 'random',
};

export async function initialize(ctx: EndpointCtx) {
  const { set } = ctx;
  try {
    const { data } = await axios.get<string[]>(
      'https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json'
    );

    const imageUrl = data[Math.floor(Math.random() * data.length)];
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imgBuffer = Buffer.from(response.data);

    return new Response(new Uint8Array(imgBuffer), { status: 200, headers: { 'content-type': 'image/png' } });
  } catch (error) {
    set.status = 500;
    return { status: false, error: (error as Error).message };
  }
};
