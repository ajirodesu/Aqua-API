import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Facepalm',
  desc: 'Generate a facepalm meme overlay with an image avatar',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'image',
      desc: 'URL or uploaded image for the facepalm target',
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
    const layerUrl = 'https://i.postimg.cc/85fdfpwc/facepalm.png';

    // Fetch facepalm template overlay and user avatar concurrently
    const [layerBg, avatarImage] = await Promise.all([
      loadTemplateImage(layerUrl, 'template'),
      loadRemoteImage(image, 'image'),
    ]);

    // Create canvas matching exact natural template dimensions
    const canvas = createCanvas(layerBg.width, layerBg.height);
    const ctx = canvas.getContext('2d');

    // High rendering quality & smooth interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Target avatar position and dimensions (199, 112) with size 235x235
    const targetX = 199;
    const targetY = 112;
    const targetW = 235;
    const targetH = 235;

    // 1. Fill base canvas with white background (equivalent to new jimp(width, height, 0xFFFFFFFF))
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Aspect ratio crop (cover mode) so avatar fits without distortion
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

    // 3. Draw avatar UNDER the facepalm layer at (199, 112)
    ctx.drawImage(avatarImage, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    // 4. Draw facepalm template layer ON TOP
    ctx.drawImage(layerBg, 0, 0, layerBg.width, layerBg.height);

    // Encode lossless PNG buffer
    const bufferArr = await canvas.encode('png');

    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};