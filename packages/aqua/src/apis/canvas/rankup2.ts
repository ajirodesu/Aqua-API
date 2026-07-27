/**
 * /canvas/rankup2 — "Aurora" rank-up card (V2)
 *
 * A ground-up redesign of rankup.ts: same job (announce a level-up), same
 * platform aspect ratios (Telegram 1200x600 exact 2:1, Discord 1200x400
 * exact 3:1), same param surface — but a completely different visual
 * language. Where V1 is an angular cyberpunk HUD, V2 is a calm, premium
 * "glass card" built from iOS materials/elevation conventions and Material
 * You tonal color + shape language:
 *
 *   - fully rounded card, soft multi-stop elevation shadow, hairline border,
 *     top glass sheen
 *   - optional background photo gets a cheap-but-convincing frosted-glass
 *     blur (downscale → upscale through a tiny offscreen canvas) instead of
 *     a flat scrim, plus a bottom-anchored legibility gradient
 *   - circular avatar on a soft "plate", single clean tonal ring, and a
 *     generated initials monogram (not an icon glyph) as the no-avatar
 *     fallback
 *   - level transition rendered as two fully-rounded pill chips joined by a
 *     single minimal chevron, with a real XP progress bar beneath (parsed
 *     from `xpText` when it contains a "current / total" pattern) instead
 *     of plain text
 *   - a floating rounded "assist chip" for the rank badge
 *
 * LAYOUT DISCIPLINE: every piece of text goes through fitText (auto-shrink
 * + ellipsis, never overflow). Every chip/pill/bar width is either capped to
 * a pre-computed `maxContentW` or measured then shrunk-to-fit in a loop
 * before it is ever drawn — nothing is drawn first and clipped after. The
 * whole content block's height is computed as a sum of fixed, known
 * quantities (never a function of how long the input strings are, since
 * every string is single-line and pre-shrunk), then vertically centered on
 * the avatar and finally clamped inside the card's safe area — so no
 * combination of inputs can push content past the card edge.
 */

import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';
import { env } from '@/engine/env.config.js';

type Rgb = [number, number, number];
type LoadedImage = Awaited<ReturnType<typeof loadImage>>;

// ─── Accent palette ─────────────────────────────────────────────────────────

/** Same 8-color accent palette as rankup.ts / the cat-bot random-color feature — kept identical so callers can swap between V1 and V2 without remapping colors. */
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
function resolveColor(value: unknown): Rgb {
  const fallback = 'Cyan';

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

/** Picks a readable "on-accent" ink color (near-black or near-white) for text painted on top of a solid accent fill, mirroring Material You's on-primary contrast rule. */
function onAccentInk(color: Rgb): string {
  const [r, g, b] = color;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#0b0d10' : '#f7f8fa';
}

// ─── Platform config ─────────────────────────────────────────────────────────

/** Platforms this endpoint can render for. Telegram renders the full 2:1 card; Discord renders the compact 3:1 banner — identical aspect ratios to rankup.ts. */
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
  /** Outer safe margin between the canvas edge and the card. */
  cardPad: number;
  cardRadius: number;
  avatarR: number;
  /** Avatar center distance from the card's left edge. */
  avatarCxOffset: number;
  /** Gap between the avatar's outer ring and where content text starts. */
  contentGap: number;
  /** Reserved margin at the card's right edge (keeps the rank chip and any long text off the edge). */
  rightSafePad: number;
  /** Top/bottom safe padding the content block is clamped inside of. */
  vSafePad: number;

  eyebrowFontSize: number;
  eyebrowTracking: number;
  eyebrowPadX: number;
  eyebrowPadY: number;

  usernameFontMax: number;
  usernameFontMin: number;

  chipFontStart: number;
  chipFontMin: number;
  chipPadX: number;
  chipH: number;
  chevronGap: number;
  chevronSize: number;

  progressH: number;
  progressLabelFont: number;

  gapEyebrowUsername: number;
  gapUsernameChips: number;
  gapChipsProgress: number;

  rankFontStart: number;
  rankFontMin: number;
  rankLabelFont: number;
  rankPillH: number;
  rankPadX: number;
  rankGap: number;
}

