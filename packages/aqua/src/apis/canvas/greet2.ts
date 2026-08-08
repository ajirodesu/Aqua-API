/**
 * /canvas/greet2 — "Aurora" welcome / goodbye card (V2)
 *
 * The greet.ts counterpart to rankup2.ts: same job (announce a member join
 * or leave), same platform aspect ratios (Telegram 1200x600 exact 2:1,
 * Discord 1024x512 exact 2:1), same param surface — but built on the same
 * calm "glass card" visual language as rankup2.ts (iOS elevation/materials +
 * Material You tonal color/shape) instead of the angular HUD look of V1.
 *
 * Shares its whole visual system with rankup2.ts (card, avatar, fitText,
 * pill, tracked-text, dynamic-background chain) — duplicated in this file
 * rather than imported, consistent with how rankup.ts/greet.ts already keep
 * each canvas endpoint self-contained in this codebase.
 *
 * LAYOUT DISCIPLINE: identical approach to rankup2.ts — every text call goes
 * through fitText (auto-shrink + ellipsis), every pill is measured then
 * sized before being drawn, and the content block's height is a sum of
 * fixed, known row heights gated only by which optional fields (serverName,
 * message) are present — never by how long any string is — so it can be
 * centered on the avatar and clamped inside the card's safe area without
 * any input combination ever overflowing it.
 */

import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';
import { env } from '@/engine/env.config.js';

type Rgb = [number, number, number];
type LoadedImage = Awaited<ReturnType<typeof loadImage>>;

// ─── Accent palette ─────────────────────────────────────────────────────────

/** Same 8-color accent palette as greet.ts / rankup2.ts. */
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

/** Resolves a named color only, with a caller-supplied fallback (greet2 defaults to Green for welcome, Red for goodbye). Raw hex values are not allowed. */
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

function darken([r, g, b]: Rgb, amt: number): Rgb {
  return [Math.max(0, r - amt), Math.max(0, g - amt), Math.max(0, b - amt)];
}

function clampNum(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Picks a readable "on-accent" ink color (near-black or near-white) for text painted on top of a solid accent fill. */
function onAccentInk(color: Rgb): string {
  const [r, g, b] = color;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0b0d10' : '#f7f8fa';
}

// ─── Event type ─────────────────────────────────────────────────────────────

type GreetType = 'welcome' | 'goodbye';

function resolveEventType(value: unknown): GreetType {
  if (typeof value !== 'string') return 'welcome';
  return normalizeKey(value) === 'goodbye' ? 'goodbye' : 'welcome';
}

// ─── Platform config ─────────────────────────────────────────────────────────

/** Platforms this endpoint can render for — both exact 2:1, identical aspect ratios to greet.ts. */
type Platform = 'telegram' | 'discord';

const PLATFORM_ALIASES: Record<string, Platform> = {
  telegram: 'telegram',
  tg: 'telegram',
  discord: 'discord',
  dc: 'discord',
};

interface PlatformConfig {
  width: number;
  height: number;
  cardPad: number;
  cardRadius: number;
  avatarR: number;
  avatarCxOffset: number;
  contentGap: number;
  rightSafePad: number;
  vSafePad: number;

  eyebrowFontSize: number;
  eyebrowTracking: number;
  eyebrowPadX: number;
  eyebrowPadY: number;

  usernameFontMax: number;
  usernameFontMin: number;

  subtitleFontMax: number;
  subtitleFontMin: number;

  messageFontMax: number;
  messageFontMin: number;

  gapEyebrowUsername: number;
  gapUsernameSubtitle: number;
  gapSubtitleMessage: number;

  memberFontStart: number;
  memberFontMin: number;
  memberLabelFont: number;
  memberPillH: number;
  memberPadX: number;
  memberGap: number;
}

/** Telegram — full 1200x600 (exact 2:1) glass card, identical footprint to greet.ts. */
const TELEGRAM_CONFIG: PlatformConfig = {
  width: 1200,
  height: 600,
  cardPad: 40,
  cardRadius: 44,
  avatarR: 118,
  avatarCxOffset: 190,
  contentGap: 76,
  rightSafePad: 56,
  vSafePad: 54,

  eyebrowFontSize: 20,
  eyebrowTracking: 3,
  eyebrowPadX: 18,
  eyebrowPadY: 12,

  usernameFontMax: 48,
  usernameFontMin: 26,

  subtitleFontMax: 22,
  subtitleFontMin: 15,

  messageFontMax: 18,
  messageFontMin: 13,

  gapEyebrowUsername: 22,
  gapUsernameSubtitle: 14,
  gapSubtitleMessage: 18,

  memberFontStart: 24,
  memberFontMin: 14,
  memberLabelFont: 13,
  memberPillH: 52,
  memberPadX: 22,
  memberGap: 10,
};

/** Discord — 1024x512 (exact 2:1), same footprint as greet.ts's Discord layout, scaled proportionally. */
const DISCORD_CONFIG: PlatformConfig = {
  width: 1024,
  height: 512,
  cardPad: 34,
  cardRadius: 38,
  avatarR: 100,
  avatarCxOffset: 162,
  contentGap: 64,
  rightSafePad: 48,
  vSafePad: 46,

  eyebrowFontSize: 17,
  eyebrowTracking: 2.6,
  eyebrowPadX: 16,
  eyebrowPadY: 10,

  usernameFontMax: 40,
  usernameFontMin: 22,

  subtitleFontMax: 19,
  subtitleFontMin: 13,

  messageFontMax: 15,
  messageFontMin: 12,

  gapEyebrowUsername: 18,
  gapUsernameSubtitle: 12,
  gapSubtitleMessage: 15,

  memberFontStart: 20,
  memberFontMin: 12,
  memberLabelFont: 11,
  memberPillH: 44,
  memberPadX: 19,
  memberGap: 9,
};

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  telegram: TELEGRAM_CONFIG,
  discord: DISCORD_CONFIG,
};

