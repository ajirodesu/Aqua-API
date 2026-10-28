import { createCanvas } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Frame',
  desc: 'Generate the "this is beautiful" meme with a custom image in the picture frames',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image to display inside the picture frames',
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
    const bgUrl = 'https://i.postimg.cc/vZZgsrCx/beautiful.png';

    // Fetch the meme template and the user's photo in parallel
    const [bgImage, overlayImage] = await Promise.all([
      loadTemplateImage(bgUrl, 'template'),
      loadRemoteImage(image, 'image'),
    ]);

    // Use the template's native resolution
    const canvas = createCanvas(bgImage.width, bgImage.height);
    const ctx = canvas.getContext('2d');

    // Enable high quality image smoothing/resampling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // The template has two transparent picture-frame windows, one per panel.
    // Both show the same photo so the scene stays consistent; a few pixels of
    // bleed tuck the photo under the ornate frame edges.
    const frames = [
      { x: 513, y: 51, w: 179, h: 204 }, // top panel
      { x: 515, y: 454, w: 179, h: 204 }, // bottom panel
    ];

    // Center-crop aspect ratio fit (cover mode) — never stretch the photo.
    const frameRatio = frames[0].w / frames[0].h;
    const imgWidth = overlayImage.width;
    const imgHeight = overlayImage.height;
    const imgRatio = imgWidth / imgHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = imgWidth;
    let sHeight = imgHeight;

    if (imgRatio > frameRatio) {
      sWidth = imgHeight * frameRatio;
      sx = (imgWidth - sWidth) / 2;
    } else {
      sHeight = imgWidth / frameRatio;
      sy = (imgHeight - sHeight) / 2;
    }

    // 1. Draw the photo first so the frames stay on top.
    for (const frame of frames) {
      ctx.drawImage(overlayImage, sx, sy, sWidth, sHeight, frame.x, frame.y, frame.w, frame.h);
    }

    // 2. Draw the meme template on top, revealing the photo only through the
    //    two frame windows while keeping the artwork and text untouched.
    ctx.drawImage(bgImage, 0, 0);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
}
