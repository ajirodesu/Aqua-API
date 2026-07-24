import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';

type Rgb = [number, number, number];
type LoadedImage = Awaited<ReturnType<typeof loadImage>>;

/** Accent palette — vivid, high-contrast tones tuned for a dark cybernetic HUD surface. */
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

/** Platforms this endpoint can render for. Telegram renders the full 2:1 card; Discord renders the compact banner. */
type Platform = 'telegram' | 'discord';

const PLATFORM_ALIASES: Record<string, Platform> = {
  telegram: 'telegram',
  tg: 'telegram',
  discord: 'discord',
  dc: 'discord',
};

/** Every layout constant that differs between the Telegram card and the Discord banner, kept 1:1 with the original two files. */
interface PlatformConfig {
  width: number;
  height: number;
  panelPad: number;
  panelR: number;
  panelCut: number;
  bracketLen: number;
  avatarCxOffset: number;
  avatarR: number;
  contentXOffset: number;
  rightEdgeOffset: number;
  chipFontStart: number;
  chipFontMin: number;
  chipHeightPad: number;
  chipHeightMin: number;
  eyebrowFontSize: number;
  eyebrowShadowBlur: number;
  usernameFontMax: number;
  usernameFontMin: number;
  relEyebrowBaseline: number;
  relUsernameGap: number;
  relChipsGap: number;
  relReadoutGap: number;
  blockExtra: number;
  chevronHalf: number;
  chevronFwd: number;
  chevronAdvance: number;
  chevronLineWidth: number;
  chevronShadowBlur: number;
  xpFontMax: number;
  xpFontMin: number;
  xpOffsetX: number;
  xpRectSize: number;
  rankFontStart: number;
  rankFontMin: number;
  rankMeasurePad: number;
  rankMaxWidthPanelPad: number;
  rankMaxWidthAvatarGap: number;
  rankChipHeight: number;
  rankChipY: number;
  rankCut: number;
  rankDotR: number;
  rankDotOffset: number;
  rankShadowBlur: number;
  rankShadowOffsetY: number;
  rankDotShadowBlur: number;
  rankLabelFontSize: number;
  rankLabelOffsetX: number;
  rankLabelOffsetY: number;
  rankValueOffsetX: number;
  rankValueOffsetY: number;
}

/** Telegram — full 1200x600 (exact 2:1) angular HUD card. Values match the original rankup.ts exactly. */
const TELEGRAM_CONFIG: PlatformConfig = {
  width: 1200,
  height: 600,
  panelPad: 48,
  panelR: 22,
  panelCut: 42,
  bracketLen: 30,
  avatarCxOffset: 196,
  avatarR: 122,
  contentXOffset: 100,
  rightEdgeOffset: 60,
  chipFontStart: 18,
  chipFontMin: 12,
  chipHeightPad: 24,
  chipHeightMin: 34,
  eyebrowFontSize: 15,
  eyebrowShadowBlur: 10,
  usernameFontMax: 46,
  usernameFontMin: 26,
  relEyebrowBaseline: 11,
  relUsernameGap: 58,
  relChipsGap: 38,
  relReadoutGap: 34,
  blockExtra: 4,
  chevronHalf: 6,
  chevronFwd: 8,
  chevronAdvance: 32,
  chevronLineWidth: 2.5,
  chevronShadowBlur: 8,
  xpFontMax: 16,
  xpFontMin: 12,
  xpOffsetX: 18,
  xpRectSize: 6,
  rankFontStart: 18,
  rankFontMin: 12,
  rankMeasurePad: 54,
  rankMaxWidthPanelPad: 32,
  rankMaxWidthAvatarGap: 40,
  rankChipHeight: 44,
  rankChipY: 64,
  rankCut: 12,
  rankDotR: 4,
  rankDotOffset: 22,
  rankShadowBlur: 16,
  rankShadowOffsetY: 6,
  rankDotShadowBlur: 8,
  rankLabelFontSize: 11,
  rankLabelOffsetX: 36,
  rankLabelOffsetY: -8,
  rankValueOffsetX: 36,
  rankValueOffsetY: 10,
};

