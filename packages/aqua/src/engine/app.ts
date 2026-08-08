// Must be the very first import: populates process.env from .env before
// any other module (including env.config.ts) reads it.
import './load-env.js';

// Configures keep-alive agents + timeouts for all outbound axios calls
// (side-effect import — must happen before any endpoint module runs).
import './http.js';

import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { promises as fsPromises, statSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { networkInterfaces } from 'node:os';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import chalk from 'chalk';

import { logger } from './logger.js';
import { env, validateEnv } from './env.config.js';
import type {
  AquaConfig,
  ApiMeta,
  ApiModule,
  EndpointBucket,
  EndpointCtx,
  HttpMethod,
  Notification,
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '..');
const PACKAGE_DIR = path.resolve(SRC_DIR, '..');
const PACKAGES_DIR = path.resolve(PACKAGE_DIR, '..');
const WEB_DIST_DIR = path.join(PACKAGES_DIR, 'web', 'dist');
const APIS_DIR = path.join(SRC_DIR, 'apis');
const JSON_DIR = path.join(SRC_DIR, 'json');
const NOTIF_PATH = path.join(JSON_DIR, 'notif.json');
const CONFIG_PATH = path.join(JSON_DIR, 'config.json');

const PORT = env.PORT;
const isProduction = env.isProduction;

validateEnv();

const config: AquaConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const frontendBuilt = fs.existsSync(path.join(WEB_DIST_DIR, 'index.html'));
if (frontendBuilt) {
  logger.ready(`Serving frontend from ${WEB_DIST_DIR}`);
} else {
  logger.warn(`Frontend build not found at ${WEB_DIST_DIR} — run "npm run build" from the repo root.`);
}

let notificationsCache: Notification[] = [];

async function loadNotifications(): Promise<void> {
  try {
    const raw = await fsPromises.readFile(NOTIF_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    notificationsCache = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error?.code !== 'ENOENT') {
      logger.warn(`Failed to load notifications: ${error.message}`);
    }
    notificationsCache = [];
  }
}

async function saveNotifications(): Promise<void> {
  try {
    await fsPromises.mkdir(JSON_DIR, { recursive: true });
    await fsPromises.writeFile(NOTIF_PATH, JSON.stringify(notificationsCache, null, 2), 'utf8');
  } catch (err) {
    logger.error(`Failed to save notifications: ${(err as Error).message}`);
  }
}

/** A dynamically-discovered endpoint module (kept in the resolved module shape). */
interface EndpointModule {
  meta: ApiMeta;
  initialize: (ctx: EndpointCtx) => unknown | Promise<unknown>;
}

interface ResolvedRoute {
  method: HttpMethod;
  route: string;
  module: EndpointModule;
}

const resolvedRoutes: ResolvedRoute[] = [];
let allEndpoints: EndpointBucket[] = [];
let totalEndpoints = 0;

const SUPPORTED_METHODS: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch'];

/**
 * Recursively scans a directory for endpoint modules. Each module must
 * export `meta` plus an `initialize` handler. Category is derived from the
 * folder structure unless overridden in `meta.category`.
 */
async function loadEndpointsFromDirectory(
  directory: string,
  categoryPath = ''
): Promise<EndpointBucket[]> {
  const endpoints: EndpointBucket[] = [];
  const fullPath = path.isAbsolute(directory) ? directory : path.resolve(directory);

  if (!fs.existsSync(fullPath)) {
    logger.warn(`Directory not found: ${fullPath}`);
    return endpoints;
  }

  logger.info(`Scanning directory: ${fullPath}`);

  const items = await fsPromises.readdir(fullPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(fullPath, item.name);

    if (item.isDirectory()) {
      const subCategory = categoryPath ? `${categoryPath}/${item.name}` : item.name;
      const nested = await loadEndpointsFromDirectory(itemPath, subCategory);
      endpoints.push(...nested);
      continue;
    }

    const isModuleFile =
      item.isFile() &&
      (item.name.endsWith('.js') || item.name.endsWith('.ts')) &&
      !item.name.endsWith('.d.ts');

    if (!isModuleFile) continue;

    try {
      const itemURL = pathToFileURL(itemPath).href;
      const modImport = (await import(itemURL)) as ApiModule & { default?: ApiModule };
      const mod = modImport.default ?? modImport;

      const handler = mod?.initialize;
      const meta = mod?.meta;

      if (typeof handler !== 'function' || !meta) {
        logger.warn(`Skipped ${item.name} because no meta/initialize() was found`);
        continue;
      }

      const name = item.name.replace(/\.(js|ts)$/, '');
      const cat = meta.category || categoryPath || 'other';
      const catSlug = String(cat).toLowerCase().replace(/[\s/]+/g, '-');
      const route = `/${catSlug}/${name}`;

      const methods: HttpMethod[] = Array.isArray(meta.method)
        ? meta.method
        : [meta.method || 'get'];

      for (const method of methods) {
        const lower = String(method).toLowerCase() as HttpMethod;
        if (!SUPPORTED_METHODS.includes(lower)) {
          logger.warn(`Unsupported method "${method}" in ${item.name}`);
          continue;
        }
        resolvedRoutes.push({
          method: lower,
          route,
          module: { meta, initialize: handler },
        });
      }

      let displayPath = route;
      if (Array.isArray(meta.params) && meta.params.length > 0) {
        displayPath += `?${meta.params.map((p) => `${p.name}=`).join('&')}`;
      }

      let bucket = endpoints.find((e) => e.name === cat);
      if (!bucket) {
        bucket = { name: cat, items: [] };
        endpoints.push(bucket);
      }

      bucket.items.push({
        ...meta,
        path: displayPath,
        methods: methods.map((m) => String(m).toUpperCase()),
      });

      logger.ready(`${chalk.green(route)} ${chalk.dim('(')}${chalk.cyan(String(cat))}${chalk.dim(')')}`);
    } catch (error) {
      logger.error(`Failed to load module ${itemPath}: ${(error as Error).message}`);
    }
  }

  return endpoints;
}

logger.info('Loading API endpoints...');
allEndpoints = await loadEndpointsFromDirectory(APIS_DIR);
totalEndpoints = allEndpoints.reduce((total, cat) => total + cat.items.length, 0);
logger.ready(`Loaded ${totalEndpoints} endpoints`);

await loadNotifications();

// ---- Response caching (in-memory LRU + ETag/304 revalidation) ----
//
// GET responses that opt in via `cache-control: public` (canvas images,
// static meta JSON) are cached in memory. Repeated identical requests are
// served straight from the cache and, when the client sends If-None-Match,
// answered with a 304 — no handler runs, no PNG is re-encoded, and the
// round-trip stays well under a millisecond.
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

function etagFor(data: Uint8Array): string {
  return '"' + createHash('sha1').update(data).digest('hex').slice(0, 16) + '"';
}

interface CachedResponseEntry {
  body: Uint8Array;
  headers: Record<string, string>;
  etag: string;
  expiresAt: number;
}

const responseCache = new Map<string, CachedResponseEntry>();
const RESPONSE_CACHE_MAX = 128;
const RESPONSE_CACHE_MAX_BYTES = 64 * 1024 * 1024;
let responseCacheBytes = 0;

function responseCacheKey(req: Request): string {
  const url = new URL(req.url);
  return `${req.method} ${url.pathname}${url.search}`;
}

function storeResponseCache(key: string, entry: CachedResponseEntry): void {
  const prev = responseCache.get(key);
  if (prev) responseCacheBytes -= prev.body.byteLength;

  responseCache.set(key, entry);
  responseCacheBytes += entry.body.byteLength;

  while (
    responseCache.size > RESPONSE_CACHE_MAX ||
    responseCacheBytes > RESPONSE_CACHE_MAX_BYTES
  ) {
    const oldest = responseCache.keys().next().value;
    if (oldest === undefined) break;
    const evicted = responseCache.get(oldest)!;
    responseCacheBytes -= evicted.body.byteLength;
    responseCache.delete(oldest);
  }
}

function invalidateResponseCachePath(pathname: string): void {
  for (const key of responseCache.keys()) {
    if (key.includes(` ${pathname}`) && (key === `GET ${pathname}` || key.includes(` ${pathname}?`))) {
      const evicted = responseCache.get(key);
      if (evicted) responseCacheBytes -= evicted.body.byteLength;
      responseCache.delete(key);
    }
  }
}

/**
 * Wraps a GET handler with ETag/304 + LRU response caching. Non-GET
 * requests and responses without `cache-control: public` pass through
 * untouched. Cache validity is bounded by the response's `max-age` (capped
 * at 5 minutes) so changing upstream content can never be served stale for
 * long.
 */
function cacheGet(handler: (ctx: EndpointCtx) => unknown | Promise<unknown>) {
  return async (ctx: EndpointCtx): Promise<unknown> => {
    const { request } = ctx;
    if (request.method !== 'GET') return handler(ctx);

    const key = responseCacheKey(request);
    const cached = responseCache.get(key);

    if (cached) {
      if (cached.expiresAt <= Date.now()) {
        responseCache.delete(key);
      } else {
        const inm = request.headers.get('if-none-match');
        if (inm && (inm === '*' || inm.includes(cached.etag))) {
          return new Response(null, {
            status: 304,
            headers: { etag: cached.etag, 'cache-control': cached.headers['cache-control'] ?? 'public' },
          });
        }
        return new Response(cached.body, { status: 200, headers: cached.headers });
      }
    }

    const result = await handler(ctx);
    const res = result instanceof Response ? result : null;

    if (res) {
      const cc = res.headers.get('cache-control') ?? '';
      if (cc.includes('public') && !cc.includes('no-store') && res.status === 200) {
        const body = new Uint8Array(await res.clone().arrayBuffer());
        const etag = res.headers.get('etag') ?? etagFor(body);
        const maxAge = Number(/max-age=(\d+)/.exec(cc)?.[1] ?? 60);
        storeResponseCache(key, {
          body,
          headers: { ...Object.fromEntries(res.headers.entries()), etag },
          etag,
          expiresAt: Date.now() + Math.min(maxAge, 300) * 1000,
        });

        // Ensure the first response also advertises the ETag so clients can
        // revalidate (and get a 304) on the next request.
        if (!res.headers.get('etag')) {
          return new Response(body, { status: 200, headers: { ...Object.fromEntries(res.headers.entries()), etag } });
        }
      }
    }

    return result;
  };
}

/** Pre-built JSON Response for a core meta route (serialized once, ETagged). */
function metaResponse(data: unknown): Response {
  const body = Buffer.from(JSON.stringify(data));
  const etag = etagFor(body);
  return new Response(body, {
    headers: { 'content-type': JSON_CONTENT_TYPE, 'cache-control': 'public, max-age=60', etag },
  });
}

let endpointsMeta = metaResponse({ status: true, count: totalEndpoints, endpoints: allEndpoints });
let configMeta = metaResponse({ status: true, ...config, notification: notificationsCache });
let notifMeta = metaResponse({ notifications: notificationsCache });

function rebuildMetaCache(): void {
  configMeta = metaResponse({ status: true, ...config, notification: notificationsCache });
  notifMeta = metaResponse({ notifications: notificationsCache });
  invalidateResponseCachePath('/api/config');
  invalidateResponseCachePath('/api/notifications');
}

function isKnownApiPath(reqPath: string): boolean {
  return (
    reqPath.startsWith('/api/') ||
    allEndpoints.some((bucket) => bucket.items.some((item) => reqPath === item.path.split('?')[0]))
  );
}

function wantsHtml(request: Request): boolean {
  if (request.method !== 'GET') return false;
  const accept = request.headers.get('accept') ?? '';
  return accept.includes('text/html') && !accept.includes('application/json');
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

const MISSING_BUILD_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Aqua APIs — build missing</title></head>
<body style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:64px auto;padding:0 20px;color:#1e293b;line-height:1.6;">
  <h1 style="margin-bottom:4px;">Frontend build not found</h1>
  <p>The API server is running, but <code>packages/web/dist</code> hasn't been built yet.</p>
  <p>From the repo root, run:</p>
  <pre style="background:#0d1420;color:#e2e8f0;padding:14px 16px;border-radius:10px;overflow:auto;">npm install
npm run build</pre>
  <p>Then restart the server with <code>npm start</code>. If you're deploying this monorepo, make sure your host's build command runs the <strong>root</strong> <code>npm run build</code> script (which builds <code>web</code> before <code>aqua</code>), not just the backend package on its own.</p>
</body>
</html>`;

function notFoundHtml(p: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Not found</title></head><body style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:96px auto;text-align:center;color:#1e293b;"><h1>Page not found</h1><p>${p} doesn't exist.</p><a href="/" style="color:#0ab4e8;">Go back home</a></body></html>`;
}

const STATIC_CACHE = (ext: string): string =>
  isProduction
    ? ext === '.html' || ext === '.js' || ext === '.css' || ext === '.map'
      ? 'public, max-age=0'
      : 'public, max-age=86400'
    : 'no-cache';

/** Serves a file from the web dist directory, with SPA fallback and ETag/304. Returns null when nothing matches. */
interface StaticFileEntry {
  data: Uint8Array;
  etag: string;
  contentType: string;
  mtimeMs: number;
  size: number;
}

const staticCache = new Map<string, StaticFileEntry>();
const STATIC_CACHE_MAX_BYTES = 64 * 1024 * 1024;
let staticCacheBytes = 0;

/** Reads (and caches) a file from disk, invalidating when mtime/size changes. */
async function getStaticFile(filePath: string): Promise<StaticFileEntry | null> {
  let stat;
  try {
    stat = statSync(filePath);
    if (!stat.isFile()) return null;
  } catch {
    return null;
  }

  const cached = staticCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached;
  }

  try {
    const data = new Uint8Array(await fsPromises.readFile(filePath));
    const entry: StaticFileEntry = {
      data,
      etag: etagFor(data),
      contentType: MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      mtimeMs: stat.mtimeMs,
      size: stat.size,
    };

    const prev = staticCache.get(filePath);
    if (prev) staticCacheBytes -= prev.data.byteLength;
    staticCache.set(filePath, entry);
    staticCacheBytes += data.byteLength;

    while (staticCacheBytes > STATIC_CACHE_MAX_BYTES && staticCache.size > 0) {
      const oldest = staticCache.keys().next().value!;
      staticCacheBytes -= staticCache.get(oldest)!.data.byteLength;
      staticCache.delete(oldest);
    }

    return entry;
  } catch {
    return null;
  }
}

