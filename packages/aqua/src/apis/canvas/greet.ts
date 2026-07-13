import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ApiHandler, ApiMeta } from '@/types.js';

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
function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

const NAMED_COLOR_LOOKUP = new Map(NAMED_COLORS.map((c) => [normalizeKey(c.name), c.hex]));

/** Resolves a named color only. Raw hex values are not allowed. */
function resolveColor(value: unknown, fallback: string): Rgb {
  if (typeof value !== 'string' || !value.trim()) {
    return hexToRgb(NAMED_COLOR_LOOKUP.get(normalizeKey(fallback))!);
  }

  const hex = NAMED_COLOR_LOOKUP.get(normalizeKey(value));

  if (!hex) {
    throw new Error(`Invalid color. Allowed colors are: ${NAMED_COLORS.map((c) => c.name).join(', ')}`);
  }

  return hexToRgb(hex);
}

/** Platforms this endpoint can render for. Telegram renders the full 2:1 card; Discord renders the compact banner. */
type Platform = 'telegram' | 'discord';
/** Event this card celebrates (or mourns): a member arriving, or a member leaving. */
type EventType = 'welcome' | 'goodbye';

const PLATFORM_ALIASES: Record<string, Platform> = {
  telegram: 'telegram',
  tg: 'telegram',
  discord: 'discord',
  dc: 'discord',
};

const EVENT_ALIASES: Record<string, EventType> = {
  welcome: 'welcome',
  join: 'welcome',
  hello: 'welcome',
  goodbye: 'goodbye',
  leave: 'goodbye',
  bye: 'goodbye',
};

/** Layout constants that differ between the Telegram card and the Discord banner — geometry mirrors the rankup HUD panel exactly. */
interface PlatformConfig {
  width: number;
  height: number;
  panelPad: number;
  panelR: number;
  panelCut: number;
  bracketLen: number;
  bracketInset: number;
  avatarCxOffset: number;
  avatarR: number;
  contentXOffset: number;
  rightEdgeOffset: number;
  chipFont: number;
  chipFontMin: number;
  chipHeightPad: number;
  chipHeightMin: number;
  eyebrowFontSize: number;
  eyebrowShadowBlur: number;
  usernameFontMax: number;
  usernameFontMin: number;
  relEyebrowBaseline: number;
  relUsernameGap: number;
  relChipGap: number;
  relReadoutGap: number;
  blockExtra: number;
  msgFontMax: number;
  msgFontMin: number;
  msgOffsetX: number;
  msgRectSize: number;
  badgeChipHeight: number;
  badgeChipY: number;
  badgeCut: number;
  badgeDotR: number;
  badgeDotOffset: number;
  badgeShadowBlur: number;
  badgeShadowOffsetY: number;
  badgeDotShadowBlur: number;
  badgeLabelFontSize: number;
  badgeLabelOffsetX: number;
  badgeLabelOffsetY: number;
  badgeValueOffsetX: number;
  badgeValueOffsetY: number;
  badgeMeasurePad: number;
  badgeMaxWidthPanelPad: number;
  badgeMaxWidthAvatarGap: number;
}

/** Telegram — full 1200x600 (exact 2:1) angular HUD card, same panel geometry as the Rank Up card. */
const TELEGRAM_CONFIG: PlatformConfig = {
  width: 1200,
  height: 600,
  panelPad: 48,
  panelR: 22,
  panelCut: 42,
  bracketLen: 30,
  bracketInset: 16,
  avatarCxOffset: 196,
  avatarR: 122,
  contentXOffset: 100,
  rightEdgeOffset: 60,
  chipFont: 18,
  chipFontMin: 12,
  chipHeightPad: 24,
  chipHeightMin: 34,
  eyebrowFontSize: 15,
  eyebrowShadowBlur: 10,
  usernameFontMax: 46,
  usernameFontMin: 26,
  relEyebrowBaseline: 11,
  relUsernameGap: 58,
  relChipGap: 38,
  relReadoutGap: 34,
  blockExtra: 4,
  msgFontMax: 18,
  msgFontMin: 13,
  msgOffsetX: 18,
  msgRectSize: 6,
  badgeChipHeight: 44,
  badgeChipY: 64,
  badgeCut: 12,
  badgeDotR: 4,
  badgeDotOffset: 22,
  badgeShadowBlur: 16,
  badgeShadowOffsetY: 6,
  badgeDotShadowBlur: 8,
  badgeLabelFontSize: 11,
  badgeLabelOffsetX: 36,
  badgeLabelOffsetY: -8,
  badgeValueOffsetX: 36,
  badgeValueOffsetY: 10,
  badgeMeasurePad: 54,
  badgeMaxWidthPanelPad: 32,
  badgeMaxWidthAvatarGap: 40,
};

