/*
 * INFO: db/fake.ts
 * Fake database for Aqua — by AjiroDesu.
 *
 * Zero-setup stand-in for Neon implementing the exact same AquaDb
 * interface: tables live in memory and are persisted to a local JSON file
 * (FAKE_DB_FILE, default src/json/fakedb.json) so data survives restarts.
 * The app boots instantly with no credentials; point NEON_DATABASE_URL at
 * a real project to switch to Postgres without touching any other code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AquaDb, DbAdmin, DbNotification } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FakeDump {
  settings: Record<string, string>;
  notifications: DbNotification[];
  admins: DbAdmin[];
}

function defaultFile(): string {
  return path.resolve(__dirname, '..', 'json', 'fakedb.json');
}

function loadDump(file: string): FakeDump {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<FakeDump>;
    return {
      settings: typeof parsed.settings === 'object' && parsed.settings !== null ? parsed.settings : {},
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      admins: Array.isArray(parsed.admins) ? parsed.admins : [],
    };
  } catch {
    return { settings: {}, notifications: [], admins: [] };
  }
}

export function createFakeDb(file?: string): AquaDb {
  const target = file ?? process.env['FAKE_DB_FILE'] ?? defaultFile();
  let dump = loadDump(target);

  // Seed one welcome note on a brand-new database so the dashboard
  // notification bell has something to show immediately.
  if (dump.notifications.length === 0 && Object.keys(dump.settings).length === 0) {
    dump = {
      settings: {},
      notifications: [
        {
          id: Date.now(),
          title: 'Welcome to Aqua Admin',
          message: 'Running on the instant fake database — set NEON_DATABASE_URL to switch to Neon Postgres.',
          createdAt: Date.now(),
        },
      ],
      admins: [],
    };
    persist();
  }

  function persist(): void {
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(dump, null, 2), 'utf8');
    } catch {
      // Persistence is best-effort; memory stays authoritative.
    }
  }

  return {
    kind: 'fake',
    ready: Promise.resolve(),
    async getSetting(key: string): Promise<string | null> {
      return dump.settings[key] ?? null;
    },
    async setSetting(key: string, value: string): Promise<void> {
      dump.settings[key] = value;
      persist();
    },
    async listNotifications(): Promise<DbNotification[]> {
      return [...dump.notifications].sort((a, b) => b.createdAt - a.createdAt);
    },
    async addNotification(n: DbNotification): Promise<void> {
      dump.notifications.push({ ...n });
      persist();
    },
    async clearNotifications(): Promise<void> {
      dump.notifications = [];
      persist();
    },
    async countAdmins(): Promise<number> {
      return dump.admins.length;
    },
    async listAdmins(): Promise<Omit<DbAdmin, 'passwordHash'>[]> {
      return dump.admins.map(({ passwordHash: _hash, ...rest }) => rest);
    },
    async findAdminByUsername(username: string): Promise<DbAdmin | null> {
      return dump.admins.find((a) => a.username === username) ?? null;
    },
    async createAdmin(admin: DbAdmin): Promise<void> {
      if (dump.admins.some((a) => a.username === admin.username)) {
        throw new Error('duplicate username');
      }
      dump.admins.push({ ...admin });
      persist();
    },
    async ping(): Promise<{ ok: boolean; latencyMs: number }> {
      return { ok: true, latencyMs: 0 };
    },
  };
}
