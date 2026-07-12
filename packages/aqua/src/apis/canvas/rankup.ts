import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ApiHandler, ApiMeta } from '@/types.js';

type Rgb = [number, number, number];

/**
 * Important-only accent colors.
 * Only these named values are allowed.
 */
const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'Cyan', hex: '#33d0fb' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Green', hex: '#22c55e' },
];

/** Normalizes a name for lookup: lowercase, spaces/underscores/dashes stripped. */
function normalizeColorKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

const NAMED_COLOR_LOOKUP = new Map(NAMED_COLORS.map((c) => [normalizeColorKey(c.name), c.hex]));

/** Resolves a named color only. Raw hex values are not allowed. */
function resolveColor(value: unknown): Rgb {
  const fallback = 'Cyan';

  if (typeof value !== 'string' || !value.trim()) {
    return hexToRgb(NAMED_COLOR_LOOKUP.get(normalizeColorKey(fallback))!);
  }

  const hex = NAMED_COLOR_LOOKUP.get(normalizeColorKey(value));

  if (!hex) {
    throw new Error(`Invalid color. Allowed colors are: ${NAMED_COLORS.map((c) => c.name).join(', ')}`);
  }

  return hexToRgb(hex);
}

export const meta: ApiMeta = {
  name: 'Rank Up',
  desc: 'Generate a futuristic sci-fi rank-up card with a glowing hex avatar frame, HUD accents, and a neon XP bar',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'avatar',
      desc: "User's avatar image",
      example: 'https://raw.githubusercontent.com/lanceajiro/Storage/refs/heads/main/1756728735205.jpg',
      required: true,
      type: 'image',
    },
    {
      name: 'username',
      desc: 'Display name shown on the card',
      example: 'AjiroDesu',
      required: true,
      type: 'text',
    },
    {
      name: 'level',
      desc: 'New level just reached',
      example: '24',
      required: true,
      type: 'number',
    },
    {
      name: 'previousLevel',
      desc: 'Level before the rank up (defaults to level - 1)',
      example: '23',
      required: false,
      type: 'number',
    },
    {
      name: 'progress',
      desc: 'Progress toward the next level, 0-100',
      example: '68',
      required: false,
      type: 'number',
    },
    {
      name: 'rank',
      desc: 'Leaderboard position to badge in the corner',
      example: '7',
      required: false,
      type: 'number',
    },
    {
      name: 'color',
      desc: 'Main accent color used for glow, frame, and progress bar',
      example: 'Cyan',
      required: false,
      type: 'select',
      options: NAMED_COLORS.map((c) => c.name),
    },
  ],
};

const WIDTH = 1000;
const HEIGHT = 420;