/** Discord — standard 1024x512 card, same panel geometry as the Rank Up banner. */
const DISCORD_CONFIG: PlatformConfig = {
  width: 1024,
  height: 512,
  panelPad: 22,
  panelR: 14,
  panelCut: 26,
  bracketLen: 20,
  bracketInset: 12,
  avatarCxOffset: 150,
  avatarR: 84,
  contentXOffset: 68,
  rightEdgeOffset: 44,
  chipFont: 15,
  chipFontMin: 11,
  chipHeightPad: 16,
  chipHeightMin: 26,
  eyebrowFontSize: 12,
  eyebrowShadowBlur: 6,
  usernameFontMax: 32,
  usernameFontMin: 18,
  relEyebrowBaseline: 8,
  relUsernameGap: 38,
  relChipGap: 22,
  relReadoutGap: 26,
  blockExtra: 4,
  msgFontMax: 14,
  msgFontMin: 11,
  msgOffsetX: 15,
  msgRectSize: 5,
  badgeChipHeight: 34,
  badgeChipY: 28,
  badgeCut: 9,
  badgeDotR: 3,
  badgeDotOffset: 18,
  badgeShadowBlur: 12,
  badgeShadowOffsetY: 4,
  badgeDotShadowBlur: 7,
  badgeLabelFontSize: 9,
  badgeLabelOffsetX: 28,
  badgeLabelOffsetY: -7,
  badgeValueOffsetX: 28,
  badgeValueOffsetY: 8,
  badgeMeasurePad: 44,
  badgeMaxWidthPanelPad: 24,
  badgeMaxWidthAvatarGap: 32,
};

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  telegram: TELEGRAM_CONFIG,
  discord: DISCORD_CONFIG,
};

function resolvePlatform(value: unknown): Platform {
  if (typeof value !== 'string' || !value.trim()) return 'telegram';
  return PLATFORM_ALIASES[normalizeKey(value)] ?? 'telegram';
}

function resolveEventType(value: unknown): EventType {
  if (typeof value !== 'string' || !value.trim()) return 'welcome';
  return EVENT_ALIASES[normalizeKey(value)] ?? 'welcome';
}

export const meta: ApiMeta = {
  name: 'Greet',
  desc: 'Generate a welcome or goodbye card in the same futuristic/cybernetic HUD style as Rank Up — an angular panel with an optional user-provided background photo, hex avatar frame (with a generated fallback emblem when no avatar is given), and a member-count readout. Choose "platform" to switch between the full Telegram card (exact 2:1) and the compact Discord banner, and "type" to switch between a welcome and a goodbye message',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'type',
      desc: 'Whether this is a welcome (member joined) or goodbye (member left) card',
      example: 'Welcome',
      required: false,
      type: 'select',
      options: ['Welcome', 'Goodbye'],
    },
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
      example: 'https://imgs.search.brave.com/KxCmyTQIF4v77gGqNeMe7Z6WJsREq-sV2GEeyjffGmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/d2FsbHBhcGVyc2Fm/YXJpLmNvbS83My82/MS9nNXN5TGwucG5n',
      required: false,
      type: 'image',
    },
    {
      name: 'username',
      desc: 'Display name of the member joining or leaving',
      example: 'DrakenDev',
      required: true,
      type: 'text',
    },
    {
      name: 'serverName',
      desc: 'Name of the server/group shown beneath the username',
      example: 'Arbiter HQ',
      required: false,
      type: 'text',
    },
    {
      name: 'message',
      desc: 'Optional small readout line beneath the member chip (e.g. a custom greeting or farewell note)',
      example: 'Glad to have you here!',
      required: false,
      type: 'text',
    },
    {
      name: 'memberCount',
      desc: 'Current member count to badge in the corner',
      example: '128',
      required: false,
      type: 'number',
    },
    {
      name: 'color',
      desc: 'Accent color used for the frame, glow, and member badge (defaults to Green for welcome, Red for goodbye)',
      example: 'Green',
      required: false,
      type: 'select',
      options: NAMED_COLORS.map((c) => c.name),
    },
  ],
};

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