/** Discord — standard 1200x400 banner sized for level-up messages. Values match the original rankup2.ts exactly. */
const DISCORD_CONFIG: PlatformConfig = {
  width: 1200,
  height: 400,
  panelPad: 22,
  panelR: 14,
  panelCut: 26,
  bracketLen: 20,
  avatarCxOffset: 150,
  avatarR: 84,
  contentXOffset: 68,
  rightEdgeOffset: 44,
  chipFontStart: 15,
  chipFontMin: 11,
  chipHeightPad: 16,
  chipHeightMin: 26,
  eyebrowFontSize: 12,
  eyebrowShadowBlur: 6,
  usernameFontMax: 32,
  usernameFontMin: 18,
  relEyebrowBaseline: 8,
  relUsernameGap: 38,
  relChipsGap: 22,
  relReadoutGap: 26,
  blockExtra: 4,
  chevronHalf: 5,
  chevronFwd: 6,
  chevronAdvance: 24,
  chevronLineWidth: 2,
  chevronShadowBlur: 6,
  xpFontMax: 14,
  xpFontMin: 11,
  xpOffsetX: 15,
  xpRectSize: 5,
  rankFontStart: 15,
  rankFontMin: 10,
  rankMeasurePad: 44,
  rankMaxWidthPanelPad: 24,
  rankMaxWidthAvatarGap: 32,
  rankChipHeight: 34,
  rankChipY: 28,
  rankCut: 9,
  rankDotR: 3,
  rankDotOffset: 18,
  rankShadowBlur: 12,
  rankShadowOffsetY: 4,
  rankDotShadowBlur: 7,
  rankLabelFontSize: 9,
  rankLabelOffsetX: 28,
  rankLabelOffsetY: -7,
  rankValueOffsetX: 28,
  rankValueOffsetY: 8,
};

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  telegram: TELEGRAM_CONFIG,
  discord: DISCORD_CONFIG,
};

/** Resolves the `platform` param, defaulting to Telegram (the original rankup.ts behavior) for anything unrecognized. */
function resolvePlatform(value: unknown): Platform {
  if (typeof value !== 'string' || !value.trim()) return 'telegram';
  return PLATFORM_ALIASES[normalizeColorKey(value)] ?? 'telegram';
}

export const meta: ApiMeta = {
  name: 'Rank Up',
  desc: 'Generate a premium, futuristic/cybernetic rank-up card — an angular HUD-style surface with an optional user-provided background photo, hex avatar frame (with a generated fallback emblem when no avatar is given), and a clean level-transition readout. Choose "platform" to switch between the full Telegram card (exact 2:1) and the compact Discord banner',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'platform',
      desc: 'Which layout to render: the full 2:1 Telegram card, or the compact Discord banner',
      example: 'Telegram',
      required: false,
      type: 'select',
      options: ['Telegram', 'Discord'],
    },
    {
      name: 'avatar',
      desc: "User's avatar image. Optional — a generated cyber emblem is used when omitted",
      example: 'https://avatars.githubusercontent.com/u/180540408?v=4',
      required: false,
      type: 'image',
    },
    {
      name: 'background',
      desc: 'Optional background photo shown inside the card behind the content, automatically darkened for text readability',
      example: 'https://imgs.search.brave.com/ne6Eq3YZpHXiaN4CudO8RRDhDYLW7YRuWE83RYN26Eo/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/d2FsbHBhcGVyc2Fm/YXJpLmNvbS8xMi8x/L0kxQURhay5wbmc',
      required: false,
      type: 'image',
    },
    {
      name: 'username',
      desc: 'Display name shown on the card',
      example: 'DrakenDev',
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
      name: 'xpText',
      desc: 'Optional small readout line shown beneath the level chips (e.g. an XP total or custom note)',
      example: '6,800 / 10,000 XP',
      required: false,
      type: 'text',
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
      desc: 'Accent color used for the frame, glow, and level badge',
      example: 'Cyan',
      required: false,
      type: 'select',
      options: NAMED_COLORS.map((c) => c.name),
    },
  ],
};

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

