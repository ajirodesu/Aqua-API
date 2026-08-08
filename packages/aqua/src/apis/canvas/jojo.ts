import { createCanvas } from '@napi-rs/canvas';
import { cachedLoadImage as loadImage } from '@/engine/image-cache.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Jojo',
  desc: 'Generate a JoJo meme image with an overlay image',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to overlay',
      example: 'https://avatars.githubusercontent.com/u/180540408?v=4',
      required: true,
      type: 'image',
    },
  ],
};

/**
 * `loadImage()` only understands remote URLs, local file paths, or raw
 * bytes — it does not parse `data:` URIs. Uploads from the docs UI arrive
 * as base64 data URIs (via FileReader.readAsDataURL), so those need to be
 * decoded into a Buffer first; plain URLs are passed through untouched.
 */
function resolveImageSource(image: string): string | Buffer {
  if (image.startsWith('data:')) {
    const commaIndex = image.indexOf(',');
    if (commaIndex === -1) {
      throw new Error('Malformed data URI for parameter: image');
    }
    const base64 = image.slice(commaIndex + 1);
    return Buffer.from(base64, 'base64');
  }
  return image;
}

export async function initialize(ctx: EndpointCtx) {
  const { request, query, set } = ctx;
  const body = (request.method === 'POST' ? (ctx.body ?? {}) : ({})) as Record<string, unknown>;

  const image: string | undefined =
    request.method === 'POST' ? (body?.image as string) : (query?.image as string);

  if (!image) {
    set.status = 400;
    return { error: 'Missing required parameter: image' };
  }

  try {
    const canvas = createCanvas(600, 337);
    const ctx = canvas.getContext('2d');
    const bgUrl =
      'https://raw.githubusercontent.com/Zaxerion/databased/refs/heads/main/asset/20211104-094134.png';

    ctx.save();
    ctx.beginPath();
    ctx.rotate((-8 * Math.PI) / 180);
    const overlayImage = await loadImage(resolveImageSource(image));
    ctx.drawImage(overlayImage, 120, 173, 161, 113);
    ctx.restore();

    const bg = await loadImage(bgUrl);
    ctx.drawImage(bg, 0, 0, 600, 337);

    const bufferArr = await canvas.encode('png');
    return new Response(new Uint8Array(bufferArr), { headers: { 'content-type': 'image/png' } });
  } catch (error) {
    set.status = 500;
    return { error: (error as Error).message || 'Internal server error' };
  }
};

