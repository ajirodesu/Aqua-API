import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { ApiHandler, ApiMeta } from '@/types.js';

export const meta: ApiMeta = {
  name: 'Jail',
  desc: 'Generate a jail cell meme overlay with a given image behind bars',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to put behind jail bars',
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
  const image: string | undefined =
    req.method === 'POST' ? req.body?.image : (req.query?.image as string);

  if (!image) {
    return res.status(400).json({ error: 'Missing required parameter: image' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/RhccGgk1/jail.png';
    const canvasWidth = 400;
    const canvasHeight = 400;

    // Fetch jail bars template overlay and user avatar in parallel
    const [jailOverlay, avatarImage] = await Promise.all([
      loadImage(bgUrl),
      loadImage(resolveImageSource(image)),
    ]);

    // Create a 400x400 canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // High rendering quality & smooth resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Fill base with solid white background (equivalent to new jimp(400, 400, 0xFFFFFFFF))
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Aspect ratio crop (cover mode) so photos fit cleanly without stretching
    const imgWidth = avatarImage.width;
    const imgHeight = avatarImage.height;
    const targetRatio = canvasWidth / canvasHeight;
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

    // 3. Draw user image UNDER the jail bars at (0, 0) with size 400x400
    ctx.drawImage(avatarImage, sx, sy, sWidth, sHeight, 0, 0, canvasWidth, canvasHeight);

    // 4. Draw jail bars template overlay ON TOP over (0, 0) resized to 400x400
    ctx.drawImage(jailOverlay, 0, 0, canvasWidth, canvasHeight);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};