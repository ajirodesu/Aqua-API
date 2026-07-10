import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ApiHandler, ApiMeta } from '@/types.js';

type Rgb = [number, number, number];

/**
 * Full standard CSS/X11 named-color table (American spellings only, to
 * avoid duplicate "grey"/"gray" entries in the dropdown). Used both to
 * populate the `color` select options and to resolve a chosen name back
 * to a hex value for rendering.
 */
const NAMED_COLORS: { name: string; hex: string }[] = [
  { name: 'Alice Blue', hex: '#f0f8ff' },
  { name: 'Antique White', hex: '#faebd7' },
  { name: 'Aqua', hex: '#00ffff' },
  { name: 'Aquamarine', hex: '#7fffd4' },
  { name: 'Azure', hex: '#f0ffff' },
  { name: 'Beige', hex: '#f5f5dc' },
  { name: 'Bisque', hex: '#ffe4c4' },
  { name: 'Black', hex: '#000000' },
  { name: 'Blanched Almond', hex: '#ffebcd' },
  { name: 'Blue', hex: '#0000ff' },
  { name: 'Blue Violet', hex: '#8a2be2' },
  { name: 'Brown', hex: '#a52a2a' },
  { name: 'Burly Wood', hex: '#deb887' },
  { name: 'Cadet Blue', hex: '#5f9ea0' },
  { name: 'Chartreuse', hex: '#7fff00' },
  { name: 'Chocolate', hex: '#d2691e' },
  { name: 'Coral', hex: '#ff7f50' },
  { name: 'Cornflower Blue', hex: '#6495ed' },
  { name: 'Cornsilk', hex: '#fff8dc' },
  { name: 'Crimson', hex: '#dc143c' },
  { name: 'Cyan', hex: '#00ffff' },
  { name: 'Dark Blue', hex: '#00008b' },
  { name: 'Dark Cyan', hex: '#008b8b' },
  { name: 'Dark Goldenrod', hex: '#b8860b' },
  { name: 'Dark Gray', hex: '#a9a9a9' },
  { name: 'Dark Green', hex: '#006400' },
  { name: 'Dark Khaki', hex: '#bdb76b' },
  { name: 'Dark Magenta', hex: '#8b008b' },
  { name: 'Dark Olive Green', hex: '#556b2f' },
  { name: 'Dark Orange', hex: '#ff8c00' },
  { name: 'Dark Orchid', hex: '#9932cc' },
  { name: 'Dark Red', hex: '#8b0000' },
  { name: 'Dark Salmon', hex: '#e9967a' },
  { name: 'Dark Sea Green', hex: '#8fbc8f' },
  { name: 'Dark Slate Blue', hex: '#483d8b' },
  { name: 'Dark Slate Gray', hex: '#2f4f4f' },
  { name: 'Dark Turquoise', hex: '#00ced1' },
  { name: 'Dark Violet', hex: '#9400d3' },
  { name: 'Deep Pink', hex: '#ff1493' },
  { name: 'Deep Sky Blue', hex: '#00bfff' },
  { name: 'Dim Gray', hex: '#696969' },
  { name: 'Dodger Blue', hex: '#1e90ff' },
  { name: 'Fire Brick', hex: '#b22222' },
  { name: 'Floral White', hex: '#fffaf0' },
  { name: 'Forest Green', hex: '#228b22' },
  { name: 'Fuchsia', hex: '#ff00ff' },
  { name: 'Gainsboro', hex: '#dcdcdc' },
  { name: 'Ghost White', hex: '#f8f8ff' },
  { name: 'Gold', hex: '#ffd700' },
  { name: 'Goldenrod', hex: '#daa520' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Green', hex: '#008000' },
  { name: 'Green Yellow', hex: '#adff2f' },
  { name: 'Honeydew', hex: '#f0fff0' },
  { name: 'Hot Pink', hex: '#ff69b4' },
  { name: 'Indian Red', hex: '#cd5c5c' },
  { name: 'Indigo', hex: '#4b0082' },
  { name: 'Ivory', hex: '#fffff0' },
  { name: 'Khaki', hex: '#f0e68c' },
  { name: 'Lavender', hex: '#e6e6fa' },
  { name: 'Lavender Blush', hex: '#fff0f5' },
  { name: 'Lawn Green', hex: '#7cfc00' },
  { name: 'Lemon Chiffon', hex: '#fffacd' },
  { name: 'Light Blue', hex: '#add8e6' },
  { name: 'Light Coral', hex: '#f08080' },
  { name: 'Light Cyan', hex: '#e0ffff' },
  { name: 'Light Goldenrod Yellow', hex: '#fafad2' },
  { name: 'Light Gray', hex: '#d3d3d3' },
  { name: 'Light Green', hex: '#90ee90' },
  { name: 'Light Pink', hex: '#ffb6c1' },
  { name: 'Light Salmon', hex: '#ffa07a' },
  { name: 'Light Sea Green', hex: '#20b2aa' },
  { name: 'Light Sky Blue', hex: '#87cefa' },
  { name: 'Light Slate Gray', hex: '#778899' },
  { name: 'Light Steel Blue', hex: '#b0c4de' },
  { name: 'Light Yellow', hex: '#ffffe0' },
  { name: 'Lime', hex: '#00ff00' },
  { name: 'Lime Green', hex: '#32cd32' },
  { name: 'Linen', hex: '#faf0e6' },
  { name: 'Magenta', hex: '#ff00ff' },
  { name: 'Maroon', hex: '#800000' },
  { name: 'Medium Aquamarine', hex: '#66cdaa' },
  { name: 'Medium Blue', hex: '#0000cd' },
  { name: 'Medium Orchid', hex: '#ba55d3' },
  { name: 'Medium Purple', hex: '#9370db' },
  { name: 'Medium Sea Green', hex: '#3cb371' },
  { name: 'Medium Slate Blue', hex: '#7b68ee' },
  { name: 'Medium Spring Green', hex: '#00fa9a' },
  { name: 'Medium Turquoise', hex: '#48d1cc' },
  { name: 'Medium Violet Red', hex: '#c71585' },
  { name: 'Midnight Blue', hex: '#191970' },
  { name: 'Mint Cream', hex: '#f5fffa' },
  { name: 'Misty Rose', hex: '#ffe4e1' },
  { name: 'Moccasin', hex: '#ffe4b5' },
  { name: 'Navajo White', hex: '#ffdead' },
  { name: 'Navy', hex: '#000080' },
  { name: 'Old Lace', hex: '#fdf5e6' },
  { name: 'Olive', hex: '#808000' },
  { name: 'Olive Drab', hex: '#6b8e23' },
  { name: 'Orange', hex: '#ffa500' },
  { name: 'Orange Red', hex: '#ff4500' },
  { name: 'Orchid', hex: '#da70d6' },
  { name: 'Pale Goldenrod', hex: '#eee8aa' },
  { name: 'Pale Green', hex: '#98fb98' },
  { name: 'Pale Turquoise', hex: '#afeeee' },
  { name: 'Pale Violet Red', hex: '#db7093' },
  { name: 'Papaya Whip', hex: '#ffefd5' },
  { name: 'Peach Puff', hex: '#ffdab9' },
  { name: 'Peru', hex: '#cd853f' },
  { name: 'Pink', hex: '#ffc0cb' },
  { name: 'Plum', hex: '#dda0dd' },
  { name: 'Powder Blue', hex: '#b0e0e6' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Rebecca Purple', hex: '#663399' },
  { name: 'Red', hex: '#ff0000' },
  { name: 'Rosy Brown', hex: '#bc8f8f' },
  { name: 'Royal Blue', hex: '#4169e1' },
  { name: 'Saddle Brown', hex: '#8b4513' },
  { name: 'Salmon', hex: '#fa8072' },
  { name: 'Sandy Brown', hex: '#f4a460' },
  { name: 'Sea Green', hex: '#2e8b57' },
  { name: 'Seashell', hex: '#fff5ee' },
  { name: 'Sienna', hex: '#a0522d' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Sky Blue', hex: '#87ceeb' },
  { name: 'Slate Blue', hex: '#6a5acd' },
  { name: 'Slate Gray', hex: '#708090' },
  { name: 'Snow', hex: '#fffafa' },
  { name: 'Spring Green', hex: '#00ff7f' },
  { name: 'Steel Blue', hex: '#4682b4' },
  { name: 'Tan', hex: '#d2b48c' },
  { name: 'Teal', hex: '#008080' },
  { name: 'Thistle', hex: '#d8bfd8' },
  { name: 'Tomato', hex: '#ff6347' },
  { name: 'Turquoise', hex: '#40e0d0' },
  { name: 'Violet', hex: '#ee82ee' },
  { name: 'Wheat', hex: '#f5deb3' },
  { name: 'White', hex: '#ffffff' },
  { name: 'White Smoke', hex: '#f5f5f5' },
  { name: 'Yellow', hex: '#ffff00' },
  { name: 'Yellow Green', hex: '#9acd32' },
];

/** Normalizes a name for lookup: lowercase, spaces/underscores/dashes stripped. */
function normalizeColorKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

const NAMED_COLOR_LOOKUP = new Map(NAMED_COLORS.map((c) => [normalizeColorKey(c.name), c.hex]));

type GreetType = 'welcome' | 'goodbye';

/** Default accent per event type when no explicit `color` param is given. */
function defaultColorFor(type: GreetType): string {
  return type === 'goodbye' ? '#ff5470' : '#33d0fb'; // rose red vs. aqua brand cyan
}

/** Resolves a `color` param (color name, or a raw hex as a fallback) to an RGB triple. */
function resolveColor(value: unknown, type: GreetType): Rgb {
  if (typeof value === 'string' && value.trim()) {
    const byName = NAMED_COLOR_LOOKUP.get(normalizeColorKey(value));
    if (byName) return hexToRgb(byName);
    if (isValidHex(value.trim())) return hexToRgb(value.trim());
  }
  return hexToRgb(defaultColorFor(type));
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
      example: 'Nova_Prime',
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
      example: 'Nebula Station',
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
// Discord doesn't compress embed images into a chat-bubble box the way
// Telegram does, so this leans into a cinematic wide banner instead.
const WIDTH = 1200;
const HEIGHT = 480;

function clampNum(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function isValidHex(hex: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex);
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
    body?.memberCount !== undefined && body?.memberCount !== '' ? clampNum(body.memberCount, 0, 1, 999999999) : null;
  const color = resolveColor(body?.color, type);

  try {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    drawBackground(ctx, color);

    const centerX = WIDTH / 2;

    // --- Kicker line ---
    ctx.save();
    ctx.font = '600 14px sans-serif';
    ctx.fillStyle = rgba(color, 0.85);
    ctx.textAlign = 'center';
    ctx.fillText('M E M B E R   U P D A T E', centerX, 46);
    ctx.restore();

    // --- Title: WELCOME / GOODBYE ---
    const titleText = type === 'goodbye' ? 'GOODBYE' : 'WELCOME';
    drawGlowText(ctx, titleText, centerX, 100, color, {
      font: '800 46px sans-serif',
      blur: 26,
      color: '#e9fbff',
      align: 'center',
    });

    // --- Avatar, centered ---
    const avatarImg = await loadAvatarImage(avatar, 'greet_avatar');
    const cx = centerX;
    const cy = 250;
    const r = 92;
    drawAvatar(ctx, avatarImg, cx, cy, r, color);

    // --- Username, centered below avatar ---
    ctx.save();
    ctx.font = '800 34px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6;
    ctx.textAlign = 'center';
    const displayName = username.length > 24 ? `${username.slice(0, 23)}…` : username;
    ctx.fillText(displayName, centerX, 388);
    ctx.restore();

    // --- Subtitle: server name / join-leave phrasing ---
    const verb = type === 'goodbye' ? 'has left' : 'has joined';
    const subtitle = server ? `${verb} ${server}` : `${verb} the server`;
    ctx.save();
    ctx.font = '600 17px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'center';
    ctx.fillText(subtitle, centerX, 416);
    ctx.restore();

    // --- Member count chip, bottom-right corner ---
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

      drawGlowText(ctx, `#${memberCount}`, chipX + 14, chipY + 35, color, { font: '800 18px sans-serif', blur: 12 });
    }

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};
