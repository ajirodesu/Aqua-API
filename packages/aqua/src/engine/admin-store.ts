/*
 * INFO: admin-store.ts
 * Admin state for the Aqua admin dashboard — by AjiroDesu.
 *
 * Maintenance flag, dashboard leaderboard visibility + disabled endpoint
 * routes, persisted in the database (Neon when configured, otherwise the
 * instant fake). An in-memory mirror keeps per-request middleware reads
 * synchronous; every mutation writes through to the DB. Call
 * `initAdminStore()` once at boot to hydrate.
 */

import { getDb } from '../db/index.js';

export interface AdminState {
  maintenance: boolean;
  /** Whether the public docs overview shows the "Most requested" leaderboard. */
  leaderboardEnabled: boolean;
  disabledEndpoints: string[];
}

const KEY_MAINTENANCE = 'maintenance';
const KEY_LEADERBOARD = 'leaderboard_enabled';
const KEY_DISABLED = 'disabled_endpoints';

function parseDisabled(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

class AdminStore {
  state: AdminState = { maintenance: false, leaderboardEnabled: true, disabledEndpoints: [] };

  async init(): Promise<void> {
    const db = await getDb();
    const [maintenance, leaderboard, disabled] = await Promise.all([
      db.getSetting(KEY_MAINTENANCE),
      db.getSetting(KEY_LEADERBOARD),
      db.getSetting(KEY_DISABLED),
    ]);
    this.state = {
      maintenance: maintenance === 'true',
      // Missing key = feature has always been on (also keeps older DBs on).
      leaderboardEnabled: leaderboard !== 'false',
      disabledEndpoints: parseDisabled(disabled),
    };
  }

  async saveState(): Promise<void> {
    const db = await getDb();
    await Promise.all([
      db.setSetting(KEY_MAINTENANCE, this.state.maintenance ? 'true' : 'false'),
      db.setSetting(KEY_LEADERBOARD, this.state.leaderboardEnabled ? 'true' : 'false'),
      db.setSetting(KEY_DISABLED, JSON.stringify(this.state.disabledEndpoints)),
    ]);
  }

  isEndpointDisabled(route: string): boolean {
    return this.state.disabledEndpoints.includes(route);
  }
}

export const adminStore = new AdminStore();

export async function initAdminStore(): Promise<void> {
  await adminStore.init();
}
