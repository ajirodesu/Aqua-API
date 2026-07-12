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

type GreetType = 'welcome' | 'goodbye';

/** Default accent per event type when no explicit `color` param is given. */
function defaultColorNameFor(type: GreetType): string {
  return type === 'goodbye' ? 'Red' : 'Cyan';
}

/** Resolves a named color only. Raw hex values are not allowed. */
function resolveColor(value: unknown, type: GreetType): Rgb {
  const fallbackName = defaultColorNameFor(type);

  if (typeof value !== 'string' || !value.trim()) {
    return hexToRgb(NAMED_COLOR_LOOKUP.get(normalizeColorKey(fallbackName))!);
  }

  const hex = NAMED_COLOR_LOOKUP.get(normalizeColorKey(value));

  if (!hex) {
    throw new Error(`Invalid color. Allowed colors are: ${NAMED_COLORS.map((c) => c.name).join(', ')}`);
  }

  return hexToRgb(hex);
}

function resolveType(value: unknown): GreetType {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return v === 'goodbye' ? 'goodbye' : 'welcome';
}

export const meta: ApiMeta = {
  name: 'Greet',
  desc: 'Generate a futuristic sci-fi welcome/goodbye card for Discord with a glowing hex avatar frame, HUD accents, and a neon-lit member banner',
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
      name: 'type',
      desc: 'Whether this is a member joining or leaving',
      example: 'Welcome',
      required: false,
      type: 'select',
      options: ['Welcome', 'Goodbye'],
    },
    {
      name: 'server',
      desc: 'Server name shown in the subtitle',
      example: 'Ajiro HQ',
      required: false,
      type: 'text',
    },
    {
      name: 'memberCount',
      desc: 'Member count badge in the corner (e.g. total members after this join)',
      example: '1204',
      required: false,
      type: 'number',
    },
    {
      name: 'color',
      desc: 'Named accent color; defaults to cyan for Welcome and red for Goodbye',
      example: 'Cyan',
      required: false,
      type: 'select',
      options: NAMED_COLORS.map((c) => c.name),
    },
  ],
};

// Wide landscape banner: a classic Discord welcome/goodbye card ratio.
const WIDTH = 1200;
const HEIGHT = 480;

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
  const len = 36;
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

  const glow1 = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 0.05, 0, WIDTH * 0.5, HEIGHT * 0.05, 520);
  glow1.addColorStop(0, rgba(color, 0.2));
  glow1.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const glow2 = ctx.createRadialGradient(WIDTH * 0.5, HEIGHT * 1.05, 0, WIDTH * 0.5, HEIGHT * 1.05, 480);
  glow2.addColorStop(0, rgba(color, 0.14));
  glow2.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Perspective HUD floor grid.
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.45);
  ctx.lineWidth = 1;
  const horizonY = HEIGHT * 0.34;
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const y = horizonY + t * t * (HEIGHT - horizonY);
    ctx.globalAlpha = 0.42 - t * 0.3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }
  const vanishX = WIDTH * 0.5;
  ctx.globalAlpha = 0.16;
  for (let i = -8; i <= 8; i++) {
    const xBottom = WIDTH * 0.5 + i * 95;
    ctx.beginPath();
    ctx.moveTo(vanishX, horizonY);
    ctx.lineTo(xBottom, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // Faint CRT scanlines.
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

  // Radial HUD tick marks around the ring.
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

export const onStart: ApiHandler = async ({ req, res }) => {
  const body = (req.method === 'POST' ? req.body : req.query) as Record<string, unknown>;

  const avatar = typeof body?.avatar === 'string' ? body.avatar : undefined;
  const username = typeof body?.username === 'string' ? body.username : undefined;

  if (!avatar) {
    return res.status(400).json({ error: 'Missing required parameter: avatar' });
  }
  if (!username) {
    return res.status(400).json({ error: 'Missing required parameter: username' });
  }

  const type = resolveType(body?.type);
  const server = typeof body?.server === 'string' && body.server.trim() ? body.server.trim() : undefined;
  const memberCount =
    body?.memberCount !== undefined && body?.memberCount !== ''
      ? clampNum(body.memberCount, 0, 1, 999999999)
      : null;

  let color: Rgb;
  try {
    color = resolveColor(body?.color, type);
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

    const centerX = WIDTH / 2;

    // Kicker line
    ctx.save();
    ctx.font = '600 14px sans-serif';
    ctx.fillStyle = rgba(color, 0.85);
    ctx.textAlign = 'center';
    ctx.fillText('M E M B E R   U P D A T E', centerX, 46);
    ctx.restore();

    // Title
    const titleText = type === 'goodbye' ? 'GOODBYE' : 'WELCOME';
    drawGlowText(ctx, titleText, centerX, 100, color, {
      font: '800 46px sans-serif',
      blur: 26,
      color: '#e9fbff',
      align: 'center',
    });

    // Avatar
    const avatarImg = await loadAvatarImage(avatar, 'greet_avatar');
    const cx = centerX;
    const cy = 250;
    const r = 92;
    drawAvatar(ctx, avatarImg, cx, cy, r, color);

    // Username
    ctx.save();
    ctx.font = '800 34px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    const displayName = username.length > 24 ? `${username.slice(0, 23)}…` : username;
    ctx.fillText(displayName, centerX, 388);
    ctx.restore();

    // Subtitle
    const verb = type === 'goodbye' ? 'has left' : 'has joined';
    const subtitle = server ? `${verb} ${server}` : `${verb} the server`;
    ctx.save();
    ctx.font = '600 17px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'center';
    ctx.fillText(subtitle, centerX, 416);
    ctx.restore();

    // Member count chip
    if (memberCount !== null) {
      const chipLabel = type === 'goodbye' ? 'MEMBERS REMAINING' : 'TOTAL MEMBERS';
      const chipW = 190;
      const chipH = 44;
      const chipX = WIDTH - 36 - chipW;
      const chipY = HEIGHT - 36 - chipH;

      ctx.save();
      roundedRectPath(ctx, chipX, chipY, chipW, chipH, 11);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.6);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = '700 11px sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(chipLabel, chipX + 14, chipY + 17);
      ctx.restore();

      drawGlowText(ctx, `#${memberCount}`, chipX + 14, chipY + 35, color, {
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