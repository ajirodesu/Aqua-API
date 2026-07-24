import { createCanvas, loadImage } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';

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

/**
 * Resolves an avatar param (remote URL or an uploaded `data:` URI from the
 * docs UI) down to a temp file and loads it with loadImage(). Writing to
 * disk first avoids the "@napi-rs/canvas" "Invalid SVG image" bug that
 * occurs when passing a raw Buffer directly.
 */
async function loadAvatarImage(source: string, prefix: string): Promise<ReturnType<typeof loadImage>> {
  let buf: Buffer;
  let ext = 'jpg';

  if (source.startsWith('data:')) {
    const commaIndex = source.indexOf(',');
    if (commaIndex === -1) {
      throw new Error(`Malformed data URI for parameter: ${prefix}`);
    }
    const mime = source.slice(5, commaIndex).split(';')[0] || 'image/jpeg';
    ext = mime.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'jpg';
    buf = Buffer.from(source.slice(commaIndex + 1), 'base64');
  } else {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status}): ${source}`);

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    ext =
      contentType
        .split('/')[1]
        ?.replace('jpeg', 'jpg')
        ?.replace('svg+xml', 'svg')
        ?.split(';')[0] || 'jpg';

    buf = Buffer.from(await res.arrayBuffer());
  }

  const tmp = join(tmpdir(), `${prefix}_${randomBytes(8).toString('hex')}.${ext}`);
  writeFileSync(tmp, buf);

  try {
    return await loadImage(tmp);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

export const onStart: ApiHandler = async ({ req, res }) => {
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
    const bg1 = await loadImage(
      'https://raw.githubusercontent.com/Zaxerion/databased/refs/heads/main/asset/11.jpg'
    );
    c.drawImage(bg1, 0, 0, 600, 337);

    // avatar2 (target — being bonked) → right tilted ellipse, under fg overlay
    c.save();
    c.beginPath();
    c.ellipse(422, 175, 40, 55, Math.PI / 4, 0, 2 * Math.PI);
    c.stroke();
    c.closePath();
    c.clip();
    const imgTarget = await loadAvatarImage(avatar2, 'bonk_target');
    c.drawImage(imgTarget, 373, 115, 110, 110);
    c.restore();

    // ── Layer 2: foreground PNG overlay (bonk action) ─────────────────────
    const bg2 = await loadImage(
      'https://raw.githubusercontent.com/Zaxerion/databased/refs/heads/main/asset/22.png'
    );
    c.drawImage(bg2, 0, 0, 600, 337);

    // avatar1 (sender — bonker) → left circle, on top of the fg overlay
    c.save();
    c.beginPath();
    c.arc(105, 100, 48, 0, Math.PI * 2, true);
    c.stroke();
    c.closePath();
    c.clip();
    const imgSender = await loadAvatarImage(avatar1, 'bonk_sender');
    c.drawImage(imgSender, 57, 56, 96, 96);
    c.restore();

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};