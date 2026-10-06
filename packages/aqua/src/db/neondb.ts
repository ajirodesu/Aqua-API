/*
 * INFO: db/neondb.ts
 * Neon (Postgres) adapter for Aqua — by AjiroDesu.
 *
 * Follows the Persian-Bot neondb logic: `pg` Pool over TCP (the correct
 * driver for a long-lived Node server), connection-string normalization
 * (strips pg-incompatible Neon params), idempotent DDL, and a globalThis
 * singleton so tsx --watch reloads never leak pools.
 */

import pg from 'pg';
import type { AquaDb, DbAdmin, DbNotification } from './index.js';
import { decryptSetting, encryptSetting } from '../engine/crypto.js';

const { Pool } = pg;

const globalForDb = globalThis as unknown as {
  aquaNeonPool: InstanceType<typeof Pool> | undefined;
  aquaNeonReady: Promise<void> | undefined;
};

function connectionString(): string | undefined {
  return process.env['NEON_DATABASE_URL'] ?? process.env['DATABASE_URL'];
}

function normalizeConnectionString(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('channel_binding');
    parsed.searchParams.delete('uselibpqcompat');
    return parsed.toString();
  } catch {
    return url
      .replace(/[?&]sslmode=[^&]*/g, '')
      .replace(/[?&]channel_binding=[^&]*/g, '')
      .replace(/[?&]uselibpqcompat=[^&]*/g, '')
      .replace(/\?$/, '');
  }
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS aqua_kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS aqua_notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS aqua_admins (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at BIGINT NOT NULL
  );
`;

async function initSchema(pool: InstanceType<typeof Pool>): Promise<void> {
  await pool.query(SCHEMA);
}

export function createNeonDb(): AquaDb {
  const raw = connectionString();
  if (!raw) {
    throw new Error('[db] NEON_DATABASE_URL or DATABASE_URL is required for the neon adapter');
  }
  const pool: InstanceType<typeof Pool> =
    globalForDb.aquaNeonPool ??
    new Pool({
      connectionString: normalizeConnectionString(raw),
      ssl:
        process.env['NODE_ENV'] === 'production'
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 55_000,
      connectionTimeoutMillis: 10_000,
    });
  if (process.env['NODE_ENV'] !== 'production') globalForDb.aquaNeonPool = pool;

  if (!globalForDb.aquaNeonReady) {
    globalForDb.aquaNeonReady = initSchema(pool)
      .then(() => {
        pool.query('SELECT 1').catch(() => {
          // Pre-warm failure is harmless; the pool reconnects on next query.
        });
      })
      .catch((err: unknown) => {
        console.error('[db] Failed to apply Neon schema:', err);
      });
  }
  const ready = globalForDb.aquaNeonReady;

  return {
    kind: 'neon',
    ready,
    async getSetting(key: string): Promise<string | null> {
      await ready;
      const res = await pool.query<{ value: string }>(
        'SELECT value FROM aqua_kv WHERE key = $1 LIMIT 1',
        [key]
      );
      const stored = res.rows[0]?.value ?? null;
      // Encrypted rows (enc:v1:…) decrypt here; legacy plaintext passes through.
      return stored === null ? null : decryptSetting(stored);
    },
    async setSetting(key: string, value: string): Promise<void> {
      await ready;
      await pool.query(
        `INSERT INTO aqua_kv (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, encryptSetting(value)]
      );
    },
    async listNotifications(): Promise<DbNotification[]> {
      await ready;
      const res = await pool.query<{ id: string; title: string; message: string; created_at: string }>(
        'SELECT id, title, message, created_at FROM aqua_notifications ORDER BY created_at DESC'
      );
      return res.rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        message: r.message,
        createdAt: Number(r.created_at),
      }));
    },
    async addNotification(n: DbNotification): Promise<void> {
      await ready;
      await pool.query(
        'INSERT INTO aqua_notifications (id, title, message, created_at) VALUES ($1, $2, $3, $4)',
        [String(n.id), n.title, n.message, n.createdAt]
      );
    },
    async clearNotifications(): Promise<void> {
      await ready;
      await pool.query('DELETE FROM aqua_notifications');
    },
    async countAdmins(): Promise<number> {
      await ready;
      const res = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM aqua_admins');
      return Number(res.rows[0]?.count ?? 0);
    },
    async listAdmins(): Promise<Omit<DbAdmin, 'passwordHash'>[]> {
      await ready;
      const res = await pool.query<{ id: string; username: string; created_at: string }>(
        'SELECT id, username, created_at FROM aqua_admins ORDER BY created_at ASC'
      );
      return res.rows.map((r) => ({ id: r.id, username: r.username, createdAt: Number(r.created_at) }));
    },
    async findAdminByUsername(username: string): Promise<DbAdmin | null> {
      await ready;
      const res = await pool.query<{ id: string; username: string; password_hash: string; created_at: string }>(
        'SELECT id, username, password_hash, created_at FROM aqua_admins WHERE username = $1 LIMIT 1',
        [username]
      );
      const row = res.rows[0];
      if (!row) return null;
      return { id: row.id, username: row.username, passwordHash: row.password_hash, createdAt: Number(row.created_at) };
    },
    async createAdmin(admin: DbAdmin): Promise<void> {
      await ready;
      await pool.query(
        'INSERT INTO aqua_admins (id, username, password_hash, created_at) VALUES ($1, $2, $3, $4)',
        [admin.id, admin.username, admin.passwordHash, admin.createdAt]
      );
    },
    async ping(): Promise<{ ok: boolean; latencyMs: number }> {
      const start = Date.now();
      try {
        await pool.query('SELECT 1');
        return { ok: true, latencyMs: Date.now() - start };
      } catch {
        return { ok: false, latencyMs: Date.now() - start };
      }
    },
  };
}
