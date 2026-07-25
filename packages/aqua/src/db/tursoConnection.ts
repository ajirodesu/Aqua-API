/*
 * INFO: tursoConnection.ts
 * Generic data-access layer backed by Turso (libSQL) — the SQL replacement
 * for the old `db/mongoConnection.js`. Keeps the same `writeData(table, doc)`
 * / `readData(table)` shape so endpoint code doesn't need to know it's
 * talking to SQL instead of a Mongo collection.
 *
 * Add a new table by giving it an entry in TABLE_SCHEMAS below — everything
 * else (creation, inserts, reads) is generic from there.
 */

import { createClient, type Client, type InValue } from '@libsql/client';
import { env } from '@/engine/env.config.js';
import { logger } from '../engine/logger.js';

/** Column definitions (excluding the implicit `id`) for every known table. */
const TABLE_SCHEMAS: Record<string, string> = {
  videos: 'url TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL',
};

let cachedClient: Client | null = null;
const ensuredTables = new Set<string>();

/** Lazily creates (and reuses) the libSQL client from env config. */
function getClient(): Client {
  if (cachedClient) return cachedClient;

  if (!env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL is not set — cannot connect to the Turso database.');
  }

  cachedClient = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });

  return cachedClient;
}

/** Creates `table` on first use if it doesn't already exist. */
async function ensureTable(table: string): Promise<Client> {
  const client = getClient();

  if (ensuredTables.has(table)) return client;

  const columns = TABLE_SCHEMAS[table];
  if (!columns) {
    throw new Error(`No schema registered for table "${table}" — add one to TABLE_SCHEMAS in tursoConnection.ts`);
  }

  await client.execute(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${columns})`);
  ensuredTables.add(table);

  return client;
}

/**
 * Inserts `data` into `table`, creating the table first if needed.
 * Returns the row as it was stored, including the generated `id`.
 */
async function writeData(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const client = await ensureTable(table);

  const columns = Object.keys(data);
  if (columns.length === 0) {
    throw new Error(`writeData("${table}") was called with an empty object`);
  }

  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((key) => data[key] as InValue);

  const result = await client.execute({
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
    args: values,
  });

  return { id: Number(result.lastInsertRowid), ...data };
}

/** Returns every row in `table` (newest first), creating the table first if needed. */
async function readData(table: string): Promise<Record<string, unknown>[]> {
  try {
    const client = await ensureTable(table);
    const result = await client.execute(`SELECT * FROM ${table} ORDER BY id DESC`);
    return result.rows.map((row) => ({ ...row } as Record<string, unknown>));
  } catch (error) {
    logger.error(`Error reading from Turso table "${table}": ${(error as Error).message}`);
    return [];
  }
}

export { writeData, readData };