function clampNum(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Resolves an avatar/background param (remote URL or an uploaded `data:` URI
 * from the docs UI) down to a temp file and loads it with loadImage().
 * Writing to disk first avoids the "@napi-rs/canvas" "Invalid SVG image" bug
 * that occurs when passing a raw Buffer directly. Returns null (rather than
 * throwing) on any fetch/decode failure so the card can fall back to the
 * generated emblem instead of erroring the whole request.
 */
async function loadRemoteImage(source: string, prefix: string): Promise<LoadedImage | null> {
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
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.22, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.5, cy + r * 0.55);
  ctx.quadraticCurveTo(cx - r * 0.5, cy + r * 0.1, cx, cy + r * 0.1);
  ctx.quadraticCurveTo(cx + r * 0.5, cy + r * 0.1, cx + r * 0.5, cy + r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

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

/** Hex avatar frame with tick-marked ring and a small badge overlapping the bottom-right — a "+" for welcome, a "–" for goodbye. */
function drawAvatar(
  ctx: SKRSContext2D,
  image: LoadedImage | null,
  cx: number,
  cy: number,
  r: number,
  color: Rgb,
  eventType: EventType
): void {
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

  // Small hex badge, overlapping bottom-right of the frame.
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
  const armLen = badgeR * 0.55;
  if (eventType === 'welcome') {
    // Plus sign — a new member arriving.
    ctx.beginPath();
    ctx.moveTo(badgeCx - armLen, badgeCy);
    ctx.lineTo(badgeCx + armLen, badgeCy);
    ctx.moveTo(badgeCx, badgeCy - armLen);
    ctx.lineTo(badgeCx, badgeCy + armLen);
    ctx.stroke();
  } else {
    // Minus sign — a member departing.
    ctx.beginPath();
    ctx.moveTo(badgeCx - armLen, badgeCy);
    ctx.lineTo(badgeCx + armLen, badgeCy);
    ctx.stroke();
  }
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

  const eventType = resolveEventType(body?.type);
  const platform = resolvePlatform(body?.platform);
  const cfg = PLATFORM_CONFIGS[platform];

  const avatar = typeof body?.avatar === 'string' && body.avatar.trim() ? body.avatar.trim() : null;
  const background = typeof body?.background === 'string' && body.background.trim() ? body.background.trim() : null;
  const username = typeof body?.username === 'string' ? body.username : undefined;

  if (!username) {
    return res.status(400).json({ error: 'Missing required parameter: username' });
  }

  const serverName = typeof body?.serverName === 'string' && body.serverName.trim() ? body.serverName.trim() : null;
  const message = typeof body?.message === 'string' && body.message.trim() ? body.message.trim() : null;
  const memberCount =
    body?.memberCount !== undefined && body?.memberCount !== '' ? clampNum(body.memberCount, 0, 0, 999999999) : null;

  const defaultColor = eventType === 'welcome' ? 'Green' : 'Red';
  let color: Rgb;
  try {
    color = resolveColor(body?.color, defaultColor);
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

    const backgroundImg = background ? await loadRemoteImage(background, `greet_${platform}_bg`) : null;
    drawPanel(ctx, panelX, panelY, panelW, panelH, color, backgroundImg, cfg.panelR, cfg.panelCut, cfg.bracketLen, cfg.bracketInset);

    const avatarImg = avatar ? await loadRemoteImage(avatar, `greet_${platform}_avatar`) : null;
    const cx = panelX + cfg.avatarCxOffset;
    const cy = HEIGHT / 2;
    const r = cfg.avatarR;
    drawAvatar(ctx, avatarImg, cx, cy, r, color, eventType);

    const contentX = cx + r + cfg.contentXOffset;
    const rightEdge = panelX + panelW - cfg.rightEdgeOffset;
    const maxContentW = Math.max(80, rightEdge - contentX);

    // Status chip label — sized first (pure width math) so the block height is known before anything is drawn.
    const statusLabel = eventType === 'welcome' ? 'NEW MEMBER' : 'MEMBER LEFT';
    let chipFont = cfg.chipFont;
    const measureChipWidth = (fs: number): number => {
      ctx.font = `700 ${fs}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      return ctx.measureText(statusLabel).width + 36;
    };
    while (chipFont > cfg.chipFontMin && measureChipWidth(chipFont) > maxContentW) chipFont -= 1;
    const chipH = Math.max(cfg.chipHeightMin, chipFont + cfg.chipHeightPad);

    const relEyebrowBaseline = cfg.relEyebrowBaseline;
    const relUsernameBaseline = relEyebrowBaseline + cfg.relUsernameGap;
    const relChipTop = relUsernameBaseline + cfg.relChipGap;
    const relChipBottom = relChipTop + chipH;
    const relReadoutBaseline = relChipBottom + cfg.relReadoutGap;
    const blockHeight = message ? relReadoutBaseline + cfg.blockExtra : relChipBottom;

    const blockTop = cy - blockHeight / 2;
    const eyebrowY = blockTop + relEyebrowBaseline;
    const usernameY = blockTop + relUsernameBaseline;
    const chipRowY = blockTop + relChipTop;
    const readoutY = blockTop + relReadoutBaseline;

    // Eyebrow — bracketed tech label announcing the event.
    ctx.save();
    ctx.font = `700 ${cfg.eyebrowFontSize}px "Courier New", monospace`;
    ctx.fillStyle = rgba(color, 1);
    ctx.shadowColor = rgba(color, 0.7);
    ctx.shadowBlur = cfg.eyebrowShadowBlur;
    ctx.textAlign = 'left';
    ctx.fillText(eventType === 'welcome' ? '[ WELCOME ]' : '[ GOODBYE ]', contentX, eyebrowY);
    ctx.restore();

    // Username — the primary title, auto-shrinks to guarantee no overflow.
    fitText(ctx, username, contentX, usernameY, maxContentW, '700', cfg.usernameFontMax, cfg.usernameFontMin, '#f5f6f8');

    // Status chip — a single angular chip stating what happened.
    drawChip(ctx, contentX, chipRowY, statusLabel, {
      fill: eventType === 'welcome' ? rgba(color, 1) : 'rgba(10, 12, 16, 0.55)',
      textColor: eventType === 'welcome' ? '#05070b' : 'rgba(255, 255, 255, 0.75)',
      fontSize: chipFont,
      weight: '700',
      height: chipH,
      border: eventType === 'welcome' ? undefined : 'rgba(255, 255, 255, 0.2)',
    });

    // Optional readout line — server name and/or a custom message, beneath the chip.
    const readoutText = [serverName ? `${serverName}` : null, message].filter(Boolean).join('  ·  ') || message || serverName;
    if (readoutText) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(contentX, readoutY - (cfg.msgRectSize + 2), cfg.msgRectSize, cfg.msgRectSize);
      ctx.fillStyle = rgba(color, 0.9);
      ctx.fill();
      ctx.restore();

      fitText(
        ctx,
        readoutText,
        contentX + cfg.msgOffsetX,
        readoutY,
        maxContentW - cfg.msgOffsetX,
        '500',
        cfg.msgFontMax,
        cfg.msgFontMin,
        'rgba(255, 255, 255, 0.55)'
      );
    }

    // Member-count chip — top-right elevated tech chip, dynamically sized so it can never overflow the panel.
    if (memberCount !== null) {
      const chipLabel = `#${memberCount}`;
      let badgeFont = cfg.chipFont;
      ctx.font = `700 ${badgeFont}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      let badgeChipW = ctx.measureText(chipLabel).width + ctx.measureText('MEMBERS').width + cfg.badgeMeasurePad;
      const maxBadgeChipW = panelW - cfg.badgeMaxWidthPanelPad - (cx + r + cfg.badgeMaxWidthAvatarGap - panelX);
      while (badgeFont > cfg.chipFontMin && badgeChipW > maxBadgeChipW) {
        badgeFont -= 1;
        ctx.font = `700 ${badgeFont}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
        badgeChipW = ctx.measureText(chipLabel).width + ctx.measureText('MEMBERS').width + cfg.badgeMeasurePad;
      }
      const chipW = Math.min(badgeChipW, maxBadgeChipW);
      const chipHgt = cfg.badgeChipHeight;
      const chipX = rightEdge - chipW;
      const chipY = cfg.badgeChipY;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = cfg.badgeShadowBlur;
      ctx.shadowOffsetY = cfg.badgeShadowOffsetY;
      const cut = cfg.badgeCut;
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
      ctx.arc(chipX + cfg.badgeDotOffset, chipY + chipHgt / 2, cfg.badgeDotR, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 1);
      ctx.shadowColor = rgba(color, 0.9);
      ctx.shadowBlur = cfg.badgeDotShadowBlur;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${cfg.badgeLabelFontSize}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('MEMBERS', chipX + cfg.badgeLabelOffsetX, chipY + chipHgt / 2 + cfg.badgeLabelOffsetY);
      ctx.font = `700 ${badgeFont}px -apple-system, "SF Pro Display", "Roboto", sans-serif`;
      ctx.fillStyle = '#f5f6f8';
      ctx.fillText(chipLabel, chipX + cfg.badgeValueOffsetX, chipY + chipHgt / 2 + cfg.badgeValueOffsetY);
      ctx.restore();
    }

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};