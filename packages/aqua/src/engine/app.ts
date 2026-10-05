// Must be the very first import: populates process.env from .env before
// any other module (including env.config.ts) reads it.
import './load-env.js';

import express from 'express';
import fs from 'node:fs';
import { promises as fsPromises } from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { networkInterfaces } from 'node:os';
import chalk from 'chalk';

import { logger } from './logger.js';
import { env, validateEnv } from './env.config.js';
import { requestLogger } from './request-log.js';
import { adminRouter, setEndpointProvider } from './admin-router.js';
import { getDb } from '../db/index.js';
import { adminStore, initAdminStore } from './admin-store.js';
import { getSiteConfig } from './site-config.js';
import type {
  ApiModule,
  EndpointBucket,
  HttpMethod,
} from './types.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname is now src/engine (or dist/engine when compiled) — one extra
// level deeper than before, so paths up to the package/monorepo root and
// across to sibling src folders (apis/, json/) need one more "..".
const SRC_DIR = path.resolve(__dirname, '..');
const PACKAGE_DIR = path.resolve(SRC_DIR, '..');
const PACKAGES_DIR = path.resolve(PACKAGE_DIR, '..');
const WEB_DIST_DIR = path.join(PACKAGES_DIR, 'web', 'dist');
const APIS_DIR = path.join(SRC_DIR, 'apis');
const JSON_DIR = path.join(SRC_DIR, 'json');
const NOTIF_PATH = path.join(JSON_DIR, 'notif.json');

const app = express();
const PORT = env.PORT;
const isProduction = env.isProduction;

validateEnv();

const config = getSiteConfig();

declare module 'express-serve-static-core' {
  interface Request {
    startTime?: number;
    /** Set by the dynamic endpoint wrapper — marks real endpoint usage. */
    isEndpoint?: boolean;
  }
}

logger.info('Starting server initialization...');

// Database first: Neon when NEON_DATABASE_URL/DATABASE_URL is set,
// otherwise the instant fake (memory + local JSON file, zero setup).
const db = await getDb();
logger.ready(`Database ready (adapter: ${db.kind})`);
await initAdminStore();

app.set('trust proxy', true);
app.set('json spaces', isProduction ? 0 : 2);

// CORS: Vite dev frontend (http://localhost:5173) calls the API at its
// absolute origin (http://localhost:3000) directly — see web/src/lib/api.ts.
// Without these headers the browser blocks /api/* + dynamic endpoint calls.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(
  compression({
    threshold: 1024,
    level: isProduction ? 9 : 6,
  })
);

app.use((req, _res, next) => {
  req.startTime = Date.now();
  next();
});

app.use(requestLogger);

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = ((data: unknown) => {
    const timestamp = new Date().toISOString();
    const responseTime = `${Date.now() - (req.startTime ?? Date.now())}ms`;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return originalJson({
        operator: config.operator || '',
        timestamp,
        responseTime,
        ...(data as Record<string, unknown>),
      });
    }

    return originalJson(data as never);
  }) as typeof res.json;

  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: true, health: 'ok', uptime: Math.floor(process.uptime()) });
});

// Admin dashboard API. Mounted after the body parsers (admin login reads
// JSON bodies) but before the maintenance guard below, so the dashboard
// stays reachable while the public API is paused.
app.use('/api/admin', adminRouter);

// Maintenance mode: pause the public API (REST + dynamic endpoints) while
// leaving the admin dashboard, health probe, and frontend untouched.
app.use((req, res, next) => {
  if (!adminStore.state.maintenance) return next();
  if (req.path.startsWith('/api/admin') || req.path === '/api/health') return next();
  if (req.method === 'GET' && !isKnownApiPath(req.path)) return next();
  res.status(503).json({ error: 'Service temporarily unavailable (maintenance mode)' });
});

if (!fs.existsSync(path.join(WEB_DIST_DIR, 'index.html'))) {
  logger.warn(`Frontend build not found at ${WEB_DIST_DIR} — run "npm run build" from the repo root.`);
} else {
  logger.ready(`Serving frontend from ${WEB_DIST_DIR}`);
}

// Serve the compiled React frontend (Vite build output) as static assets.
app.use(
  express.static(WEB_DIST_DIR, {
    maxAge: isProduction ? 86400000 : 0,
    etag: true,
    lastModified: true,
    index: false,
  })
);