/** Telegram — full 1200x600 (exact 2:1) glass card. */
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

  chipFontStart: 22,
  chipFontMin: 14,
  chipPadX: 24,
  chipH: 54,
  chevronGap: 16,
  chevronSize: 13,

  progressH: 14,
  progressLabelFont: 18,

  gapEyebrowUsername: 22,
  gapUsernameChips: 28,
  gapChipsProgress: 26,

  rankFontStart: 24,
  rankFontMin: 14,
  rankLabelFont: 13,
  rankPillH: 52,
  rankPadX: 22,
  rankGap: 10,
};

/** Discord — 1200x400 (exact 3:1) compact banner, same ratio as rankup.ts's Discord layout, scaled proportionally. */
const DISCORD_CONFIG: PlatformConfig = {
  width: 1200,
  height: 400,
  cardPad: 26,
  cardRadius: 32,
  avatarR: 80,
  avatarCxOffset: 132,
  contentGap: 54,
  rightSafePad: 40,
  vSafePad: 34,

  eyebrowFontSize: 15,
  eyebrowTracking: 2.2,
  eyebrowPadX: 14,
  eyebrowPadY: 9,

  usernameFontMax: 33,
  usernameFontMin: 19,

  chipFontStart: 16,
  chipFontMin: 11,
  chipPadX: 18,
  chipH: 38,
  chevronGap: 12,
  chevronSize: 10,

  progressH: 10,
  progressLabelFont: 13,

  gapEyebrowUsername: 14,
  gapUsernameChips: 18,
  gapChipsProgress: 17,

  rankFontStart: 17,
  rankFontMin: 11,
  rankLabelFont: 10,
  rankPillH: 36,
  rankPadX: 16,
  rankGap: 7,
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
  name: 'Rank Up V2',
  desc: 'Generate a premium "Aurora" rank-up card — a soft, fully-rounded glass surface built on iOS elevation/material conventions and Material You tonal color, with a circular avatar (generated initials monogram when none is given), rounded level-transition pills, and a real XP progress bar. Choose "platform" to switch between the full Telegram card (exact 2:1) and the compact Discord banner (exact 3:1)',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'platform',
      desc: 'Which layout to render: the full 2:1 Telegram card, or the compact 3:1 Discord banner',
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
      example: 'https://imgs.search.brave.com/ne6Eq3YZpHXiaN4CudO8RRDhDYLW7YRuWE83RYN26Eo/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/d2FsbHBhcGVyc2Fm/YXJpLmNvbS8xMi8x/L0kxQURhay5wbmc',
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
      desc: 'Optional readout beneath the level pills. If it contains a "current / total" number pattern (e.g. "6,800 / 10,000 XP") a real progress bar is drawn; otherwise it renders as plain text',
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
      desc: 'Accent color used for the ring, chips, progress bar, and rank badge',
      example: 'Cyan',
      required: false,
      type: 'select',
      options: NAMED_COLORS.map((c) => c.name),
    },
  ],
};

// ─── Image loading ──────────────────────────────────────────────────────────

/**
 * Resolves an avatar/background param (remote URL or an uploaded `data:` URI
 * from the docs UI) down to a temp file and loads it with loadImage(). Writing
 * to disk first avoids the "@napi-rs/canvas" "Invalid SVG image" bug that
 * occurs when passing a raw Buffer directly. Returns null (rather than
 * throwing) on any fetch/decode failure so the card can fall back gracefully
 * instead of erroring the whole request.
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

/** The 8 curated moods "Dynamic" backgrounds can draw from, each mapped to search terms for both photo providers. */
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

