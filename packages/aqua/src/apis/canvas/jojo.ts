import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';

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

export const onStart: ApiHandler = async ({ req, res }) => {
  const image: string | undefined = req.method === 'POST' ? req.body?.image : (req.query?.image as string);

  if (!image) {
    return res.status(400).json({ error: 'Missing required parameter: image' });
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
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};

