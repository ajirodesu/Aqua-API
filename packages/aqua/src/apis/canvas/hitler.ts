import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Worse Than Hitler',
  desc: 'Generate a "Worse Than Hitler" meme overlay with an image avatar',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image overlay',
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
    const bgUrl = 'https://i.postimg.cc/fTKtp2qv/hitler.png';

    // Fetch background template and user avatar in parallel
    const [bgImage, avatarImage] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image, 'image'),
    ]);

    // Create canvas based on natural background dimensions
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // High rendering quality & smooth resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Target avatar position and dimensions covering the template's
    // transparent placeholder (99,70)-(494,493) with a small bleed.
    const targetX = 97;
    const targetY = 68;
    const targetW = 398;
    const targetH = 428;

    // Aspect ratio crop (cover mode) so photos fit cleanly without stretching
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

    // 1. Draw user overlay image FIRST, extending under the template's
    //    placeholder edges so no transparent fringe remains.
    ctx.drawImage(avatarImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // 2. Draw the template ON TOP. Its alpha channel masks the avatar to
    //    the exact placeholder shape, including irregular edges.
    ctx.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};