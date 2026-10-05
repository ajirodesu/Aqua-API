/*
 * INFO: admin-auth.ts
 * Admin authentication for the Aqua admin dashboard — by AjiroDesu.
 *
 * Accounts live in the database (Neon table `aqua_admins`, or the fake).
 * Passwords are NEVER stored — only scrypt hashes with per-account salts,
 * so a database leak reveals nothing usable. Sessions are opaque Bearer
 * tokens kept in memory and never expire on their own; only the logout
 * button destroys them. Registration is gated by the server setup key
 * (API_KEY env, else config.json `key`).
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from './env.config.js';
import { getSiteConfig } from './site-config.js';
import { getDb } from '../db/index.js';

interface AdminSession {
  token: string;
  username: string;
  // Sessions never expire on their own — the only way out is the logout
  // button (which deletes the token server-side and clears the client).
  // expiresAt is kept as null for API shape stability.
  expiresAt: null;
}

const sessions = new Map<string, AdminSession>();

const TOKEN_BYTES = 32;

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;

/** Creates a `scrypt$...` hash for storage. Throws on weak input. */
export function hashAdminPassword(password: string): string {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = randomBytes(16);
  const params = { N: SCRYPT_N, R: SCRYPT_R, P: SCRYPT_P, maxmem: 64 * 1024 * 1024 };
  const key = scryptSync(password, salt, SCRYPT_KEYLEN, params);
  const paramsHex = Buffer.from(JSON.stringify(params), 'utf8').toString('hex');
  return `scrypt$${salt.toString('hex')}$${paramsHex}$${key.toString('hex')}`;
}

/** Parses `scrypt$saltHex$paramsHex$keyHex` — false on any malformed input. */
function verifyScryptHash(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const [, saltHex, paramsHex, keyHex] = parts;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    const params = JSON.parse(Buffer.from(paramsHex, 'hex').toString('utf8')) as {
      N: number;
      r: number;
      p: number;
      maxmem: number;
    };
    const derived = scryptSync(password, salt, expected.length, {
      N: params.N,
      r: params.r,
      p: params.p,
      maxmem: params.maxmem,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Precomputed dummy hash so unknown usernames take the same time as real checks. */
const DUMMY_HASH = hashAdminPassword('dummy-account-placeholder-00000000');

/** The server setup key required to register admin accounts. */
export function setupKey(): string | undefined {
  const fromEnv = env.API_KEY;
  if (fromEnv !== undefined) return fromEnv;
  const fromConfig = getSiteConfig().key;
  return typeof fromConfig === 'string' && fromConfig !== '' ? fromConfig : undefined;
}

export function isAdminConfigured(): boolean {
  return setupKey() !== undefined;
}

export function normalizeUsername(raw: string): string | null {
  const username = raw.trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,32}$/.test(username)) return null;
  return username;
}

/** Returns the username on success, null otherwise (timing-safe for unknown users). */
export async function verifyAdminLogin(username: string, password: string): Promise<string | null> {
  const normalized = normalizeUsername(username);
  if (normalized === null || password === '') {
    verifyScryptHash(password || 'x', DUMMY_HASH);
    return null;
  }
  const db = await getDb();
  const admin = await db.findAdminByUsername(normalized);
  const hash = admin ? admin.passwordHash : DUMMY_HASH;
  if (!verifyScryptHash(password, hash)) return null;
  return admin ? admin.username : null;
}

export function createAdminSession(username: string): AdminSession {
  const token = randomBytes(TOKEN_BYTES).toString('hex');
  const session: AdminSession = { token, username, expiresAt: null };
  sessions.set(token, session);
  return session;
}

export function destroyAdminSession(token: string): void {
  sessions.delete(token);
}

export function getAdminSession(token: string | undefined): AdminSession | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    return token !== '' ? token : undefined;
  }
  return undefined;
}

/** Express guard: 401 without a valid session — mirrors Persian-Bot's requireAdmin. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminConfigured()) {
    res.status(503).json({ error: 'Admin dashboard is not configured (missing API setup key)' });
    return;
  }
  // EventSource cannot send headers, so the SSE stream also accepts ?token=.
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
  const session = getAdminSession(bearerToken(req) ?? queryToken);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Minimal fixed-window IP rate limiter (mirrors Persian-Bot's rate-limit middleware). */
export function rateLimit(maxRequests: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.socket.remoteAddress ??
      'unknown';
    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    if (bucket.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    next();
  };
}