function lighten([r, g, b]: Rgb, amt: number): Rgb {
  return [Math.min(255, r + amt), Math.min(255, g + amt), Math.min(255, b + amt)];
}

/**
 * Resolves an avatar param (remote URL or an uploaded `data:` URI from the
 * docs UI) down to a temp file and loads it with loadImage(). Writing to
 * disk first avoids the "@napi-rs/canvas" "Invalid SVG image" bug that
 * occurs when passing a raw Buffer directly. Returns null (rather than
 * throwing) on any fetch/decode failure so the card can fall back to the
 * generated emblem instead of erroring the whole request.
 */
async function loadAvatarImage(source: string, prefix: string): Promise<LoadedImage | null> {
  try {
    let buf: Buffer;
    let ext = 'jpg';

    if (source.startsWith('data:')) {
      const commaIndex = source.indexOf(',');
      if (commaIndex === -1) return null;
      const mime = source.slice(5, commaIndex).split(';')[0] || 'image/jpeg';
      ext = mime.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'jpg';
      buf = Buffer.from(source.slice(commaIndex + 1), 'base64');
    } else {
      const res = await fetch(source);
      if (!res.ok) return null;

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
  } catch {
    return null;
  }
}

/** Rounded rect with two opposite corners clipped diagonally — the core "tech panel" silhouette. */
function cyberPanelPath(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number, cut: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
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

/** Thin HUD corner bracket, drawn pointing inward from (x, y) by dx/dy sign. */
function drawCornerBracket(ctx: SKRSContext2D, x: number, y: number, dx: number, dy: number, len: number, color: Rgb): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.85);
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = rgba(color, 0.8);
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x, y + dy * len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dx * len, y);
  ctx.stroke();
  ctx.restore();
}

/** Deep-space background: gradient base, faint dot grid, and two restrained accent glows. Sized to (width, height). */
function drawBackground(ctx: SKRSContext2D, color: Rgb, width: number, height: number): void {
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#05070b');
  base.addColorStop(0.55, '#080a10');
  base.addColorStop(1, '#050609');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glowTL = ctx.createRadialGradient(width * 0.1, height * 0.05, 0, width * 0.1, height * 0.05, 560);
  glowTL.addColorStop(0, rgba(color, 0.16));
  glowTL.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glowTL;
  ctx.fillRect(0, 0, width, height);

  const glowBR = ctx.createRadialGradient(width * 0.98, height * 1.02, 0, width * 0.98, height * 1.02, 460);
  glowBR.addColorStop(0, rgba(color, 0.1));
  glowBR.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glowBR;
  ctx.fillRect(0, 0, width, height);

  // Faint tech dot-grid — subtle texture, not a loud HUD backdrop.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let gy = 20; gy < height; gy += 28) {
    for (let gx = 20; gx < width; gx += 28) {
      ctx.fillRect(gx, gy, 1, 1);
    }
  }
  ctx.restore();
}

/** Draws `image` inside (x, y, w, h) using "cover" fit — scaled and center-cropped to fill the box with no distortion or letterboxing. */
function drawCoverImage(ctx: SKRSContext2D, image: LoadedImage, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / image.width, h / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const offsetX = x + (w - drawW) / 2;
  const offsetY = y + (h - drawH) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawW, drawH);
}