async function serveStatic(urlPath: string, request: Request): Promise<Response | null> {
  if (!frontendBuilt) {
    return new Response(MISSING_BUILD_HTML, { status: 503, headers: { 'content-type': 'text/html' } });
  }

  // Only serve paths that resolve inside the web dist directory.
  const resolved = path.resolve(WEB_DIST_DIR, '.' + urlPath);
  if (!resolved.startsWith(path.resolve(WEB_DIST_DIR))) {
    return null;
  }

  let filePath = resolved;
  try {
    if (statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    // Falls through to the SPA fallback below.
  }

  let entry = await getStaticFile(filePath);

  // SPA fallback — unmatched client-side routes render the app shell.
  if (!entry) {
    const indexPath = path.join(WEB_DIST_DIR, 'index.html');
    if (existsFile(indexPath)) {
      entry = await getStaticFile(indexPath);
    }
  }

  if (!entry) return null;

  const inm = request.headers.get('if-none-match');
  if (inm && (inm === '*' || inm.includes(entry.etag))) {
    return new Response(null, {
      status: 304,
      headers: { etag: entry.etag, 'cache-control': STATIC_CACHE(path.extname(filePath)), 'vary': 'Accept-Encoding' },
    });
  }

  return new Response(entry.data, {
    headers: { 'content-type': entry.contentType, 'cache-control': STATIC_CACHE(path.extname(filePath)), 'etag': entry.etag },
  });
}

function existsFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Compresses an already-buffered text/json response with gzip or brotli. */
async function compressResponse(response: Response, request: Request): Promise<Response> {
  const accept = request.headers.get('accept-encoding') ?? '';
  const type = response.headers.get('content-type') ?? '';
  const len = Number(response.headers.get('content-length') ?? 0);

  const compressesText =
    type.startsWith('text/') ||
    type.includes('json') ||
    type.includes('javascript') ||
    type.includes('xml') ||
    type.includes('svg');

  if (!compressesText || (len > 0 && len < 1024)) return response;
  if (response.status === 204 || response.status === 304) return response;

  const acceptsBrotli = accept.includes('br');
  const acceptsGzip = /\bgzip\b/.test(accept);

  if (!acceptsBrotli && !acceptsGzip) return response;

  const buf = Buffer.from(await response.arrayBuffer());
  if (!buf.length) return response;

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.set('content-encoding', acceptsBrotli ? 'br' : 'gzip');
  headers.set('vary', 'Accept-Encoding');

  const compressed = acceptsBrotli ? brotliCompressSync(buf) : gzipSync(buf);
  headers.set('content-length', String(compressed.length));
  return new Response(new Uint8Array(compressed), { status: response.status, headers });
}

logger.info('Building Elysia application...');
const app = new Elysia({ adapter: node() })
  .decorate('config', config)
  .decorate('logger', logger);

// ---- Core meta endpoints (pre-built JSON + ETag/304 via cacheGet) ----
app
  .get('/api/endpoints', cacheGet(() => endpointsMeta))
  .get('/api/config', cacheGet(() => configMeta))
  .get('/api/notifications', cacheGet(() => notifMeta))
  .post('/api/notification', async (ctx) => {
    const apiKey = env.API_KEY || config.key;
    const body = (typeof ctx.body === 'object' && ctx.body !== null ? ctx.body : {}) as Record<string, any>;

    if (ctx.request.headers.get('authorization') !== apiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
    }

    const { message, clear, firstName } = body;

    if (clear) {
      notificationsCache = [];
      await saveNotifications();
      rebuildMetaCache();
      return { success: true, cleared: true };
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Missing message' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const newNotif: Notification = {
      id: Date.now(),
      title: `From Developer ${firstName || ''}`.trim(),
      message: String(message).trim(),
      createdAt: Date.now(),
    };

    notificationsCache.push(newNotif);
    await saveNotifications();
    rebuildMetaCache();

    return { success: true };
  });

// ---- Dynamically mount each endpoint module onto Elysia ----
for (const def of resolvedRoutes) {
  const method = def.method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  app.route(method, def.route, cacheGet((ctx) => def.module.initialize(ctx as EndpointCtx)));
}

// ---- Static assets + SPA fallback (registered last so real routes win) ----
app.get('*', async ({ request }) => {
  const url = new URL(request.url);

  if (isKnownApiPath(url.pathname)) {
    return new Response(JSON.stringify({ status: false, error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  }

  const staticFile = await serveStatic(url.pathname, request);
  if (staticFile) return compressResponse(staticFile, request);

  if (wantsHtml(request)) {
    return new Response(notFoundHtml(url.pathname), { status: 404, headers: { 'content-type': 'text/html' } });
  }

  return new Response(JSON.stringify({ status: false, error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
});

app.listen(PORT, () => {
  logger.ready('Server started successfully');
  logger.info(`Local:   ${chalk.cyan(`http://localhost:${PORT}`)}`);

  try {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === 'IPv4' && !net.internal) {
          logger.info(`Network: ${chalk.cyan(`http://${net.address}:${PORT}`)}`);
        }
      }
    }
  } catch (error) {
    logger.warn(`Cannot detect network interfaces: ${(error as Error).message}`);
  }

  logger.info(chalk.dim('Ready for connections'));
});

export default app;