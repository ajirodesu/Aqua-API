import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
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

export async function initialize({ req, res }: EndpointCtx) {
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
    const overlayImage = await loadRemoteImage(image, 'image');
    ctx.drawImage(overlayImage, 120, 173, 161, 113);
    ctx.restore();

    const bg = await loadTemplateImage(bgUrl, 'template');
    ctx.drawImage(bg, 0, 0, 600, 337);

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};