/** Resolves the `backgroundTheme` param to a concrete theme, or `null` to mean "pick one at random per request". */
function resolveBackgroundTheme(value: unknown): BackgroundTheme | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const key = normalizeKey(value);
  if (key === 'random' || key === 'any' || key === '') return null;
  return THEME_ALIASES[key] ?? null;
}

function pickRandomTheme(): BackgroundTheme {
  return THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
}

/**
 * Resolves the `background` + `backgroundUrl` params down to a single image
 * source (a URL, or `null` for no background):
 *  - "None" / empty            -> null
 *  - "Dynamic"                 -> handled separately by loadDynamicBackground
 *  - "Custom"                  -> whatever URL was given in `backgroundUrl`
 *  - anything else non-empty   -> used as-is (e.g. a raw background URL)
 */
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

/** Pixabay search, scoped to one theme. Free tier, no per-request cost — needs `PIXABAY_API_KEY`. No true "random" endpoint, so a random results page + a random pick within it keeps results varied across calls. */
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

/** Unsplash's official random-photo endpoint, scoped to one theme. Secondary provider — tried when Pixabay is unset or comes back empty. Needs `UNSPLASH_ACCESS_KEY`. */
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

/** No-key, no-signup, always-available fallback. Not theme-filtered, but guarantees a photo exists so "Dynamic" never renders blank. */
function picsumFallbackUrl(width: number, height: number): string {
  const seed = randomBytes(6).toString('hex');
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

/**
 * Resolves a "Dynamic" background end-to-end: picks a theme, tries each
 * photo provider in order, and actually attempts to *load* each candidate
 * before moving on — a provider returning a dead or unreadable link doesn't
 * stop the chain. Picsum is tried last and is effectively always reachable,
 * so this only returns `null` if every network path is down.
 */
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

/** Draws `image` inside (x, y, w, h) using "cover" fit — scaled and center-cropped to fill the box with no distortion or letterboxing. */
function drawCoverImage(ctx: SKRSContext2D, image: LoadedImage, x: number, y: number, w: number, h: number): void {
  const scale = Math.max(w / image.width, h / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const offsetX = x + (w - drawW) / 2;
  const offsetY = y + (h - drawH) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawW, drawH);
}

/**
 * Draws `image` inside (x, y, w, h) with a soft frosted-glass blur — cheaply
 * and reliably, via a downscale-then-upscale pass through a tiny offscreen
 * canvas (no per-pixel convolution, so cost and runtime are constant
 * regardless of the source photo's resolution).
 */
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

/** Calm Material You "surface" backdrop: neutral dark base with two soft, low-opacity accent glows — no busy texture, just quiet depth. */
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

/**
 * Draws the rounded "glass card" that hosts all content: soft elevation
 * shadow, either a frosted background photo (with a bottom-anchored
 * legibility gradient + a light accent tint for cohesion) or a smooth tonal
 * fill, a hairline border, and a top glass-sheen highlight.
 */
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

  // Top glass sheen — a soft highlight along the inner top edge.
  const sheen = ctx.createLinearGradient(0, y, 0, y + h * 0.4);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.4);

  ctx.restore();

  // Hairline border.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5, radius);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** Renders `text` letter-by-letter with extra tracking (letter-spacing), returning the total width drawn — canvas has no native letter-spacing. */
function drawTrackedText(ctx: SKRSContext2D, text: string, x: number, y: number, tracking: number): number {
  let cursor = x;
  for (const ch of text) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  return cursor - x - tracking;
}

/** Measures the width `drawTrackedText` would use, without drawing anything — must be called with the same font already set on `ctx`. */
function measureTrackedText(ctx: SKRSContext2D, text: string, tracking: number): number {
  let width = 0;
  for (const ch of text) width += ctx.measureText(ch).width + tracking;
  return Math.max(0, width - tracking);
}

/**
 * Auto-shrinking single-line text: reduces font size until it fits
 * `maxWidth`, then truncates with an ellipsis as a last resort so it is
 * physically impossible for this call to overflow its box.
 */
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