function clampNum(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const int = parseInt(h, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgba([r, g, b]: Rgb, a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

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

function drawCorner(ctx: SKRSContext2D, x: number, y: number, dx: number, dy: number, color: Rgb): void {
  const len = 34;
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.shadowColor = rgba(color, 0.9);
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x, y + dy * len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dx * len, y);
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx: SKRSContext2D, color: Rgb): void {
  const base = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  base.addColorStop(0, '#05070d');
  base.addColorStop(0.55, '#0a1220');
  base.addColorStop(1, '#050810');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow1 = ctx.createRadialGradient(WIDTH * 0.82, HEIGHT * 0.12, 0, WIDTH * 0.82, HEIGHT * 0.12, 420);
  glow1.addColorStop(0, rgba(color, 0.18));
  glow1.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow2 = ctx.createRadialGradient(WIDTH * 0.08, HEIGHT * 0.95, 0, WIDTH * 0.08, HEIGHT * 0.95, 360);
  glow2.addColorStop(0, rgba(color, 0.12));
  glow2.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.strokeStyle = rgba(color, 0.5);
  ctx.lineWidth = 1;
  const horizonY = HEIGHT * 0.42;
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const y = horizonY + t * t * (HEIGHT - horizonY);
    ctx.globalAlpha = 0.5 - t * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  const vanishX = WIDTH * 0.5;
  ctx.globalAlpha = 0.2;
  for (let i = -6; i <= 6; i++) {
    const xBottom = WIDTH * 0.5 + i * 90;
    ctx.beginPath();
    ctx.moveTo(vanishX, horizonY);
    ctx.lineTo(xBottom, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let y = 0; y < HEIGHT; y += 4) {
    ctx.fillRect(0, y, WIDTH, 1);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = rgba(color, 0.45);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10.5, 10.5, WIDTH - 21, HEIGHT - 21);
  ctx.restore();

  drawCorner(ctx, 14, 14, 1, 1, color);
  drawCorner(ctx, WIDTH - 14, 14, -1, 1, color);
  drawCorner(ctx, 14, HEIGHT - 14, 1, -1, color);
  drawCorner(ctx, WIDTH - 14, HEIGHT - 14, -1, -1, color);
}

function drawHexPath(ctx: SKRSContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawAvatar(
  ctx: SKRSContext2D,
  image: Awaited<ReturnType<typeof loadImage>>,
  cx: number,
  cy: number,
  r: number,
  color: Rgb
): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.3);
  ctx.lineWidth = 2;
  drawHexPath(ctx, cx, cy, r + 22);
  ctx.stroke();

  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = 3;
  ctx.shadowColor = rgba(color, 0.9);
  ctx.shadowBlur = 22;
  drawHexPath(ctx, cx, cy, r + 10);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawHexPath(ctx, cx, cy, r);
  ctx.clip();
  ctx.drawImage(image, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = rgba(color, 1);
  ctx.lineWidth = 2;
  drawHexPath(ctx, cx, cy, r);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = rgba(color, 0.7);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 24; i++) {
    if (i % 3 === 0) continue;
    const angle = (Math.PI * 2 * i) / 24;
    const rr1 = r + 30;
    const rr2 = r + 36;
    ctx.beginPath();
    ctx.moveTo(cx + rr1 * Math.cos(angle), cy + rr1 * Math.sin(angle));
    ctx.lineTo(cx + rr2 * Math.cos(angle), cy + rr2 * Math.sin(angle));
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlowText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  color: Rgb,
  opts: { font: string; color?: string; blur?: number; align?: 'left' | 'center' | 'right' }
): void {
  ctx.save();
  ctx.font = opts.font;
  ctx.textAlign = opts.align ?? 'left';
  ctx.fillStyle = opts.color ?? '#ffffff';
  ctx.shadowColor = rgba(color, 0.85);
  ctx.shadowBlur = opts.blur ?? 18;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function roundedRectPath(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawProgressBar(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, progress: number, color: Rgb): void {
  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();

  const fillW = Math.max(h, (w * progress) / 100);
  const brightColor: Rgb = [Math.min(255, color[0] + 50), Math.min(255, color[1] + 50), 255];

  ctx.save();
  roundedRectPath(ctx, x, y, w, h, h / 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, rgba(color, 0.9));
  grad.addColorStop(1, rgba(brightColor, 0.95));
  ctx.fillStyle = grad;
  ctx.shadowColor = rgba(color, 0.8);
  ctx.shadowBlur = 16;
  roundedRectPath(ctx, x, y, fillW, h, h / 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const tx = x + (w * i) / 10;
    ctx.beginPath();
    ctx.moveTo(tx, y + 2);
    ctx.lineTo(tx, y + h - 2);
    ctx.stroke();
  }
  ctx.restore();
}

export const onStart: ApiHandler = async ({ req, res }) => {
  const body = (req.method === 'POST' ? req.body : req.query) as Record<string, unknown>;

  const avatar = typeof body?.avatar === 'string' ? body.avatar : undefined;
  const username = typeof body?.username === 'string' ? body.username : undefined;
  const levelRaw = body?.level;

  if (!avatar) {
    return res.status(400).json({ error: 'Missing required parameter: avatar' });
  }
  if (!username) {
    return res.status(400).json({ error: 'Missing required parameter: username' });
  }
  if (levelRaw === undefined || levelRaw === '') {
    return res.status(400).json({ error: 'Missing required parameter: level' });
  }

  const level = clampNum(levelRaw, 1, 1, 999999);
  const previousLevel = clampNum(body?.previousLevel, level - 1, 0, level);
  const progress = clampNum(body?.progress, 68, 0, 100);
  const rank =
    body?.rank !== undefined && body?.rank !== '' ? clampNum(body.rank, 0, 1, 999999) : null;

  let color: Rgb;
  try {
    color = resolveColor(body?.color);
  } catch (err) {
    return res.status(400).json({
      error: (err as Error).message,
      allowedColors: NAMED_COLORS.map((c) => c.name),
    });
  }

  try {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    drawBackground(ctx, color);

    const avatarImg = await loadAvatarImage(avatar, 'rankup_avatar');
    const cx = 175;
    const cy = HEIGHT / 2;
    const r = 108;
    drawAvatar(ctx, avatarImg, cx, cy, r, color);

    const contentX = 340;

    drawGlowText(ctx, 'RANK UP', contentX, 108, color, {
      font: '700 32px sans-serif',
      blur: 22,
      color: '#e9fbff',
    });

    ctx.save();
    ctx.font = '600 13px sans-serif';
    ctx.fillStyle = rgba(color, 0.85);
    ctx.fillText('S Y S T E M   N O T I F I C A T I O N', contentX + 2, 130);
    ctx.restore();

    ctx.save();
    ctx.font = '800 40px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    const displayName = username.length > 22 ? `${username.slice(0, 21)}…` : username;
    ctx.fillText(displayName, contentX, 180);
    ctx.restore();

    const levelY = 228;
    ctx.save();
    ctx.font = '700 22px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const prevLabel = `LV ${previousLevel}`;
    ctx.fillText(prevLabel, contentX, levelY);
    const prevW = ctx.measureText(prevLabel).width;
    ctx.restore();

    drawGlowText(ctx, '→', contentX + prevW + 18, levelY, color, {
      font: '700 24px sans-serif',
      blur: 14,
    });
    drawGlowText(ctx, `LV ${level}`, contentX + prevW + 62, levelY, color, {
      font: '800 26px sans-serif',
      blur: 20,
    });

    const barY = 264;
    const barW = WIDTH - contentX - 70;
    drawProgressBar(ctx, contentX, barY, barW, 16, progress, color);

    ctx.save();
    ctx.font = '600 13px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'right';
    ctx.fillText(`${progress}% TO NEXT LEVEL`, contentX + barW, barY + 34);
    ctx.restore();

    if (rank !== null) {
      const chipW = 132;
      const chipH = 40;
      const chipX = WIDTH - 40 - chipW;
      const chipY = 34;

      ctx.save();
      roundedRectPath(ctx, chipX, chipY, chipW, chipH, 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.6);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = '700 11px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText('SERVER RANK', chipX + 14, chipY + 16);
      ctx.restore();

      drawGlowText(ctx, `#${rank}`, chipX + 14, chipY + 33, color, {
        font: '800 18px sans-serif',
        blur: 12,
      });
    }

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};