import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
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

export async function initialize({ req, res }: EndpointCtx) {
  const image: string | undefined =
    req.method === 'POST' ? req.body?.image : (req.query?.image as string);

  if (!image) {
    return res.status(400).json({ error: 'Missing required parameter: image' });
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
      loadRemoteImage(image, 'image'),
      loadTemplateImage(frameUrl, 'template'),
    ]);

    // Draw overlay images at specified positions (258, 28) and (258, 229) with size 84x95
    ctx.drawImage(overlayImage, 258, 28, 84, 95);
    ctx.drawImage(overlayImage, 258, 229, 84, 95);

    // Draw the frame template over the images
    ctx.drawImage(frameBg, 0, 0, width, height);

    // Encode lossless high-quality PNG
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};