/** Resolves the `platform` param, defaulting to Telegram for anything unrecognized. */
function resolvePlatform(value: unknown): Platform {
  if (typeof value !== 'string' || !value.trim()) return 'telegram';
  return PLATFORM_ALIASES[normalizeKey(value)] ?? 'telegram';
}

const FONT_STACK = '-apple-system, "SF Pro Display", "Roboto", sans-serif';

// ─── API meta ─────────────────────────────────────────────────────────────

export const meta: ApiMeta = {
  name: 'Greet V2',
  desc: 'Generate a premium "Aurora" welcome/goodbye card — the greet2 counterpart to Rank Up V2, built on the same calm, fully-rounded glass surface (iOS elevation/materials + Material You tonal color), with a circular avatar (generated initials monogram when none is given) and a member-count assist chip. Choose "type" for welcome vs goodbye and "platform" to switch between the full Telegram card (exact 2:1) and the compact Discord card (exact 2:1)',
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
      desc: 'Which layout to render: the full 2:1 Telegram card, or the compact 2:1 Discord card',
      example: 'Telegram',
      required: false,
      type: 'select',
      options: ['Telegram', 'Discord'],
    },
    {
      name: 'avatar',
      desc: "User's avatar image. Optional — a generated initials monogram is used when omitted",
      example: 'https://avatars.githubusercontent.com/u/180540408?v=4',
      required: false,
      type: 'image',
    },
    {
      name: 'background',
      desc: 'Background mode. "Dynamic" auto-fetches a random scenery photo on every request; "Custom" lets you supply your own image URL via the "backgroundUrl" field below; "None" keeps the plain glass surface',
      example: 'Dynamic',
      required: false,
      type: 'select',
      options: ['None', 'Dynamic', 'Custom'],
      default: 'None',
    },
    {
      name: 'backgroundUrl',
      desc: 'Your own background image URL — only used when "background" is set to Custom',
      example: 'https://imgs.search.brave.com/KxCmyTQIF4v77gGqNeMe7Z6WJsREq-sV2GEeyjffGmg/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/d2FsbHBhcGVyc2Fm/YXJpLmNvbS83My82/MS9nNXN5TGwucG5n',
      required: false,
      type: 'image',
      dependsOn: { param: 'background', value: 'Custom' },
    },
    {
      name: 'backgroundTheme',
      desc: 'Which theme "Dynamic" backgrounds are drawn from. "Random" picks a different theme on every request',
      example: 'Random',
      required: false,
      type: 'select',
      options: [
        'Random',
        'Nature',
        'Cityscape',
        'Dark City',
        'Building',
        'Urban Street',
        'Minimalist',
        'Space',
        'Futuristic',
      ],
      default: 'Random',
      dependsOn: { param: 'background', value: 'Dynamic' },
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
      desc: 'Optional small readout line beneath the server name (e.g. a custom greeting or farewell note)',
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
      desc: 'Accent color used for the ring, eyebrow chip, and member badge (defaults to Green for welcome, Red for goodbye)',
      example: 'Green',
      required: false,
      type: 'select',
      options: NAMED_COLORS.map((c) => c.name),
    },
  ],
};

