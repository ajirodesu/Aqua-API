import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Trash',
  desc: 'Generate a trash meme overlay with a blurred image',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to put in the trash',
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
    const bgUrl = 'https://i.postimg.cc/FRPv4SSM/trash.png';

    // Fetch both background frame and user overlay image in parallel
    const [bgImage, overlayImage] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image, 'image'),
    ]);

    // Create canvas based on background image dimensions
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Target overlay window: transparent top-right quadrant of the template
    const targetX = 399;
    const targetY = 0;
    const targetW = 401;
    const targetH = 400;

    // Bleed the drawn area beyond the window so the blur fade is hidden
    // under the frame (left/bottom) or clipped at the canvas edge (top/right)
    const bleed = 20;
    const drawX = targetX - bleed;
    const drawY = targetY - bleed;
    const drawW = targetW + bleed * 2;
    const drawH = targetH + bleed * 2;

    // Calculate aspect-ratio cropping (cover mode) so photos fit cleanly without distortion
    const imgWidth = overlayImage.width;
    const imgHeight = overlayImage.height;
    const targetRatio = drawW / drawH;
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

    // 1. Draw the blurred user image first, under the template's window
    ctx.save();
    ctx.filter = 'blur(6.5px)';
    ctx.drawImage(overlayImage, sx, sy, sWidth, sHeight, drawX, drawY, drawW, drawH);
    ctx.restore();

    // 2. Draw the trash template on top; its alpha reveals the window and
    //    preserves the grid borders exactly
    ctx.drawImage(bgImage, 0, 0);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};