/**
 * Recursively scans a directory for endpoint modules and mounts them onto
 * the Express app. Each module must export `meta` plus an `initialize`
 * handler. Category is derived from the folder
 * structure unless overridden in `meta.category`.
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
      logger.info(`Found subdirectory: ${item.name}`);
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
        const expressMethod = String(method).toLowerCase() as keyof express.Application;
        if (typeof app[expressMethod] !== 'function') {
          logger.warn(`Unsupported method "${method}" in ${item.name}`);
          continue;
        }

        (app[expressMethod] as (path: string, handler: express.RequestHandler) => void)(
          route,
          async (req, res, next) => {
            try {
              if (adminStore.isEndpointDisabled(route)) {
                res.status(404).json({ error: 'Endpoint disabled' });
                return;
              }
              req.isEndpoint = true;
              await handler({ req, res, app, config, meta, logger });
            } catch (err) {
              next(err);
            }
          }
        );
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
const allEndpoints = await loadEndpointsFromDirectory(APIS_DIR);
const totalEndpoints = allEndpoints.reduce((total, cat) => total + cat.items.length, 0);
logger.ready(`Loaded ${totalEndpoints} endpoints`);
setEndpointProvider(() => allEndpoints);

app.get('/api/endpoints', (_req, res) => {
  // Disabled endpoints are invisible here (and 404 on direct access) —
  // only the admin Endpoints page lists the full catalog with flags.
  const visible = allEndpoints
    .map((bucket) => ({
      ...bucket,
      items: bucket.items.filter((i) => !adminStore.isEndpointDisabled(i.path.split('?')[0])),
    }))
    .filter((bucket) => bucket.items.length > 0);
  res.json({
    status: true,
    count: visible.reduce((total, cat) => total + cat.items.length, 0),
    endpoints: visible,
  });
});

app.get('/api/config', async (_req, res) => {
  res.json({
    status: true,
    ...config,
    notification: await db.listNotifications(),
  });
});

app.get('/api/notifications', async (_req, res) => {
  res.json({ notifications: await db.listNotifications() });
});

app.post('/api/notification', async (req, res) => {
  const apiKey = env.API_KEY || config.key;

  if (req.headers.authorization !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { message, clear, firstName } = req.body ?? {};

  if (clear) {
    await db.clearNotifications();
    return res.json({ success: true, cleared: true });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const now = Date.now();
  const notification = {
    id: now,
    title: `From Developer ${firstName || ''}`.trim(),
    message: String(message).trim(),
    createdAt: now,
  };
  await db.addNotification(notification);

  res.status(201).json({ success: true, notification });
});

/** True when the request is a browser/WebView navigation expecting an HTML page.
 *  Programmatic callers (fetch/XHR with a wildcard Accept header) always get
 *  JSON — only an explicit text/html preference ahead of any JSON yields HTML. */
function wantsHtml(req: express.Request): boolean {
  if (req.method !== 'GET') return false;
  const accept = String(req.headers.accept ?? '');
  const htmlIdx = accept.indexOf('text/html');
  if (htmlIdx === -1) return false;
  const jsonIdx = accept.indexOf('application/json');
  return jsonIdx === -1 || htmlIdx < jsonIdx;
}

function isKnownApiPath(reqPath: string): boolean {
  return (
    reqPath.startsWith('/api/') ||
    allEndpoints.some((bucket) => bucket.items.some((item) => reqPath === item.path.split('?')[0]))
  );
}

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

// SPA fallback: any non-API, non-endpoint GET request serves the React app
// so that client-side routes (e.g. /docs/random/blue-archive) work on refresh.
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (isKnownApiPath(req.path)) return next();

  const indexPath = path.join(WEB_DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  if (wantsHtml(req)) {
    return res.status(503).type('html').send(MISSING_BUILD_HTML);
  }

  return next();
});

app.use((req, res) => {
  logger.info(`404: ${req.method} ${req.path}`);

  if (wantsHtml(req) && !isKnownApiPath(req.path)) {
    return res
      .status(404)
      .type('html')
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Not found</title></head><body style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:96px auto;text-align:center;color:#1e293b;"><h1>Page not found</h1><p>${req.path} doesn't exist.</p><a href="/" style="color:#0ab4e8;">Go back home</a></body></html>`
      );
  }

  res.status(404).json({ status: false, error: 'Not found' });
});

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(`500: ${err.message}`);

  if (wantsHtml(req)) {
    return res
      .status(500)
      .type('html')
      .send(
        `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Server error</title></head><body style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:96px auto;text-align:center;color:#1e293b;"><h1>Something went wrong</h1><p>Please try again in a moment.</p></body></html>`
      );
  }

  res.status(500).json({ status: false, error: 'Internal server error' });
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