// ─── Image loading ──────────────────────────────────────────────────────────

/**
 * Resolves an avatar/background param (remote URL or an uploaded `data:` URI
 * from the docs UI) down to a temp file and loads it with loadImage().
 * Returns null (rather than throwing) on any fetch/decode failure so the
 * card can fall back gracefully instead of erroring the whole request.
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

// ─── Dynamic background system (Pixabay → Unsplash → Picsum) ──────────────

interface PixabayHit {
  largeImageURL?: string;
  webformatURL?: string;
}
interface PixabayResponse {
  hits?: PixabayHit[];
}
interface UnsplashPhoto {
  urls?: { regular?: string; full?: string };
}

type BackgroundTheme =
  | 'nature'
  | 'cityscape'
  | 'darkcity'
  | 'building'
  | 'urbanstreet'
  | 'minimalist'
  | 'space'
  | 'futuristic';

interface ThemeQuery {
  pixabayQuery: string;
  pixabayCategory: string;
  unsplashQuery: string;
}

const BACKGROUND_THEMES: Record<BackgroundTheme, ThemeQuery> = {
  nature: { pixabayQuery: 'landscape nature scenery', pixabayCategory: 'nature', unsplashQuery: 'nature landscape scenery' },
  cityscape: { pixabayQuery: 'city skyline cityscape', pixabayCategory: 'places', unsplashQuery: 'city skyline cityscape' },
  darkcity: { pixabayQuery: 'night city dark skyline', pixabayCategory: 'places', unsplashQuery: 'night city dark skyline' },
  building: { pixabayQuery: 'building architecture', pixabayCategory: 'buildings', unsplashQuery: 'architecture building' },
  urbanstreet: { pixabayQuery: 'urban street traffic road', pixabayCategory: 'places', unsplashQuery: 'urban street traffic road' },
  minimalist: { pixabayQuery: 'minimalist abstract background', pixabayCategory: 'backgrounds', unsplashQuery: 'minimalist abstract background' },
  space: { pixabayQuery: 'space galaxy stars nebula', pixabayCategory: 'science', unsplashQuery: 'space galaxy nebula' },
  futuristic: { pixabayQuery: 'futuristic technology digital', pixabayCategory: 'computer', unsplashQuery: 'futuristic technology digital' },
};

const THEME_KEYS = Object.keys(BACKGROUND_THEMES) as BackgroundTheme[];

const THEME_ALIASES: Record<string, BackgroundTheme> = {
  nature: 'nature',
  cityscape: 'cityscape',
  city: 'cityscape',
  darkcity: 'darkcity',
  nightcity: 'darkcity',
  night: 'darkcity',
  building: 'building',
  buildings: 'building',
  architecture: 'building',
  urbanstreet: 'urbanstreet',
  street: 'urbanstreet',
  traffic: 'urbanstreet',
  road: 'urbanstreet',
  urban: 'urbanstreet',
  minimalist: 'minimalist',
  minimal: 'minimalist',
  space: 'space',
  galaxy: 'space',
  futuristic: 'futuristic',
  future: 'futuristic',
  tech: 'futuristic',
  techinspired: 'futuristic',
};

function resolveBackgroundTheme(value: unknown): BackgroundTheme | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = normalizeKey(value);
  if (key === 'random' || key === 'any' || key === '') return null;
  return THEME_ALIASES[key] ?? null;
}

function pickRandomTheme(): BackgroundTheme {
  return THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
}

function resolveBackgroundInput(background: unknown, backgroundUrl: unknown): string | 'dynamic' | null {
  const raw = typeof background === 'string' ? background.trim() : '';
  if (!raw) return null;

  const key = normalizeKey(raw);
  if (key === 'none') return null;
  if (key === 'dynamic' || key === 'random' || key === 'auto') return 'dynamic';
  if (key === 'custom') {
    const url = typeof backgroundUrl === 'string' ? backgroundUrl.trim() : '';
    return url || null;
  }

  return raw;
}

async function fetchPixabayUrl(theme: ThemeQuery): Promise<string | null> {
  const apiKey = env.PIXABAY_API_KEY;
  if (!apiKey) return null;

  try {
    const page = Math.floor(Math.random() * 20) + 1;
    const url =
      `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}` +
      `&q=${encodeURIComponent(theme.pixabayQuery)}&category=${encodeURIComponent(theme.pixabayCategory)}` +
      `&orientation=horizontal&image_type=photo&safesearch=true&per_page=50&page=${page}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as PixabayResponse;
    const hits = (data.hits ?? []).filter((h) => h.largeImageURL || h.webformatURL);
    if (hits.length === 0) return null;

    const pick = hits[Math.floor(Math.random() * hits.length)];
    return pick.largeImageURL ?? pick.webformatURL ?? null;
  } catch {
    return null;
  }
}

async function fetchUnsplashUrl(theme: ThemeQuery, width: number, height: number): Promise<string | null> {
  const accessKey = env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const url = `https://api.unsplash.com/photos/random?orientation=landscape&query=${encodeURIComponent(theme.unsplashQuery)}`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` } });
    if (!res.ok) return null;

    const data = (await res.json()) as UnsplashPhoto;
    const base = data.urls?.regular ?? data.urls?.full;
    if (!base) return null;

    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}w=${width}&h=${height}&fit=crop&crop=entropy`;
  } catch {
    return null;
  }
}

function picsumFallbackUrl(width: number, height: number): string {
  const seed = randomBytes(6).toString('hex');
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

async function loadDynamicBackground(
  themeInput: unknown,
  width: number,
  height: number,
  prefix: string,
  loadImageFrom: (source: string, prefix: string) => Promise<LoadedImage | null>
): Promise<LoadedImage | null> {
  const theme = BACKGROUND_THEMES[resolveBackgroundTheme(themeInput) ?? pickRandomTheme()];

  const providers: Array<() => Promise<string | null>> = [
    () => fetchPixabayUrl(theme),
    () => fetchUnsplashUrl(theme, width, height),
  ];

  for (const getCandidateUrl of providers) {
    const url = await getCandidateUrl();
    if (!url) continue;

    const img = await loadImageFrom(url, prefix);
    if (img) return img;
  }

  return loadImageFrom(picsumFallbackUrl(width, height), prefix);
}

// ─── Low-level drawing primitives ──────────────────────────────────────────

function drawCoverImage(ctx: SKRSContext2D, image: LoadedImage, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / image.width, h / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const offsetX = x + (w - drawW) / 2;
  const offsetY = y + (h - drawH) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawW, drawH);
}

function drawFrostedCover(ctx: SKRSContext2D, image: LoadedImage, x: number, y: number, w: number, h: number, divisor: number): void {
  const smallW = Math.max(6, Math.round(w / divisor));
  const smallH = Math.max(6, Math.round(h / divisor));

  const off = createCanvas(smallW, smallH);
  const offCtx = off.getContext('2d');
  offCtx.imageSmoothingEnabled = true;
  drawCoverImage(offCtx, image, 0, 0, smallW, smallH);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(off as unknown as LoadedImage, x, y, w, h);
  ctx.restore();
}

function drawSurfaceBackground(ctx: SKRSContext2D, color: Rgb, width: number, height: number): void {
  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#111318');
  base.addColorStop(0.55, '#0c0e12');
  base.addColorStop(1, '#0a0b0f');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const glowTL = ctx.createRadialGradient(width * 0.08, height * 0.05, 0, width * 0.08, height * 0.05, width * 0.55);
  glowTL.addColorStop(0, rgba(color, 0.14));
  glowTL.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glowTL;
  ctx.fillRect(0, 0, width, height);

  const glowBR = ctx.createRadialGradient(width * 0.98, height * 1.0, 0, width * 0.98, height * 1.0, width * 0.45);
  glowBR.addColorStop(0, rgba(color, 0.1));
  glowBR.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glowBR;
  ctx.fillRect(0, 0, width, height);
}

function drawCard(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  color: Rgb,
  backgroundImage: LoadedImage | null
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 56;
  ctx.shadowOffsetY = 26;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#101319';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();

  if (backgroundImage) {
    drawFrostedCover(ctx, backgroundImage, x, y, w, h, 22);

    const legibility = ctx.createLinearGradient(x, y, x, y + h);
    legibility.addColorStop(0, 'rgba(6, 7, 10, 0.22)');
    legibility.addColorStop(0.5, 'rgba(6, 7, 10, 0.4)');
    legibility.addColorStop(1, 'rgba(6, 7, 10, 0.62)');
    ctx.fillStyle = legibility;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = rgba(color, 0.08);
    ctx.fillRect(x, y, w, h);
  } else {
    const fill = ctx.createLinearGradient(x, y, x + w, y + h);
    fill.addColorStop(0, '#16181f');
    fill.addColorStop(0.6, '#121319');
    fill.addColorStop(1, '#0f1015');
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);

    const tint = ctx.createRadialGradient(x + w * 0.12, y + h * 0.1, 0, x + w * 0.12, y + h * 0.1, w * 0.7);
    tint.addColorStop(0, rgba(color, 0.08));
    tint.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = tint;
    ctx.fillRect(x, y, w, h);
  }

  const sheen = ctx.createLinearGradient(0, y, 0, y + h * 0.4);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.4);

  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawTrackedText(ctx: SKRSContext2D, text: string, x: number, y: number, tracking: number): number {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  return cursor - x - tracking;
}

function measureTrackedText(ctx: SKRSContext2D, text: string, tracking: number): number {
  let width = 0;
  for (const ch of text) width += ctx.measureText(ch).width + tracking;
  return Math.max(0, width - tracking);
}

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
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 1;
  }
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 1) {
    out = out.slice(0, -1);
  }
  if (out !== text) out = `${out.slice(0, -1)}…`;
  ctx.fillStyle = fillStyle;
  ctx.fillText(out, x, y);
  return Math.min(ctx.measureText(out).width, maxWidth);
}

/** Simple deterministic "brightness" ring — a slightly lighter tone of the accent for a soft two-tone gradient. */
function drawAvatarRing(ctx: SKRSContext2D, cx: number, cy: number, r: number, color: Rgb): void {
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, rgba(lighten(color, 40), 0.95));
  grad.addColorStop(1, rgba(color, 0.85));

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 4;
  ctx.shadowColor = rgba(color, 0.55);
  ctx.shadowBlur = 20;
  ctx.stroke();
  ctx.restore();
}

