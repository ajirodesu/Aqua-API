/*
 * INFO: admin-router.ts
 * REST API for the Aqua admin dashboard — by AjiroDesu.
 *
 * Mirrors the Persian-Bot admin surface (login gate, overview stats, module
 * toggles, logs, settings) adapted to Aqua's data. The only account in the
 * system is the admin (env credentials) — there are no managed users.
 * Every route except login/health requires a Bearer admin session and is
 * additionally rate limited.
 *
 * API contract (also mirrored in web/src/lib/adminTypes.ts):
 *   errors:  { error: string } with 400/401/403/404/429/503 status
 *   success: JSON objects documented per route below
 */

import { Router, type Request, type Response } from 'express';
import {
  createAdminSession,
  destroyAdminSession,
  getAdminSession,
  hashAdminPassword,
  isAdminConfigured,
  normalizeUsername,
  rateLimit,
  requireAdmin,
  setupKey,
  verifyAdminLogin,
} from './admin-auth.js';
import { adminStore } from './admin-store.js';
import {
  hourlyActivity,
  queryLogs,
  requestStats,
  subscribeLogs,
  trafficStats,
  unsubscribeLogs,
  type LogLevel,
} from './request-log.js';
import { getSiteConfig, updateSiteConfig } from './site-config.js';
import { dbKind, getDb } from '../db/index.js';
import { env } from './env.config.js';
import type { EndpointBucket } from './types.js';

export const adminRouter = Router();

const adminLimiter = rateLimit(120, 60_000);

adminRouter.use(adminLimiter);

type EndpointProvider = () => EndpointBucket[];
let endpointProvider: EndpointProvider = () => [];

/** Wired by app.ts after the dynamic endpoint scan finishes. */
export function setEndpointProvider(provider: EndpointProvider): void {
  endpointProvider = provider;
}

// --- validation helpers ----------------------------------------------------

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function requiredString(value: unknown, field: string, res: Response): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    res.status(400).json({ error: `Missing required field: ${field}` });
    return null;
  }
  return value.trim();
}

// --- auth ------------------------------------------------------------------

adminRouter.post('/login', async (req: Request, res: Response) => {
  const username = asString(req.body?.username) ?? '';
  const password = asString(req.body?.password) ?? '';
  if (username === '' || password === '') {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }
  const verified = await verifyAdminLogin(username, password);
  if (verified === null) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const session = createAdminSession(verified);
  res.json({ token: session.token, username: session.username, expiresAt: session.expiresAt });
});

adminRouter.post('/register', async (req: Request, res: Response) => {
  const key = setupKey();
  if (key === undefined) {
    res.status(503).json({ error: 'Registration is unavailable (no API setup key configured)' });
    return;
  }
  const provided = asString(req.body?.setupKey) ?? '';
  if (provided === '' || provided !== key) {
    res.status(403).json({ error: 'Invalid setup key' });
    return;
  }
  const username = normalizeUsername(asString(req.body?.username) ?? '');
  if (username === null) {
    res
      .status(400)
      .json({ error: 'Invalid username (3–32 chars: lowercase letters, digits, _ or -)' });
    return;
  }
  const password = asString(req.body?.password) ?? '';
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }
  const db = await getDb();
  if (await db.findAdminByUsername(username)) {
    res.status(409).json({ error: 'Username is already taken' });
    return;
  }
  const now = Date.now();
  await db.createAdmin({
    id: now.toString(36) + Math.random().toString(36).slice(2, 10),
    username,
    passwordHash: hashAdminPassword(password),
    createdAt: now,
  });
  const session = createAdminSession(username);
  res
    .status(201)
    .json({ token: session.token, username: session.username, expiresAt: session.expiresAt });
});

adminRouter.post('/logout', (req: Request, res: Response) => {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    destroyAdminSession(header.slice('Bearer '.length).trim());
  }
  res.json({ success: true });
});

adminRouter.get('/me', (req: Request, res: Response) => {
  const header = req.headers.authorization;
  const token =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : undefined;
  const session = getAdminSession(token);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ username: session.username, expiresAt: session.expiresAt });
});

// Everything below requires a valid admin Bearer session.
adminRouter.use(requireAdmin);

// --- overview / status -----------------------------------------------------

adminRouter.get('/status', (req: Request, res: Response) => {
  const buckets = endpointProvider();
  const totalEndpoints = buckets.reduce((sum, b) => sum + b.items.length, 0);
  const stats = requestStats();
  void req;
  res.json({
    ...stats,
    totalEndpoints,
    categories: buckets.length,
    disabledEndpoints: adminStore.state.disabledEndpoints.length,
    maintenance: adminStore.state.maintenance,
    configured: isAdminConfigured(),
    db: dbKind(),
  });
});

adminRouter.get('/activity', (req: Request, res: Response) => {
  void req;
  res.json({ hours: hourlyActivity() });
});

// --- complete stats ----------------------------------------------------------

adminRouter.get('/stats', (req: Request, res: Response) => {
  void req;
  const buckets = endpointProvider();
  const stats = requestStats();
  const traffic = trafficStats(10);
  res.json({
    ...stats,
    totalEndpoints: buckets.reduce((sum, b) => sum + b.items.length, 0),
    categories: buckets.length,
    disabledEndpoints: adminStore.state.disabledEndpoints.length,
    maintenance: adminStore.state.maintenance,
    db: dbKind(),
    hours: hourlyActivity(),
    byStatus: traffic.byStatus,
    bySource: traffic.bySource,
    topPaths: traffic.topPaths,
  });
});

// --- endpoints (commands/modules) ------------------------------------------

