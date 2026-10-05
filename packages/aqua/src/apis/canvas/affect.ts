import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Affect',
  desc: 'Generate an "it doesn\'t affect my baby" meme overlay with a given image',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to overlay onto the meme',
      example: 'https://avatars.githubusercontent.com/u/180540408?v=4',
      required: true,
      type: 'image',
    },
  ],
};

export async function initialize({ req, res }: EndpointCtx) {
  const image: string | undefined =
    req.method === 'POST' ? req.body?.image : (req.query?.image as string);

  if (!image) {
    return res.status(400).json({ error: 'Missing required parameter: image' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/QMx0CZRp/affect.png';

    // Fetch both background frame and user overlay image in parallel
    const [bgImage, overlayImage] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image, 'image'),
    ]);

    // Use exact natural dimensions of the background image
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Enable high quality image smoothing/resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw background image first
    ctx.drawImage(bgImage, 0, 0);

    // Draw user image overlay at (180, 383) with dimensions 200x157 as in original script
    ctx.drawImage(overlayImage, 180, 383, 200, 157);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};