type Gradient = ReturnType<SKRSContext2D['createLinearGradient']>;

/** Rounded "assist chip" / pill. Returns the drawn width so callers can lay out the next element after it. */
function drawPill(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  text: string,
  opts: {
    fontSize: number;
    weight: string;
    height: number;
    paddingX: number;
    textColor: string;
    fill: string | Gradient;
    border?: string;
    shadow?: { color: string; blur: number; offsetY?: number };
  }
): number {
  ctx.font = `${opts.weight} ${opts.fontSize}px ${FONT_STACK}`;
  const textW = ctx.measureText(text).width;
  const w = textW + opts.paddingX * 2;
  const h = opts.height;

  ctx.save();
  if (opts.shadow) {
    ctx.shadowColor = opts.shadow.color;
    ctx.shadowBlur = opts.shadow.blur;
    ctx.shadowOffsetY = opts.shadow.offsetY ?? 0;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = opts.fill;
  ctx.fill();
  ctx.restore();

  if (opts.border) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, h / 2);
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.textColor;
  ctx.fillText(text, x + opts.paddingX, y + h / 2 + 1);

  return w;
}

/** Rounded progress track + fill, clamped to [0, 1] so an out-of-range ratio can never draw past the track. */
function drawProgressBar(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, ratio: number, color: Rgb): void {
  const clamped = Math.max(0, Math.min(1, ratio));

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.fill();
  ctx.restore();

  if (clamped <= 0) return;

  const fillW = Math.max(h, w * clamped);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.clip();

  ctx.shadowColor = rgba(color, 0.55);
  ctx.shadowBlur = h;
  const grad = ctx.createLinearGradient(x, 0, x + fillW, 0);
  grad.addColorStop(0, rgba(darken(color, 10), 1));
  grad.addColorStop(1, rgba(lighten(color, 35), 1));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y, fillW, h, h / 2);
  ctx.fill();
  ctx.restore();
}

/** Extracts a `current / total` numeric pattern from a free-form readout string (e.g. "6,800 / 10,000 XP"), for driving the progress bar. Returns null when no such pattern is present. */
function parseProgressFraction(text: string): { current: number; total: number } | null {
  const match = text.match(/([\d,]+(?:\.\d+)?)\s*\/\s*([\d,]+(?:\.\d+)?)/);
  if (!match) return null;

  const current = Number(match[1]!.replace(/,/g, ''));
  const total = Number(match[2]!.replace(/,/g, ''));
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null;

  return { current, total };
}

/** Simple deterministic "brightness" pick for the avatar plate ring — a slightly lighter tone of the accent for a soft two-tone gradient. */
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
  // Soft plate behind the avatar — separates it from busy background photos.
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

/** A single minimal chevron (">"), used between the level-transition pills. */
function drawChevron(ctx: SKRSContext2D, cx: number, cy: number, size: number, color: Rgb): void {
  ctx.save();
  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = rgba(color, 0.6);
  ctx.shadowBlur = size;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.35, cy - size);
  ctx.lineTo(cx + size * 0.65, cy);
  ctx.lineTo(cx - size * 0.35, cy + size);
  ctx.stroke();
  ctx.restore();
}

// ─── Handler ────────────────────────────────────────────────────────────────

