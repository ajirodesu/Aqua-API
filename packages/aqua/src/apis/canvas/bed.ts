import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Bed Monster',
  desc: 'Generate a monster-under-the-bed comic with two circular user avatars — the kid on the top bunk and the brother below',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image1',
      desc: 'URL or uploaded image for the kid on the top bunk',
      example: 'https://avatars.githubusercontent.com/u/180540408?v=4',
      required: true,
      type: 'image',
    },
    {
      name: 'image2',
      desc: 'URL or uploaded image for the brother on the bottom bunk (the "monster")',
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
    return res
      .status(400)
      .json({ error: 'Missing required parameters: image1 and image2 are required' });
  }

  try {
    const bgUrl = 'https://i.postimg.cc/tTyxZKYv/bed.jpg';
    const canvasWidth = 447;
    const canvasHeight = 800;

    // Fetch background image and both avatar images concurrently
    const [bgImage, avatar1, avatar2] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image1, 'image1'),
      loadRemoteImage(image2, 'image2'),
    ]);

    // Create canvas matching the template's native dimensions (447x800)
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Enable high-quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw base background template FIRST
    ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

    // Helper function to draw circular avatar cropped cleanly with cover fit
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

      // Aspect ratio crop (cover mode) within circle mask
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

    // 2. Draw image1 (the kid) on the face in all three panels, so the
    //    character stays consistent through the setup and the punchline.
    drawCircularAvatar(avatar1, 30, 52, 132); // panel 1 — "MUM, THERE'S A MONSTER..."
    drawCircularAvatar(avatar1, 15, 240, 145); // panel 2 — "IT'S THE MOST HIDEOUS THING..."
    drawCircularAvatar(avatar1, 82, 438, 100); // panel 3 — top bunk

    // 3. Draw image2 (the brother / "monster") on the bottom bunk face.
    drawCircularAvatar(avatar2, 78, 558, 104); // panel 3 — bottom bunk

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};
