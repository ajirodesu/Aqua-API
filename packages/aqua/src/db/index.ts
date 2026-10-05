/*
 * INFO: db/index.ts
 * Database entry point for Aqua — by AjiroDesu.
 *
 * One interface, two adapters (mirrors Persian-Bot's adapter pattern):
 *   - neon: real Neon Postgres via `pg` (NEON_DATABASE_URL or DATABASE_URL)
 *   - fake: instant zero-setup database (memory + local JSON file)
 * Selection is automatic: Neon when a connection string exists, otherwise
 * the fake. Every consumer codes against AquaDb and never branches.
 */

export interface DbNotification {
  id: number;
  title: string;
  message: string;
  createdAt: number;
}

export interface DbAdmin {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface AquaDb {
  kind: 'neon' | 'fake';
  /** Resolves when schema/persistence is ready. Await before first query. */
  ready: Promise<void>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  listNotifications(): Promise<DbNotification[]>;
  addNotification(n: DbNotification): Promise<void>;
  clearNotifications(): Promise<void>;
  countAdmins(): Promise<number>;
  listAdmins(): Promise<Omit<DbAdmin, 'passwordHash'>[]>;
  findAdminByUsername(username: string): Promise<DbAdmin | null>;
  createAdmin(admin: DbAdmin): Promise<void>;
  ping(): Promise<{ ok: boolean; latencyMs: number }>;
}

export type DbKind = AquaDb['kind'];

let singleton: AquaDb | null = null;

/** True when a Neon connection string is configured. */
export function wantsNeon(): boolean {
  const raw = process.env['NEON_DATABASE_URL'] ?? process.env['DATABASE_URL'];
  return typeof raw === 'string' && raw.trim() !== '';
}
/** Returns the process-wide database (neon when configured, fake otherwise). */
export async function getDb(): Promise<AquaDb> {
  if (singleton) return singleton;
  if (wantsNeon()) {
    const { createNeonDb } = await import('./neondb.js');
    singleton = createNeonDb();
  } else {
    const { createFakeDb } = await import('./fake.js');
    singleton = createFakeDb();
  }
  await singleton.ready;
  return singleton;
}

/** Synchronous kind check for status surfaces (no connection attempted). */
export function dbKind(): DbKind {
  return wantsNeon() ? 'neon' : 'fake';
}
