import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { ApiHandler, ApiMeta } from '@/types.js';

export const meta: ApiMeta = {
  name: 'Wanted Poster',
  desc: 'Generate a vintage Wanted poster meme with an image avatar and bounty price',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image for the wanted poster target',
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

/**
 * Auto-fits text font size to ensure it does not exceed max target width
 */
function getFitFontSize(
  ctx: any,
  text: string,
  startFontSize: number,
  maxWidth: number,
  fontFamily: string
): string {
  let fontSize = startFontSize;
  ctx.font = `${fontSize}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 5) {
    fontSize -= 1;
    ctx.font = `${fontSize}px ${fontFamily}`;
  }
  return ctx.font;
}

export const onStart: ApiHandler = async ({ req, res }) => {
  const image: string | undefined =
    req.method === 'POST' ? req.body?.image : (req.query?.image as string);

  if (!image) {
    return res.status(400).json({ error: 'Missing required parameter: image' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/G3kYWSf4/wanted.png';
    const canvasWidth = 257;
    const canvasHeight = 383;

    // Fetch background poster template and user avatar in parallel
    const [bgImage, avatarImage] = await Promise.all([
      loadImage(bgUrl),
      loadImage(resolveImageSource(image)),
    ]);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // High rendering quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw avatar FIRST (underneath the frame) at (25, 60) with dimensions 210x210
    const targetX = 25;
    const targetY = 60;
    const targetW = 210;
    const targetH = 210;

    // Center-crop aspect ratio fit (cover mode)
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

    ctx.drawImage(avatarImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // 2. Draw wanted poster background ON TOP of the avatar
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

    // 3. Generate random bounty reward string
    const price = Math.floor(Math.random() * 188708) + 329889;
    const currency = Math.floor(Math.random() * 18);
    const bountyText = `$${price.toLocaleString()}${currency}`;

    // 4. Measure & render dynamic bounty text centered at (128, 315)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#513d34';
    ctx.font = getFitFontSize(ctx, bountyText, 80, 200, 'Times New Roman, serif');
    ctx.fillText(bountyText, 128, 315);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};