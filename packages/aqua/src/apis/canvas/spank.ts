import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Spank',
  desc: 'Generate a spank meme overlay with two greyscale circular user profile avatars',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image1',
      desc: 'URL or uploaded image for the first person (spanker)',
      example: 'https://avatars.githubusercontent.com/u/180540408?v=4',
      required: true,
      type: 'image',
    },
    {
      name: 'image2',
      desc: 'URL or uploaded image for the second person (being spanked)',
      example: 'https://i.postimg.cc/QMC1vQBv/maya.jpg',
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
  const image1: string | undefined =
    req.method === 'POST' ? req.body?.image1 : (req.query?.image1 as string);
  const image2: string | undefined =
    req.method === 'POST' ? req.body?.image2 : (req.query?.image2 as string);

  if (!image1 || !image2) {
    return res
      .status(400)
      .json({ error: 'Missing required parameters: image1 and image2 are required' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/B6FDQhQd/spank.png';
    const canvasWidth = 500;
    const canvasHeight = 500;

    // Fetch background image and both avatar images concurrently
    const [bgImage, avatar1, avatar2] = await Promise.all([
      loadImage(bgUrl),
      loadImage(resolveImageSource(image1)),
      loadImage(resolveImageSource(image2)),
    ]);

    // Create canvas matching exact resized dimensions (500x500)
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Enable high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw base background template FIRST
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

    // Helper function to draw circular & greyscale cropped avatar with cover fit
    const drawGreyscaleCircularAvatar = (
      img: any,
      x: number,
      y: number,
      size: number
    ) => {
      ctx.save();

      // Apply greyscale filter (replicating image.greyscale() from Jimp)
      ctx.filter = 'grayscale(100%)';

      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Aspect ratio crop (cover mode) within circle mask
      const imgWidth = img.width;
      const imgHeight = img.height;
      const targetRatio = 1; // square/circle
      const imgRatio = imgWidth / imgHeight;

      let sx = 0;
      let sy = 0;
      let sWidth = imgWidth;
      let sHeight = imgHeight;

      if (imgRatio > targetRatio) {
        sWidth = imgHeight * targetRatio;
        sx = (imgWidth - sWidth) / 2;
      } else {
        sHeight = imgWidth / targetRatio;
        sy = (imgHeight - sHeight) / 2;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, size, size);
      ctx.restore();
    };

    // 2. Draw circular, greyscale image2 at position (350, 220) with size 120x120
    drawGreyscaleCircularAvatar(avatar2, 350, 220, 120);

    // 3. Draw circular, greyscale image1 at position (225, 5) with size 140x140
    drawGreyscaleCircularAvatar(avatar1, 225, 5, 140);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};