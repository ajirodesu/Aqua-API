import { createCanvas } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiMeta, EndpointCtx } from '@/engine/types.js';

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

export async function initialize({ req, res }: EndpointCtx) {
  const image: string | undefined =
    req.method === 'POST' ? req.body?.image : (req.query?.image as string);

  if (!image) {
    return res.status(400).json({ error: 'Missing required parameter: image' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/g22XWV13/brush.png';

    // Fetch the Bob Ross template and the user's photo in parallel
    const [bobRossBg, overlayImage] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image, 'image'),
    ]);

    // Use the template's native resolution
    const canvas = createCanvas(bobRossBg.width, bobRossBg.height);
    const ctx = canvas.getContext('2d');

    // Enable maximum image quality and high-res smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // The easel canvas is a transparent window at (12, 69), 311x328. A few
    // pixels of bleed tuck the photo under the easel frame and Bob Ross's
    // brush, which overlays its right edge.
    const targetX = 7;
    const targetY = 63;
    const targetW = 333;
    const targetH = 339;

    // 1. Fill the canvas area with white so transparent photos still read as
    //    a blank canvas rather than holes in the final PNG.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(targetX, targetY, targetW, targetH);

    // 2. Center-crop aspect ratio fit (cover mode) — never stretch the photo.
    const imgWidth = overlayImage.width;
    const imgHeight = overlayImage.height;
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

    // 3. Draw the photo into the easel canvas.
    ctx.drawImage(overlayImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // 4. Draw the Bob Ross template on top, preserving the easel and character.
    ctx.drawImage(bobRossBg, 0, 0);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
}
