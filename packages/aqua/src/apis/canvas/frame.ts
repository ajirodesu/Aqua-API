import { createCanvas } from '@napi-rs/canvas';
import { cachedLoadImage as loadImage } from '@/engine/image-cache.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Frame',
  desc: 'Generate a "beautiful" frame meme overlay with a given image',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to put inside the frame',
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
    const width = 376;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Enable maximum image quality & smooth resampling during scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const frameUrl = 'https://i.postimg.cc/8574dBkR/beautiful.png';

    // Load the user's overlay image and frame background
    const [overlayImage, frameBg] = await Promise.all([
      loadImage(resolveImageSource(image)),
      loadImage(frameUrl),
    ]);

    // Draw overlay images at specified positions (258, 28) and (258, 229) with size 84x95
    ctx.drawImage(overlayImage, 258, 28, 84, 95);
    ctx.drawImage(overlayImage, 258, 229, 84, 95);

    // Draw the frame template over the images
    ctx.drawImage(frameBg, 0, 0, width, height);

    // Encode lossless high-quality PNG
    const bufferArr = await canvas.encode('png');

    return new Response(new Uint8Array(bufferArr), { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' } });
  } catch (error) {
    set.status = 500;
    return { error: (error as Error).message || 'Internal server error' };
  }
};