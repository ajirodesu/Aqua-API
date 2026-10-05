import { loadImage } from '@napi-rs/canvas';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import http from 'node:http';
import https from 'node:https';

/**
 * Browser-like request headers for fetching images.
 *
 * Some image hosts (notably Google's `encrypted-tbn*.gstatic.com`) refuse
 * or time out requests from Node's default `fetch` user agent, which made
 * canvas endpoints using those URLs fail. A real-browser UA fixes it.
 */
export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** Thrown when a user-supplied image URL is invalid or unreachable.
 *  Carries HTTP 400 so bad input is reported as a client error,
 *  not a 500 — genuine server bugs still fall through to 500. */
export class UserImageError extends Error {
  status = 400;
}

/** Maps a caught error to its HTTP status (400 for bad user image URLs). */
export function errorStatus(err: unknown): number {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === 'number' ? status : 500;
}

const USER_FETCH_TIMEOUT_MS = 15000;
const TEMPLATE_FETCH_TIMEOUT_MS = 30000;
const MAX_REDIRECTS = 5;

function failureDetail(err: unknown): string {
  const cause = (err as { cause?: unknown } | null)?.cause;
  const code =
    (cause as { code?: unknown } | null)?.code ?? (err as { code?: unknown } | null)?.code;
  if (typeof code === 'string') return code;
  const message = (err as Error)?.message;
  return message || 'network error';
}

interface DownloadResult {
  buf: Buffer;
  contentType: string;
}

/**
 * Low-level HTTPS/HTTP download that can pin DNS to IPv4.
 *
 * Undici (global `fetch`) fails fast on networks where IPv6 is
 * unreachable but still returned by DNS (NAT64/DNS64): it does not
 * reliably fall back to IPv4 (`i.postimg.cc` → instant ETIMEDOUT while
 * the IPv4 route works). `node:http(s)` honors `family: 4`, so this is
 * the fallback — and the primary path — for hosts that need it.
 */
function downloadBuffer(
  url: string,
  timeoutMs: number,
  family: 4 | 6 | undefined,
  redirectsLeft = MAX_REDIRECTS
): Promise<DownloadResult> {
  return new Promise((resolve, reject) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      reject(new Error('invalid URL'));
      return;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      reject(new Error('unsupported protocol'));
      return;
    }
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(
      parsed,
      {
        method: 'GET',
        headers: BROWSER_HEADERS,
        ...(family !== undefined ? { family } : {}),
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location && redirectsLeft > 0) {
          res.resume();
          const next = new URL(res.headers.location, parsed).toString();
          downloadBuffer(next, timeoutMs, family, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          res.resume();
          reject(new Error(`HTTP ${status}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () =>
          resolve({
            buf: Buffer.concat(chunks),
            contentType: res.headers['content-type'] ?? 'image/jpeg',
          })
        );
        res.on('error', reject);
      }
    );
    req.on('timeout', () => req.destroy(new Error('ETIMEDOUT')));
    req.on('error', reject);
    req.setTimeout(timeoutMs);
    req.end();
  });
}

/** Downloads a remote image with browser headers. Throws UserImageError (400) on failure. */
export async function fetchImageBuffer(
  source: string,
  param: string
): Promise<{ buf: Buffer; ext: string }> {
  let protocol: string;
  try {
    protocol = new URL(source).protocol;
  } catch {
    throw new UserImageError(`Invalid image URL for parameter "${param}"`);
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new UserImageError(`Invalid image URL for parameter "${param}": must be http(s)`);
  }

  // Primary: global fetch. Fallback: IPv4-pinned download for networks
  // where IPv6 DNS answers exist but v6 egress is broken.
  let lastError: unknown = null;
  try {
    const res = await fetch(source, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(USER_FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { buf: Buffer.from(await res.arrayBuffer()), ext: extOf(res.headers.get('content-type')) };
  } catch (err) {
    lastError = err;
  }
  try {
    const { buf, contentType } = await downloadBuffer(source, USER_FETCH_TIMEOUT_MS, 4);
    return { buf, ext: extOf(contentType) };
  } catch (err) {
    lastError = err;
  }
  throw new UserImageError(
    `Could not fetch image for parameter "${param}" (${failureDetail(lastError)})`
  );
}

function extOf(contentType: string | null): string {
  return (
    contentType?.split('/')[1]?.replace('jpeg', 'jpg')?.replace('svg+xml', 'svg')?.split(';')[0] ||
    'jpg'
  );
}

/**
 * Resolves a user-supplied image param (remote URL or an uploaded `data:`
 * URI from the docs UI) into a loaded image. Writing downloads to disk
 * first avoids the "@napi-rs/canvas" "Invalid SVG image" bug from passing
 * raw Buffers. Throws UserImageError (400) for invalid/unreachable input.
 */
export async function loadRemoteImage(
  source: string,
  param: string
): Promise<ReturnType<typeof loadImage>> {
  let buf: Buffer;
  let ext = 'jpg';

  if (source.startsWith('data:')) {
    const commaIndex = source.indexOf(',');
    if (commaIndex === -1) {
      throw new UserImageError(`Malformed data URI for parameter "${param}"`);
    }
    const mime = source.slice(5, commaIndex).split(';')[0] || 'image/jpeg';
    ext = extOf(mime);
    buf = Buffer.from(source.slice(commaIndex + 1), 'base64');
  } else {
    const downloaded = await fetchImageBuffer(source, param);
    buf = downloaded.buf;
    ext = downloaded.ext;
  }

  const safe = param.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'image';
  const tmp = join(tmpdir(), `aqua_${safe}_${randomBytes(8).toString('hex')}.${ext}`);
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

/** In-memory template bytes: static assets that never change per request. */
const templateCache = new Map<string, Buffer>();
const TEMPLATE_CACHE_MAX = 50;

/**
 * Loads a server-side template/background image with browser headers over
 * an IPv4-pinned connection, cached in memory after the first download.
 * Unlike user input, template failures are server problems: throws a plain
 * Error (→ HTTP 500) with a descriptive message instead of UserImageError.
 */
export async function loadTemplateImage(
  url: string,
  label: string
): Promise<ReturnType<typeof loadImage>> {
  let buf = templateCache.get(url);
  if (!buf) {
    try {
      ({ buf } = await downloadBuffer(url, TEMPLATE_FETCH_TIMEOUT_MS, 4));
    } catch (err) {
      throw new Error(`Template image failed to load (${label}): ${failureDetail(err)}`);
    }
    templateCache.set(url, buf);
    if (templateCache.size > TEMPLATE_CACHE_MAX) {
      const oldest = templateCache.keys().next();
      if (!oldest.done) templateCache.delete(oldest.value);
    }
  }

  const tmp = join(tmpdir(), `aqua_tpl_${randomBytes(8).toString('hex')}.img`);
  writeFileSync(tmp, buf);

  try {
    return await loadImage(tmp);
  } catch (err) {
    throw new Error(
      `Template image failed to decode (${label}): ${(err as Error)?.message || 'unknown error'}`
    );
  } finally {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore cleanup errors */
    }
  }
}
