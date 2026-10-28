import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Erase',
  desc: 'Generate a "permanently delete this trash" dialog with a custom image as the file preview',
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

export async function initialize({ req, res }: EndpointCtx) {
  const image: string | undefined =
    req.method === 'POST' ? req.body?.image : (req.query?.image as string);

  if (!image) {
    return res.status(400).json({ error: 'Missing required parameter: image' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/P55pjW04/erase.png';

    // Fetch background template and user avatar concurrently
    const [bgImage, avatarImage] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image, 'image'),
    ]);

    // Create canvas matching exact natural background dimensions
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Enable high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw the avatar FIRST. The template's document window is transparent
    //    at (149, 218), 178x231; drawing a few pixels past it tucks the image
    //    under the white border while the folded corner and red X stay on top.
    const targetX = 146;
    const targetY = 215;
    const targetW = 184;
    const targetH = 237;

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

    ctx.drawImage(avatarImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // 2. Draw the dialog template ON TOP, revealing the avatar through the
    //    document window and preserving every other template pixel.
    ctx.drawImage(bgImage, 0, 0, bgImage.width, bgImage.height);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};