/** Draws the circular avatar: soft plate, cover-fit clipped photo (or a generated tonal-gradient initials monogram when none is given), and a clean accent ring. */
function drawAvatar(ctx: SKRSContext2D, image: LoadedImage | null, cx: number, cy: number, r: number, color: Rgb, username: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    drawCoverImage(ctx, image, cx - r, cy - r, r * 2, r * 2);
  } else {
    const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grad.addColorStop(0, rgba(lighten(color, 15), 1));
    grad.addColorStop(1, rgba(darken(color, 45), 1));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    const initial = (username.trim().charAt(0) || '?').toUpperCase();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = onAccentInk(lighten(color, 15));
    ctx.font = `700 ${Math.round(r * 1.05)}px ${FONT_STACK}`;
    ctx.fillText(initial, cx, cy + r * 0.06);
  }

  ctx.restore();

  drawAvatarRing(ctx, cx, cy, r, color);
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function initialize(ctx: EndpointCtx) {
  const { request, query, set } = ctx;
  const body = (request.method === 'POST' ? (ctx.body ?? {}) : query) as Record<string, unknown>;

  const eventType = resolveEventType(body?.type);
  const platform = resolvePlatform(body?.platform);
  const cfg = PLATFORM_CONFIGS[platform];

  const avatar = typeof body?.avatar === 'string' && body.avatar.trim() ? body.avatar.trim() : null;
  const backgroundInput = resolveBackgroundInput(body?.background, body?.backgroundUrl);
  const username = typeof body?.username === 'string' ? body.username : undefined;

  if (!username) {
    set.status = 400;
    return { error: 'Missing required parameter: username' };
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
    set.status = 400;
    return {
      error: (err as Error).message,
      allowedColors: NAMED_COLORS.map((c) => c.name),
    };
  }

  try {
    const WIDTH = cfg.width;
    const HEIGHT = cfg.height;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    drawSurfaceBackground(ctx, color, WIDTH, HEIGHT);

    const cardX = cfg.cardPad;
    const cardY = cfg.cardPad;
    const cardW = WIDTH - cardX * 2;
    const cardH = HEIGHT - cardY * 2;

    const backgroundImg =
      backgroundInput === 'dynamic'
        ? await loadDynamicBackground(body?.backgroundTheme, cfg.width, cfg.height, `greet2_${platform}_bg`, loadRemoteImage)
        : backgroundInput
          ? await loadRemoteImage(backgroundInput, `greet2_${platform}_bg`)
          : null;

    drawCard(ctx, cardX, cardY, cardW, cardH, cfg.cardRadius, color, backgroundImg);

    const avatarImg = avatar ? await loadRemoteImage(avatar, `greet2_${platform}_avatar`) : null;
    const cx = cardX + cfg.avatarCxOffset;
    const cy = HEIGHT / 2;
    const r = cfg.avatarR;
    drawAvatar(ctx, avatarImg, cx, cy, r, color, username);

    const contentX = cx + r + cfg.contentGap;
    const rightEdge = cardX + cardW - cfg.rightSafePad;
    const maxContentW = Math.max(80, rightEdge - contentX);

    // ── Total block height: fixed row heights, gated only by which optional rows are present ──
    const eyebrowH = cfg.eyebrowFontSize + cfg.eyebrowPadY * 2;
    const usernameH = cfg.usernameFontMax;
    const subtitleH = serverName ? cfg.subtitleFontMax : 0;
    const messageH = message ? cfg.messageFontMax : 0;

    const blockHeight =
      eyebrowH +
      cfg.gapEyebrowUsername +
      usernameH +
      (serverName ? cfg.gapUsernameSubtitle + subtitleH : 0) +
      (message ? cfg.gapSubtitleMessage + messageH : 0);

    const minTop = cardY + cfg.vSafePad;
    const maxBottom = cardY + cardH - cfg.vSafePad;
    let blockTop = cy - blockHeight / 2;
    blockTop = Math.max(minTop, Math.min(blockTop, maxBottom - blockHeight));

    let rowY = blockTop;

    // Eyebrow pill.
    const eyebrowLabel = eventType === 'welcome' ? 'WELCOME' : 'GOODBYE';
    ctx.font = `700 ${cfg.eyebrowFontSize}px ${FONT_STACK}`;
    const eyebrowTextW = measureTrackedText(ctx, eyebrowLabel, cfg.eyebrowTracking);
    const eyebrowPillW = Math.min(maxContentW, eyebrowTextW + cfg.eyebrowPadX * 2);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(contentX, rowY, eyebrowPillW, eyebrowH, eyebrowH / 2);
    ctx.fillStyle = rgba(color, 0.16);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(contentX + 0.5, rowY + 0.5, eyebrowPillW - 1, eyebrowH - 1, eyebrowH / 2);
    ctx.strokeStyle = rgba(color, 0.4);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `700 ${cfg.eyebrowFontSize}px ${FONT_STACK}`;
    ctx.fillStyle = rgba(lighten(color, 30), 1);
    ctx.shadowColor = rgba(color, 0.5);
    ctx.shadowBlur = 6;
    drawTrackedText(ctx, eyebrowLabel, contentX + cfg.eyebrowPadX, rowY + eyebrowH / 2 + cfg.eyebrowFontSize * 0.34, cfg.eyebrowTracking);
    ctx.restore();

    rowY += eyebrowH + cfg.gapEyebrowUsername;

    // Username.
    const usernameBaseline = rowY + usernameH * 0.78;
    fitText(ctx, username, contentX, usernameBaseline, maxContentW, '700', cfg.usernameFontMax, cfg.usernameFontMin, '#f7f8fa');
    rowY += usernameH;

    // Subtitle — server name.
    if (serverName) {
      rowY += cfg.gapUsernameSubtitle;
      const subtitleBaseline = rowY + subtitleH * 0.78;
      fitText(
        ctx,
        `in ${serverName}`,
        contentX,
        subtitleBaseline,
        maxContentW,
        '600',
        cfg.subtitleFontMax,
        cfg.subtitleFontMin,
        rgba(lighten(color, 25), 0.9)
      );
      rowY += subtitleH;
    }

    // Message.
    if (message) {
      rowY += cfg.gapSubtitleMessage;
      const messageBaseline = rowY + messageH * 0.78;
      fitText(
        ctx,
        message,
        contentX,
        messageBaseline,
        maxContentW,
        '500',
        cfg.messageFontMax,
        cfg.messageFontMin,
        'rgba(255, 255, 255, 0.6)'
      );
    }

    // Member-count badge — floating rounded chip, top-right, sized so it can never collide with the avatar or overflow the card.
    if (memberCount !== null) {
      const chipLabel = memberCount.toLocaleString('en-US');
      const maxMemberW = Math.max(60, rightEdge - (cx + r + cfg.memberGap));

      let memberFont = cfg.memberFontStart;
      const measureMemberWidth = (fs: number): number => {
        ctx.font = `700 ${fs}px ${FONT_STACK}`;
        const valueW = ctx.measureText(chipLabel).width;
        ctx.font = `600 ${cfg.memberLabelFont}px ${FONT_STACK}`;
        const labelW = measureTrackedText(ctx, 'MEMBERS', 1.5);
        return labelW + 10 + valueW + cfg.memberPadX * 2;
      };
      while (memberFont > cfg.memberFontMin && measureMemberWidth(memberFont) > maxMemberW) memberFont -= 1;

      ctx.font = `700 ${memberFont}px ${FONT_STACK}`;
      const valueW = ctx.measureText(chipLabel).width;
      ctx.font = `600 ${cfg.memberLabelFont}px ${FONT_STACK}`;
      const labelW = measureTrackedText(ctx, 'MEMBERS', 1.5);
      const pillW = Math.min(maxMemberW, labelW + 10 + valueW + cfg.memberPadX * 2);
      const pillH = cfg.memberPillH;
      const pillX = rightEdge - pillW;
      const pillY = cardY + cfg.vSafePad * 0.55;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(pillX + 0.5, pillY + 0.5, pillW - 1, pillH - 1, pillH / 2);
      ctx.strokeStyle = rgba(color, 0.45);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(pillX + cfg.memberPadX * 0.7, pillY + pillH / 2, Math.max(3, memberFont * 0.14), 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 1);
      ctx.shadowColor = rgba(color, 0.9);
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${cfg.memberLabelFont}px ${FONT_STACK}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const labelX = pillX + cfg.memberPadX * 1.6;
      drawTrackedText(ctx, 'MEMBERS', labelX, pillY + pillH / 2, 1.5);
      ctx.font = `700 ${memberFont}px ${FONT_STACK}`;
      ctx.fillStyle = '#f7f8fa';
      ctx.fillText(chipLabel, labelX + labelW + 10, pillY + pillH / 2 + 1);
      ctx.restore();
    }

    const bufferArr = await canvas.encode('png');
    return new Response(new Uint8Array(bufferArr), {
      headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
    });
  } catch (error) {
    set.status = 500;
    return { error: (error as Error).message || 'Internal server error' };
  }
};
