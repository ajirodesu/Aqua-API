import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Erase',
  desc: 'Generate a delete/erase meme overlay with a given image',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to erase/delete',
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
    const bgUrl = 'https://i.postimg.cc/RZGLjbNC/delete.png';

    // Fetch background template and user avatar concurrently
    const [bgImage, avatarImage] = await Promise.all([
      loadImage(bgUrl),
      loadImage(resolveImageSource(image)),
    ]);

    // Create canvas matching exact natural background dimensions
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Enable high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Target overlay size and position inside the delete dialog box
    const targetX = 120;
    const targetY = 135;
    const targetW = 195;
    const targetH = 195;

    // Calculate aspect-ratio cropping (cover mode) so photos fit cleanly without distortion
    const imgWidth = avatarImage.width;
    const imgHeight = avatarImage.height;
    const targetRatio = targetW / targetH;
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

    // 1. Draw delete background template FIRST
    ctx.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height);

    // 2. Draw user avatar AFTER (on top of the background)
    ctx.drawImage(avatarImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};