/** Angular cyber panel that hosts all content, with a gradient edge, hairline border, and corner brackets. */
function drawPanel(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgb,
  backgroundImage: LoadedImage | null,
  r: number,
  cut: number,
  bracketLen: number,
  bracketInset: number
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 22;
  cyberPanelPath(ctx, x, y, w, h, r, cut);
  ctx.fillStyle = '#0c0e13';
  ctx.fill();
  ctx.restore();

  // Optional user-provided background photo, cover-fit and clipped to the panel silhouette,
  // then darkened with a scrim so every text/HUD element on top stays readable.
  if (backgroundImage) {
    ctx.save();
    cyberPanelPath(ctx, x, y, w, h, r, cut);
    ctx.clip();
    drawCoverImage(ctx, backgroundImage, x, y, w, h);

    const scrim = ctx.createLinearGradient(x, 0, x + w, 0);
    scrim.addColorStop(0, 'rgba(4, 5, 8, 0.5)');
    scrim.addColorStop(0.55, 'rgba(4, 5, 8, 0.36)');
    scrim.addColorStop(1, 'rgba(4, 5, 8, 0.24)');
    ctx.fillStyle = scrim;
    ctx.fillRect(x, y, w, h);

    const vignette = ctx.createRadialGradient(x + w / 2, y + h / 2, h * 0.2, x + w / 2, y + h / 2, w * 0.75);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
    ctx.fillStyle = vignette;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  ctx.save();
  cyberPanelPath(ctx, x, y, w, h, r, cut);
  ctx.clip();
  const sheen = ctx.createLinearGradient(0, y, 0, y + h);
  sheen.addColorStop(0, backgroundImage ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)');
  sheen.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  ctx.save();
  cyberPanelPath(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r, cut);
  const borderGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  borderGrad.addColorStop(0, rgba(color, 0.55));
  borderGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.08)');
  borderGrad.addColorStop(1, rgba(color, 0.4));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Notch accent fill at the clipped top-right corner.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fillStyle = rgba(color, 0.7);
  ctx.fill();
  ctx.restore();

  drawCornerBracket(ctx, x + bracketInset, y + bracketInset, 1, 1, bracketLen, color);
  drawCornerBracket(ctx, x + w - bracketInset, y + h - bracketInset, -1, -1, bracketLen, color);
}

/** Simple stylized silhouette used as the fallback avatar when none is supplied. */
function drawFallbackGlyph(ctx: SKRSContext2D, cx: number, cy: number, r: number, color: Rgb): void {
  ctx.save();
  ctx.fillStyle = rgba(lighten(color, 0), 0.16);
  drawHexPath(ctx, cx, cy, r);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = rgba(color, 0.9);
  // Head
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.22, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  // Shoulders
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy + r * 0.55);
  ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.1, cx, cy + r * 0.1);
  ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.1, cx + r * 0.5, cy + r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Faint circuit ticks radiating from center for a techy feel.
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.35);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) continue;
    const angle = (Math.PI * 2 * i) / 12;
    const rr1 = r * 0.86;
    const rr2 = r * 0.96;
    ctx.beginPath();
    ctx.moveTo(cx + rr1 * Math.cos(angle), cy + rr1 * Math.sin(angle));
    ctx.lineTo(cx + rr2 * Math.cos(angle), cy + rr2 * Math.sin(angle));
    ctx.stroke();
  }
  ctx.restore();
}