adminRouter.get('/endpoints', (req: Request, res: Response) => {
  void req;
  const buckets = endpointProvider().map((b) => ({
    name: b.name,
    items: b.items.map((i) => ({
      name: i.name,
      desc: i.desc,
      path: i.path.split('?')[0],
      methods: i.methods,
      category: b.name,
      enabled: !adminStore.isEndpointDisabled(i.path.split('?')[0]),
    })),
  }));
  res.json({ buckets });
});

adminRouter.patch('/endpoints', async (req: Request, res: Response) => {
  const path = requiredString(req.body?.path, 'path', res);
  if (path === null) return;
  if (typeof req.body?.enabled !== 'boolean') {
    res.status(400).json({ error: 'Missing required field: enabled (boolean)' });
    return;
  }
  const known = endpointProvider().some((b) =>
    b.items.some((i) => i.path.split('?')[0] === path)
  );
  if (!known) {
    res.status(404).json({ error: 'Endpoint not found' });
    return;
  }
  const disabled = new Set(adminStore.state.disabledEndpoints);
  if (req.body.enabled) {
    disabled.delete(path);
  } else {
    disabled.add(path);
  }
  adminStore.state.disabledEndpoints = [...disabled];
  await adminStore.saveState();
  res.json({ path, enabled: req.body.enabled as boolean });
});

// --- logs ------------------------------------------------------------------

function parseLevel(value: unknown): LogLevel | undefined {
  return value === 'info' || value === 'warn' || value === 'error' ? value : undefined;
}

adminRouter.get('/logs', (req: Request, res: Response) => {
  const levelRaw = req.query.level;
  const level = levelRaw === undefined || levelRaw === '' ? undefined : parseLevel(levelRaw);
  if (levelRaw !== undefined && levelRaw !== '' && level === undefined) {
    res.status(400).json({ error: 'Invalid level (info, warn or error)' });
    return;
  }
  const source = asString(req.query.source);
  const search = (asString(req.query.search) ?? '').toLowerCase() || undefined;
  const limit = Math.min(200, Math.max(1, Math.floor(Number(req.query.limit) || 100)));
  const beforeRaw = Number(req.query.before);
  const before = Number.isFinite(beforeRaw) && beforeRaw > 0 ? beforeRaw : undefined;
  res.json(queryLogs({ level, source, search, limit, before }));
});

adminRouter.get('/logs/stream', (req: Request, res: Response) => {
  const header = req.headers.authorization;
  const headerToken =
    typeof header === 'string' && header.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : undefined;
  const queryToken = asString(req.query.token);
  if (!getAdminSession(headerToken ?? queryToken)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`: connected\n\n`);
  const id = subscribeLogs(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      // Client gone; the close handler below cleans up.
    }
  }, 25000);
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribeLogs(id);
  });
});

// --- announcements -----------------------------------------------------------

adminRouter.post('/announce', async (req: Request, res: Response) => {
  const message = requiredString(req.body?.message, 'message', res);
  if (message === null) return;
  const titleRaw = asString(req.body?.title);
  const now = Date.now();
  const notification = {
    id: now,
    title: titleRaw && titleRaw.trim() !== '' ? titleRaw.trim().slice(0, 120) : 'Announcement',
    message: message.slice(0, 2000),
    createdAt: now,
  };
  const db = await getDb();
  await db.addNotification(notification);
  res.status(201).json(notification);
});

adminRouter.delete('/announce', async (req: Request, res: Response) => {
  void req;
  const db = await getDb();
  await db.clearNotifications();
  res.json({ success: true, cleared: true });
});

// --- settings ------------------------------------------------------------------

function masked(value: string | undefined): { set: boolean; preview: string } {
  if (!value) return { set: false, preview: '' };
  return { set: true, preview: value.length <= 8 ? '••••••••' : `${value.slice(0, 4)}••••••••` };
}

adminRouter.get('/settings', (req: Request, res: Response) => {
  void req;
  const config = getSiteConfig();
  res.json({
    name: config.name,
    description: config.description,
    status: config.header.status,
    telegram: config.telegram ?? '',
    github: config.github ?? '',
    messenger: config.messenger ?? '',
    operator: config.operator,
    maintenance: adminStore.state.maintenance,
    keys: {
      API_KEY: masked(env.API_KEY ?? (typeof config.key === 'string' ? config.key : undefined)),
      LUMENFALL_API: masked(env.LUMENFALL_API),
      SHOTI_APIKEY: masked(env.SHOTI_APIKEY),
      PIXABAY_API_KEY: masked(env.PIXABAY_API_KEY),
      UNSPLASH_ACCESS_KEY: masked(env.UNSPLASH_ACCESS_KEY),
      GITHUB_TOKEN: masked(env.GITHUB_TOKEN),
    },
  });
});

adminRouter.put('/settings', async (req: Request, res: Response) => {
  if (req.body && typeof req.body === 'object' && 'maintenance' in req.body) {
    if (typeof req.body.maintenance !== 'boolean') {
      res.status(400).json({ error: 'Invalid maintenance flag' });
      return;
    }
    adminStore.state.maintenance = req.body.maintenance;
    await adminStore.saveState();
  }
  const updated = updateSiteConfig({
    name: asString(req.body?.name),
    description: asString(req.body?.description),
    status: asString(req.body?.status),
    telegram: asString(req.body?.telegram),
    github: asString(req.body?.github),
    messenger: asString(req.body?.messenger),
  });
  res.json({
    name: updated.name,
    description: updated.description,
    status: updated.header.status,
    telegram: updated.telegram ?? '',
    github: updated.github ?? '',
    messenger: updated.messenger ?? '',
    operator: updated.operator,
    maintenance: adminStore.state.maintenance,
  });
});
