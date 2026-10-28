import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Affect',
  desc: 'Generate the "no it doesn\'t affect my baby" meme with a custom image on the computer screen',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to display on the computer screen',
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
    const bgUrl = 'https://i.postimg.cc/fTKtp2qK/affect.png';

    // Fetch both the meme template and the user's photo in parallel
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

    // 1. Draw the photo FIRST so the template's monitor bezel stays on top.
    //    The monitor's blank screen is a transparent window at
    //    (228, 482), 249x197; a few pixels of bleed tuck it under the bezel,
    //    which is tilted, so the template's exact edges do the masking.
    const targetX = 225;
    const targetY = 479;
    const targetW = 255;
    const targetH = 203;

    // Center-crop aspect ratio fit (cover mode) — never stretch the photo
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

    ctx.drawImage(overlayImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // 2. Draw the meme template ON TOP, revealing the photo through the
    //    monitor screen while keeping the bezel, characters, and text intact.
    ctx.drawImage(bgImage, 0, 0);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};