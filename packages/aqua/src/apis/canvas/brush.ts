import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { ApiHandler, ApiMeta } from '@/types.js';

export const meta: ApiMeta = {
  name: 'Brush',
  desc: 'Generate a Bob Ross painting meme with a given image perfectly aligned on the canvas',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to display on Bob Ross\'s canvas',
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
    const bgUrl = 'https://i.postimg.cc/kg7yYdXd/bobross.png';

    // Fetch both Bob Ross template frame and user overlay image in parallel
    const [bobRossBg, overlayImage] = await Promise.all([
      loadImage(bgUrl),
      loadImage(resolveImageSource(image)),
    ]);

    // Create canvas based on the background image dimensions
    const canvas = createCanvas(bobRossBg.width, bobRossBg.height);
    const ctx = canvas.getContext('2d');

    // Enable maximum image quality and high-res smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Target position and size on Bob Ross's easel
    const targetX = 15;
    const targetY = 20;
    const targetW = 440;
    const targetH = 440;

    // 1. Fill canvas area with white background to prevent gaps
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(targetX, targetY, targetW, targetH);

    // 2. Calculate aspect-ratio cropping (cover mode) so photos fit cleanly without distortion
    const imgWidth = overlayImage.width;
    const imgHeight = overlayImage.height;
    const targetRatio = targetW / targetH;
    const imgRatio = imgWidth / imgHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = imgWidth;
    let sHeight = imgHeight;

    if (imgRatio > targetRatio) {
      // Image is wider than target box -> crop horizontally
      sWidth = imgHeight * targetRatio;
      sx = (imgWidth - sWidth) / 2;
    } else {
      // Image is taller than target box -> crop vertically
      sHeight = imgWidth / targetRatio;
      sy = (imgHeight - sHeight) / 2;
    }

    // 3. Draw user image with cover crop alignment
    ctx.drawImage(overlayImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // 4. Draw Bob Ross cutout template on top
    ctx.drawImage(bobRossBg, 0, 0);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};