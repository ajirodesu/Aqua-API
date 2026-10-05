import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Kiss Me',
  desc: 'Generate a kiss me meme overlay with two circular user profile avatars',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image1',
      desc: 'URL or uploaded image for the first person (kisser)',
      example: 'https://avatars.githubusercontent.com/u/180540408?v=4',
      required: true,
      type: 'image',
    },
    {
      name: 'image2',
      desc: 'URL or uploaded image for the second person (being kissed)',
      example: 'https://i.postimg.cc/QMC1vQBv/maya.jpg',
      required: true,
      type: 'image',
    },
  ],
};

export async function initialize({ req, res }: EndpointCtx) {
  const image1: string | undefined =
    req.method === 'POST' ? req.body?.image1 : (req.query?.image1 as string);
  const image2: string | undefined =
    req.method === 'POST' ? req.body?.image2 : (req.query?.image2 as string);

  if (!image1 || !image2) {
    return res.status(400).json({ error: 'Missing required parameter: image1 and image2 are required' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/9QxyxRnk/kissme.jpg';

    // Fetch background image and both avatar images concurrently
    const [bgImage, avatar1, avatar2] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image1, 'image1'),
      loadRemoteImage(image2, 'image2'),
    ]);

    // Create canvas matching background dimensions
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Enable maximum rendering & smoothing quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw base background template
    ctx.drawImage(bgImage, 0, 0);

    // Helper function to draw circular avatar cropped cleanly
    const drawCircularAvatar = (
      img: any,
      x: number,
      y: number,
      size: number
    ) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Aspect ratio crop (cover mode) within circle
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

    // 2. Draw first avatar (circular) at position (200, 300) with size 350x350
    drawCircularAvatar(avatar1, 200, 300, 350);

    // 3. Draw second avatar (circular) at position (600, 80) with size 350x350
    drawCircularAvatar(avatar2, 600, 80, 350);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};