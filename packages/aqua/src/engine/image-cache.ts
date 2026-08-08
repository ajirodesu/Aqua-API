/*
 * INFO: engine/image-cache.ts
 * In-memory caches for decoded canvas images.
 *
 * The biggest single latency cost in the canvas endpoints is re-fetching
 * and re-decoding the same remote images on every request (static meme
 * templates on postimg/raw.githubusercontent, user avatars, background
 * photos). Decoding is CPU-heavy and the network fetch alone can take
 * 200-500ms. Caching the resolved @napi-rs/canvas `Image` keyed by its
 * source collapses those requests to near-zero cost after the first one.
 *
 * Two caches:
 *   - cachedLoadImage(): drop-in replacement for `loadImage()` — accepts
 *     URLs or Buffers (for `data:` URIs) and returns the decoded image.
 *   - cachedLoadRemoteImage(): cached variant of the temp-file based
 *     loader used by the rankup/greet card family (avoids the "@napi-rs/
 *     canvas" "Invalid SVG image" bug that occurs on raw Buffers) — returns
 *     null on failure so callers can fall back gracefully.
 *
 * Both are LRU-evicted and never cache rejected/failed loads, so transient
 * upstream errors are retried on the next request.
 */

import { loadImage as nativeLoadImage } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export type LoadedImage = Awaited<ReturnType<typeof nativeLoadImage>>;

const MAX_ENTRIES = 256;

/** URL / raw bytes -> decoded Image (a pending promise), LRU-evicted. */
const imageCache = new Map<string, Promise<LoadedImage>>();

/** URL / `data:` source -> decoded Image | null (pending promise). */
const remoteCache = new Map<string, Promise<LoadedImage | null>>();

function urlCacheKey(source: string | Buffer): string {
  if (typeof source === 'string') return `url:${source}`;
  // Keep keys short — hash a slice of the raw bytes.
  return `buf:${source.length}:${source.subarray(0, 32).toString('hex')}`;
}

function putOrEvict(
  cache: Map<string, Promise<unknown>>,
  key: string,
  promise: Promise<unknown>,
  max: number
): void {
  cache.set(key, promise);
  if (cache.size > max) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  // Never keep a failed load cached — allow retries on the next request.
  promise.catch(() => {
    if (cache.get(key) === promise) cache.delete(key);
  });
}

/** Drop-in replacement for @napi-rs/canvas `loadImage()` with caching. */
export function cachedLoadImage(source: string | Buffer): Promise<LoadedImage> {
  const key = urlCacheKey(source);
  const hit = imageCache.get(key);
  if (hit) return hit;

  const promise = nativeLoadImage(source);
  putOrEvict(imageCache, key, promise, MAX_ENTRIES);
  return promise;
}

/** Decodes a remote/data-URI source through a temp file (avoids the SVG buffer bug). */
async function decodeRemoteImage(source: string, prefix: string): Promise<LoadedImage> {
  let buf: Buffer;
  let ext = 'jpg';

  if (source.startsWith('data:')) {
    const commaIndex = source.indexOf(',');
    if (commaIndex === -1) throw new Error('Malformed data URI');
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
    return await nativeLoadImage(tmp);
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

/**
 * Cached variant of the rankup/greet `loadAvatarImage` / `loadRemoteImage`
 * helpers. Returns null (rather than throwing) on any failure so cards can
 * fall back to generated placeholders. Failures are not cached.
 */
export function cachedLoadRemoteImage(source: string, prefix: string): Promise<LoadedImage | null> {
  const key = `remote:${source}`;
  const hit = remoteCache.get(key);
  if (hit) return hit;

  const promise = decodeRemoteImage(source, prefix).then(
    (img) => img,
    () => null
  );
  putOrEvict(remoteCache, key, promise, MAX_ENTRIES);
  return promise;
}