function drawAvatar(ctx: SKRSContext2D, image: LoadedImage | null, cx: number, cy: number, r: number, color: Rgb): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.28);
  ctx.lineWidth = 2;
  drawHexPath(ctx, cx, cy, r + 22);
  ctx.stroke();

  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = 3;
  ctx.shadowColor = rgba(color, 0.85);
  ctx.shadowBlur = 20;
  drawHexPath(ctx, cx, cy, r + 10);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  drawHexPath(ctx, cx, cy, r);
  ctx.clip();
  if (image) {
    ctx.drawImage(image, cx - r, cy - r, r * 2, r * 2);
  } else {
    const bgGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bgGrad.addColorStop(0, '#14161d');
    bgGrad.addColorStop(1, '#0a0b0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();

  if (!image) {
    drawFallbackGlyph(ctx, cx, cy, r, color);
  }

  ctx.save();
  ctx.strokeStyle = rgba(color, 1);
  ctx.lineWidth = 2;
  drawHexPath(ctx, cx, cy, r);
  ctx.stroke();
  ctx.restore();

  // Tick marks around the outer hex ring.
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.65);
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

  // Small hex level-up badge, overlapping bottom-right of the frame.
  const badgeR = r * 0.24;
  const badgeCx = cx + r * 0.78;
  const badgeCy = cy + r * 0.78;

  ctx.save();
  drawHexPath(ctx, badgeCx, badgeCy, badgeR + 6);
  ctx.fillStyle = '#0a0b0f';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = rgba(color, 0.6);
  ctx.shadowBlur = 16;
  drawHexPath(ctx, badgeCx, badgeCy, badgeR);
  const badgeGrad = ctx.createLinearGradient(badgeCx, badgeCy - badgeR, badgeCx, badgeCy + badgeR);
  badgeGrad.addColorStop(0, rgba(lighten(color, 30), 1));
  badgeGrad.addColorStop(1, rgba(color, 1));
  ctx.fillStyle = badgeGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#0a0b0f';
  ctx.lineWidth = Math.max(2.5, badgeR * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cw = badgeR * 0.68;
  const chY = badgeCy + badgeR * 0.14;
  ctx.beginPath();
  ctx.moveTo(badgeCx - cw * 0.55, chY + cw * 0.42);
  ctx.lineTo(badgeCx, chY - cw * 0.42);
  ctx.lineTo(badgeCx + cw * 0.55, chY + cw * 0.42);
  ctx.stroke();
  ctx.restore();
}

/** Draws left-aligned text, shrinking the font size (down to minSize) until it fits maxWidth. Returns the rendered width. */
function fitText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  weight: string,
  maxSize: number,
  minSize: number,
  fillStyle: string
): number {
  let size = maxSize;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  while (size > minSize) {
    ctx.font = `${weight} ${size}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  ctx.font = `${weight} ${size}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 1) {
    out = out.slice(0, -1);
  }
  if (out !== text) out = `${out.slice(0, -1)}…`;
  ctx.fillStyle = fillStyle;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 2;
  ctx.fillText(out, x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  return ctx.measureText(out).width;
}

/** Angular tech chip (rounded rect with two small clipped corners) sized to its own text — never overflows its font box. */
function drawChip(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  text: string,
  opts: { fill: string; textColor: string; fontSize: number; weight: string; paddingX?: number; height?: number; border?: string }
): number {
  const paddingX = opts.paddingX ?? 18;
  const h = opts.height ?? 40;
  const font = `${opts.weight} ${opts.fontSize}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
  ctx.save();
  ctx.font = font;
  const textW = ctx.measureText(text).width;
  const w = textW + paddingX * 2;
  const cut = h * 0.32;

  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + cut);
  ctx.closePath();

  ctx.fillStyle = opts.fill;
  ctx.fill();
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.fillStyle = opts.textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + paddingX, y + h / 2 + 1);
  ctx.restore();

  return w;
}

export const onStart: ApiHandler = async ({ req, res }) => {
  const body = (req.method === 'POST' ? req.body : req.query) as Record<string, unknown>;

  const platform = resolvePlatform(body?.platform);
  const cfg = PLATFORM_CONFIGS[platform];

  const avatar = typeof body?.avatar === 'string' && body.avatar.trim() ? body.avatar.trim() : null;
  const background = typeof body?.background === 'string' && body.background.trim() ? body.background.trim() : null;
  const username = typeof body?.username === 'string' ? body.username : undefined;
  const levelRaw = body?.level;

  if (!username) {
    return res.status(400).json({ error: 'Missing required parameter: username' });
  }
  if (levelRaw === undefined || levelRaw === '') {
    return res.status(400).json({ error: 'Missing required parameter: level' });
  }

  const level = clampNum(levelRaw, 1, 1, 999999);
  const previousLevel = clampNum(body?.previousLevel, level - 1, 0, level);
  const rank =
    body?.rank !== undefined && body?.rank !== '' ? clampNum(body.rank, 0, 1, 999999) : null;
  const xpText = typeof body?.xpText === 'string' && body.xpText.trim() ? body.xpText.trim() : null;

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
    const WIDTH = cfg.width;
    const HEIGHT = cfg.height;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    drawBackground(ctx, color, WIDTH, HEIGHT);

    const panelX = cfg.panelPad;
    const panelY = cfg.panelPad;
    const panelW = WIDTH - panelX * 2;
    const panelH = HEIGHT - panelY * 2;

    const backgroundImg = background ? await loadAvatarImage(background, `rankup_${platform}_bg`) : null;
    const bracketInset = platform === 'telegram' ? 16 : 12;
    drawPanel(ctx, panelX, panelY, panelW, panelH, color, backgroundImg, cfg.panelR, cfg.panelCut, cfg.bracketLen, bracketInset);

    const avatarImg = avatar ? await loadAvatarImage(avatar, `rankup_${platform}_avatar`) : null;
    const cx = panelX + cfg.avatarCxOffset;
    const cy = HEIGHT / 2;
    const r = cfg.avatarR;
    drawAvatar(ctx, avatarImg, cx, cy, r, color);

    const contentX = cx + r + cfg.contentXOffset;
    const rightEdge = panelX + panelW - cfg.rightEdgeOffset;
    const maxContentW = Math.max(80, rightEdge - contentX);

    // Determine the level-chip size first (pure width math) so the whole
    // content block's height — and therefore its vertical center — is known
    // before anything is drawn, so it can be balanced against the avatar.
    const rowMaxW = maxContentW;
    let chipFont = cfg.chipFontStart;
    const measureRowWidth = (fs: number): number => {
      ctx.font = `700 ${fs}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      const prevTextW = ctx.measureText(`LV ${previousLevel}`).width + 36;
      const nextTextW = ctx.measureText(`LV ${level}`).width + 36;
      return prevTextW + 40 + nextTextW;
    };
    while (chipFont > cfg.chipFontMin && measureRowWidth(chipFont) > rowMaxW) chipFont -= 1;
    const chipH = Math.max(cfg.chipHeightMin, chipFont + cfg.chipHeightPad);

    // Relative layout (as if the block started at y = 0) used purely to work
    // out the total block height so it can be centered on the avatar's cy.
    const relEyebrowBaseline = cfg.relEyebrowBaseline;
    const relUsernameBaseline = relEyebrowBaseline + cfg.relUsernameGap;
    const relChipsTop = relUsernameBaseline + cfg.relChipsGap;
    const relChipsBottom = relChipsTop + chipH;
    const relReadoutBaseline = relChipsBottom + cfg.relReadoutGap;
    const blockHeight = xpText ? relReadoutBaseline + cfg.blockExtra : relChipsBottom;

    const blockTop = cy - blockHeight / 2;
    const eyebrowY = blockTop + relEyebrowBaseline;
    const usernameY = blockTop + relUsernameBaseline;
    const levelRowY = blockTop + relChipsTop;
    const readoutY = blockTop + relReadoutBaseline;

    // Eyebrow — bracketed tech label.
    ctx.save();
    ctx.font = `700 ${cfg.eyebrowFontSize}px "Courier New", monospace`;
    ctx.fillStyle = rgba(color, 1);
    ctx.shadowColor = rgba(color, 0.7);
    ctx.shadowBlur = cfg.eyebrowShadowBlur;
    ctx.textAlign = 'left';
    ctx.fillText('[ LEVEL UP ]', contentX, eyebrowY);
    ctx.restore();

    // Username — the primary title, auto-shrinks to guarantee no overflow.
    fitText(ctx, username, contentX, usernameY, maxContentW, '700', cfg.usernameFontMax, cfg.usernameFontMin, '#f5f6f8');

    // Level transition — two angular chips joined by a double-chevron.
    let cursorX = contentX;

    const prevW = drawChip(ctx, cursorX, levelRowY, `LV ${previousLevel}`, {
      fill: 'rgba(10, 12, 16, 0.55)',
      textColor: 'rgba(255, 255, 255, 0.75)',
      fontSize: chipFont,
      weight: '600',
      height: chipH,
      border: 'rgba(255, 255, 255, 0.2)',
    });
    cursorX += prevW + 14;

    ctx.save();
    ctx.strokeStyle = rgba(color, 0.9);
    ctx.lineWidth = cfg.chevronLineWidth;
    ctx.lineCap = 'round';
    ctx.shadowColor = rgba(color, 0.7);
    ctx.shadowBlur = cfg.chevronShadowBlur;
    const arrowY = levelRowY + chipH / 2;
    const half = cfg.chevronHalf;
    const fwd = cfg.chevronFwd;
    ctx.beginPath();
    ctx.moveTo(cursorX, arrowY - half);
    ctx.lineTo(cursorX + fwd, arrowY);
    ctx.lineTo(cursorX, arrowY + half);
    ctx.moveTo(cursorX + fwd + 1, arrowY - half);
    ctx.lineTo(cursorX + fwd + 1 + fwd, arrowY);
    ctx.lineTo(cursorX + fwd + 1, arrowY + half);
    ctx.stroke();
    ctx.restore();
    cursorX += cfg.chevronAdvance;

    drawChip(ctx, cursorX, levelRowY, `LV ${level}`, {
      fill: rgba(color, 1),
      textColor: '#05070b',
      fontSize: chipFont,
      weight: '700',
      height: chipH,
    });

    // Optional readout line beneath the chips — plain text, no bar.
    if (xpText) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(contentX, readoutY - (cfg.xpRectSize + 2), cfg.xpRectSize, cfg.xpRectSize);
      ctx.fillStyle = rgba(color, 0.9);
      ctx.fill();
      ctx.restore();

      fitText(
        ctx,
        xpText,
        contentX + cfg.xpOffsetX,
        readoutY,
        maxContentW - cfg.xpOffsetX,
        '500',
        cfg.xpFontMax,
        cfg.xpFontMin,
        'rgba(255, 255, 255, 0.55)'
      );
    }

    // Rank chip — top-right elevated tech chip, dynamically sized so it can never overflow the panel.
    if (rank !== null) {
      const chipLabel = `#${rank}`;
      let rankFont = cfg.rankFontStart;
      ctx.font = `700 ${rankFont}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      let rankChipW = ctx.measureText(chipLabel).width + ctx.measureText('RANK').width + cfg.rankMeasurePad;
      const maxRankChipW = panelW - cfg.rankMaxWidthPanelPad - (cx + r + cfg.rankMaxWidthAvatarGap - panelX);
      while (rankFont > cfg.rankFontMin && rankChipW > maxRankChipW) {
        rankFont -= 1;
        ctx.font = `700 ${rankFont}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
        rankChipW = ctx.measureText(chipLabel).width + ctx.measureText('RANK').width + cfg.rankMeasurePad;
      }
      const chipW = Math.min(rankChipW, maxRankChipW);
      const chipHgt = cfg.rankChipHeight;
      const chipX = rightEdge - chipW;
      const chipY = cfg.rankChipY;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = cfg.rankShadowBlur;
      ctx.shadowOffsetY = cfg.rankShadowOffsetY;
      const cut = cfg.rankCut;
      ctx.beginPath();
      ctx.moveTo(chipX + cut, chipY);
      ctx.lineTo(chipX + chipW, chipY);
      ctx.lineTo(chipX + chipW, chipY + chipHgt - cut);
      ctx.lineTo(chipX + chipW - cut, chipY + chipHgt);
      ctx.lineTo(chipX, chipY + chipHgt);
      ctx.lineTo(chipX, chipY + cut);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.fill();
      ctx.strokeStyle = rgba(color, 0.45);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(chipX + cfg.rankDotOffset, chipY + chipHgt / 2, cfg.rankDotR, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 1);
      ctx.shadowColor = rgba(color, 0.9);
      ctx.shadowBlur = cfg.rankDotShadowBlur;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${cfg.rankLabelFontSize}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('RANK', chipX + cfg.rankLabelOffsetX, chipY + chipHgt / 2 + cfg.rankLabelOffsetY);
      ctx.font = `700 ${rankFont}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      ctx.fillStyle = '#f5f6f8';
      ctx.fillText(chipLabel, chipX + cfg.rankValueOffsetX, chipY + chipHgt / 2 + cfg.rankValueOffsetY);
      ctx.restore();
    }

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};