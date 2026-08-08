// Must be the very first import: populates process.env from .env before
// any other module (including env.config.ts) reads it.
import './load-env.js';

import { Elysia } from 'elysia';
import { node } from '@elysiajs/node';
import { promises as fsPromises, statSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { networkInterfaces } from 'node:os';
import { brotliCompressSync, gzipSync } from 'node:zlib';
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

/** Serves a file from the web dist directory, with SPA fallback. Returns null when nothing matches. */
async function serveStatic(urlPath: string): Promise<Response | null> {
  if (!frontendBuilt) {
    return new Response(MISSING_BUILD_HTML, { status: 503, headers: { 'content-type': 'text/html' } });
  }

  // Only serve paths that resolve inside the web dist directory.
  const resolved = path.resolve(WEB_DIST_DIR, '.' + urlPath);
  if (!resolved.startsWith(path.resolve(WEB_DIST_DIR))) {
    return null;
  }

  let filePath = resolved;
  let data: Buffer | null = null;
  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    data = await fsPromises.readFile(filePath);
  } catch {
    data = null;
  }

  // If we couldn't read the resolved file path directly, try the SPA fallback.
  if (data === null) {
    const indexPath = path.join(WEB_DIST_DIR, 'index.html');
    if (existsFile(indexPath)) {
      data = await fsPromises.readFile(indexPath);
      return new Response(new Uint8Array(data), {
        status: 200,
        headers: { 'content-type': MIME_TYPES['.html'], 'cache-control': STATIC_CACHE('.html') },
      });
    }
    return null;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
  return new Response(new Uint8Array(data), {
    headers: { 'content-type': contentType, 'cache-control': STATIC_CACHE(ext) },
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

// ---- Core meta endpoints ----
app
  .get('/api/endpoints', () => ({
    status: true,
    count: totalEndpoints,
    endpoints: allEndpoints,
  }))
  .get('/api/config', () => ({
    status: true,
    ...config,
    notification: notificationsCache,
  }))
  .get('/api/notifications', () => ({ notifications: notificationsCache }))
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

    return { success: true };
  });

// ---- Dynamically mount each endpoint module onto Elysia ----
for (const def of resolvedRoutes) {
  const method = def.method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  app.route(method, def.route, (ctx) => def.module.initialize(ctx as EndpointCtx));
}

// ---- Static assets + SPA fallback (registered last so real routes win) ----
app.get('*', async ({ request }) => {
  const url = new URL(request.url);

  if (isKnownApiPath(url.pathname)) {
    return new Response(JSON.stringify({ status: false, error: 'Not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  }

  const staticFile = await serveStatic(url.pathname);
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