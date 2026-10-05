import { createCanvas, loadImage } from '@napi-rs/canvas';
import { loadRemoteImage, loadTemplateImage, errorStatus } from '@/engine/image-loader.js';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Bonk',
  desc: 'Generate a bonk image with two avatars',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'avatar1',
      desc: 'Sender avatar — the one doing the bonking (left)',
      example: 'https://images5.alphacoders.com/123/1234949.png',
      required: true,
      type: 'image',
    },
    {
      name: 'avatar2',
      desc: 'Target avatar — the one being bonked (right)',
      example: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSUHmFF366PfhH60lx91aoOJRtIyfcMHVkU-KDFQbff4y7H8cDjYCjuXXE&s=10',
      required: true,
      type: 'image',
    },
  ],
};

export async function initialize({ req, res }: EndpointCtx) {
  const avatar1: string | undefined =
    req.method === 'POST' ? req.body?.avatar1 : (req.query?.avatar1 as string); // sender — bonker (left)
  const avatar2: string | undefined =
    req.method === 'POST' ? req.body?.avatar2 : (req.query?.avatar2 as string); // target — being bonked (right)

  if (!avatar1) {
    return res.status(400).json({ error: 'Missing required parameter: avatar1 (sender avatar)' });
  }
  if (!avatar2) {
    return res.status(400).json({ error: 'Missing required parameter: avatar2 (target avatar)' });
  }

  try {
    const canvas = createCanvas(600, 337);
    const c = canvas.getContext('2d');

    // ── Layer 1: base background ──────────────────────────────────────────
    const bg1 = await loadTemplateImage(
      'https://raw.githubusercontent.com/Zaxerion/databased/refs/heads/main/asset/11.jpg',
      'background'
    );
    c.drawImage(bg1, 0, 0, 600, 337);

    // avatar2 (target — being bonked) → right tilted ellipse, under fg overlay
    c.save();
    c.beginPath();
    c.ellipse(422, 175, 40, 55, Math.PI / 4, 0, 2 * Math.PI);
    c.stroke();
    c.closePath();
    c.clip();
    const imgTarget = await loadRemoteImage(avatar2, 'avatar2');
    c.drawImage(imgTarget, 373, 115, 110, 110);
    c.restore();

    // ── Layer 2: foreground PNG overlay (bonk action) ─────────────────────
    const bg2 = await loadTemplateImage(
      'https://raw.githubusercontent.com/Zaxerion/databased/refs/heads/main/asset/22.png',
      'foreground'
    );
    c.drawImage(bg2, 0, 0, 600, 337);

    // avatar1 (sender — bonker) → left circle, on top of the fg overlay
    c.save();
    c.beginPath();
    c.arc(105, 100, 48, 0, Math.PI * 2, true);
    c.stroke();
    c.closePath();
    c.clip();
    const imgSender = await loadRemoteImage(avatar1, 'avatar1');
    c.drawImage(imgSender, 57, 56, 96, 96);
    c.restore();

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(errorStatus(error)).json({ error: (error as Error).message || 'Internal server error' });
  }
};