export const onStart: ApiHandler = async ({ req, res }) => {
  const body = (req.method === 'POST' ? req.body : req.query) as Record<string, unknown>;

  const platform = resolvePlatform(body?.platform);
  const cfg = PLATFORM_CONFIGS[platform];

  const avatar = typeof body?.avatar === 'string' && body.avatar.trim() ? body.avatar.trim() : null;
  const backgroundInput = resolveBackgroundInput(body?.background, body?.backgroundUrl);
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
  const rank = body?.rank !== undefined && body?.rank !== '' ? clampNum(body.rank, 0, 1, 999999) : null;
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

    drawSurfaceBackground(ctx, color, WIDTH, HEIGHT);

    const cardX = cfg.cardPad;
    const cardY = cfg.cardPad;
    const cardW = WIDTH - cardX * 2;
    const cardH = HEIGHT - cardY * 2;

    const backgroundImg =
      backgroundInput === 'dynamic'
        ? await loadDynamicBackground(body?.backgroundTheme, cfg.width, cfg.height, `rankup2_${platform}_bg`, loadRemoteImage)
        : backgroundInput
          ? await loadRemoteImage(backgroundInput, `rankup2_${platform}_bg`)
          : null;

    drawCard(ctx, cardX, cardY, cardW, cardH, cfg.cardRadius, color, backgroundImg);

    const avatarImg = avatar ? await loadRemoteImage(avatar, `rankup2_${platform}_avatar`) : null;
    const cx = cardX + cfg.avatarCxOffset;
    const cy = HEIGHT / 2;
    const r = cfg.avatarR;
    drawAvatar(ctx, avatarImg, cx, cy, r, color, username);

    const contentX = cx + r + cfg.contentGap;
    const rightEdge = cardX + cardW - cfg.rightSafePad;
    const maxContentW = Math.max(80, rightEdge - contentX);

    // ── Pre-compute every row's size before drawing anything ──────────────

    // Level pills — shrink font until both pills + chevron fit maxContentW.
    let chipFont = cfg.chipFontStart;
    const measureRowWidth = (fs: number): number => {
      ctx.font = `700 ${fs}px ${FONT_STACK}`;
      const prevW = ctx.measureText(`Lv. ${previousLevel}`).width + cfg.chipPadX * 2;
      const nextW = ctx.measureText(`Lv. ${level}`).width + cfg.chipPadX * 2;
      return prevW + cfg.chevronGap * 2 + cfg.chevronSize + nextW;
    };
    while (chipFont > cfg.chipFontMin && measureRowWidth(chipFont) > maxContentW) chipFont -= 1;

    // Progress: parsed fraction (if present) drives the bar; the label always shows the raw xpText.
    const fraction = xpText ? parseProgressFraction(xpText) : null;
    const hasProgressRow = Boolean(xpText);

    // ── Total block height is a sum of fixed, known quantities only ───────
    const eyebrowH = cfg.eyebrowFontSize + cfg.eyebrowPadY * 2;
    const usernameH = cfg.usernameFontMax;
    const chipRowH = cfg.chipH;
    const progressRowH = hasProgressRow ? cfg.progressLabelFont + 8 + cfg.progressH : 0;

    const blockHeight =
      eyebrowH +
      cfg.gapEyebrowUsername +
      usernameH +
      cfg.gapUsernameChips +
      chipRowH +
      (hasProgressRow ? cfg.gapChipsProgress + progressRowH : 0);

    // Center on the avatar, then clamp inside the card's safe vertical area — guarantees no clipping regardless of input combination.
    const minTop = cardY + cfg.vSafePad;
    const maxBottom = cardY + cardH - cfg.vSafePad;
    let blockTop = cy - blockHeight / 2;
    blockTop = Math.max(minTop, Math.min(blockTop, maxBottom - blockHeight));

    let rowY = blockTop;

    // Eyebrow pill — tracked small-caps label in a tonal accent capsule.
    ctx.font = `700 ${cfg.eyebrowFontSize}px ${FONT_STACK}`;
    const eyebrowLabel = 'LEVEL UP';
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

    rowY += usernameH + cfg.gapUsernameChips;

    // Level-transition pills + chevron.
    let cursorX = contentX;
    const prevW = drawPill(ctx, cursorX, rowY, `Lv. ${previousLevel}`, {
      fontSize: chipFont,
      weight: '600',
      height: chipRowH,
      paddingX: cfg.chipPadX,
      textColor: 'rgba(255, 255, 255, 0.72)',
      fill: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.14)',
    });
    cursorX += prevW + cfg.chevronGap;

    drawChevron(ctx, cursorX + cfg.chevronSize * 0.15, rowY + chipRowH / 2, cfg.chevronSize, color);
    cursorX += cfg.chevronSize + cfg.chevronGap;

    const nextFill = ctx.createLinearGradient(cursorX, rowY, cursorX, rowY + chipRowH);
    nextFill.addColorStop(0, rgba(lighten(color, 20), 1));
    nextFill.addColorStop(1, rgba(color, 1));
    drawPill(ctx, cursorX, rowY, `Lv. ${level}`, {
      fontSize: chipFont,
      weight: '700',
      height: chipRowH,
      paddingX: cfg.chipPadX,
      textColor: onAccentInk(color),
      fill: nextFill,
      shadow: { color: rgba(color, 0.55), blur: 22, offsetY: 6 },
    });

    rowY += chipRowH;

    // Progress row.
    if (hasProgressRow && xpText) {
      rowY += cfg.gapChipsProgress;

      fitText(
        ctx,
        xpText,
        contentX,
        rowY + cfg.progressLabelFont * 0.8,
        maxContentW,
        '500',
        cfg.progressLabelFont,
        Math.max(10, cfg.progressLabelFont - 4),
        'rgba(255, 255, 255, 0.6)'
      );

      const barY = rowY + cfg.progressLabelFont + 8;
      const ratio = fraction ? fraction.current / fraction.total : 0;
      if (fraction) {
        drawProgressBar(ctx, contentX, barY, maxContentW, cfg.progressH, ratio, color);
      } else {
        // No parseable fraction — still render an inert, mostly-empty track so the row keeps its intended rhythm/weight.
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(contentX, barY, maxContentW, cfg.progressH, cfg.progressH / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.fill();
        ctx.restore();
      }
    }

    // Rank badge — floating rounded chip, top-right, sized so it can never collide with the avatar or overflow the card.
    if (rank !== null) {
      const chipLabel = `#${rank}`;
      const maxRankW = Math.max(60, rightEdge - (cx + r + cfg.rankGap));

      let rankFont = cfg.rankFontStart;
      const measureRankWidth = (fs: number): number => {
        ctx.font = `700 ${fs}px ${FONT_STACK}`;
        const valueW = ctx.measureText(chipLabel).width;
        ctx.font = `600 ${cfg.rankLabelFont}px ${FONT_STACK}`;
        const labelW = measureTrackedText(ctx, 'RANK', 1.5);
        return labelW + 10 + valueW + cfg.rankPadX * 2;
      };
      while (rankFont > cfg.rankFontMin && measureRankWidth(rankFont) > maxRankW) rankFont -= 1;

      ctx.font = `700 ${rankFont}px ${FONT_STACK}`;
      const valueW = ctx.measureText(chipLabel).width;
      ctx.font = `600 ${cfg.rankLabelFont}px ${FONT_STACK}`;
      const labelW = measureTrackedText(ctx, 'RANK', 1.5);
      const pillW = Math.min(maxRankW, labelW + 10 + valueW + cfg.rankPadX * 2);
      const pillH = cfg.rankPillH;
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
      ctx.arc(pillX + cfg.rankPadX * 0.7, pillY + pillH / 2, Math.max(3, rankFont * 0.14), 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, 1);
      ctx.shadowColor = rgba(color, 0.9);
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.font = `600 ${cfg.rankLabelFont}px ${FONT_STACK}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const labelX = pillX + cfg.rankPadX * 1.6;
      drawTrackedText(ctx, 'RANK', labelX, pillY + pillH / 2, 1.5);
      ctx.font = `700 ${rankFont}px ${FONT_STACK}`;
      ctx.fillStyle = '#f7f8fa';
      ctx.fillText(chipLabel, labelX + labelW + 10, pillY + pillH / 2 + 1);
      ctx.restore();
    }

    const bufferArr = await canvas.encode('png');
    res.type('image/png').send(Buffer.from(bufferArr));
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};
