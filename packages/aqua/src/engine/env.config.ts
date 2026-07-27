/*
 * INFO: env.config.ts
 * Single source of truth for every environment variable the `aqua`
 * backend reads. Import `env` from this file instead of touching
 * `process.env` directly anywhere else in the codebase — it gives us:
 *
 *   - one place to see every variable the app depends on
 *   - typed values (numbers/booleans are parsed, not strings)
 *   - sane defaults for local development
 *   - a single startup warning pass for missing optional keys
 *
 * IMPORTANT: `./load-env.js` must be imported before this module (it is,
 * from `app.ts` via `./engine/load-env.js`) so that `.env` values are
 * already in `process.env` by the time these are read.
 */

import { logger } from './logger.js';

export type NodeEnv = 'development' | 'production' | 'test';

export interface EnvConfig {
  /** Runtime environment. Defaults to "development". */
  NODE_ENV: NodeEnv;
  /** True when NODE_ENV === "production". */
  isProduction: boolean;
  /** Port the Express server listens on. Defaults to 3000. */
  PORT: number;

  /** Shared secret required on `POST /api/notification`. Falls back to config.json's `key` field if unset. */
  API_KEY: string | undefined;

  /** Bearer token for the Lumenfall image-generation API (`/ai/lumenfall`). */
  LUMENFALL_API: string | undefined;
  /** API key for the `shoti` client (`/random/shoti`). Falls back to config.json's `shotikey` field if unset. */
  SHOTI_APIKEY: string | undefined;

  /** Pixabay API key. Powers themed "Dynamic" backgrounds (Nature, Cityscape, Space, etc.) on `/canvas/rankup` and `/canvas/greet` via Pixabay's search API. Free tier, no cost. Falls back to Unsplash, then Lorem Picsum, when unset. */
  PIXABAY_API_KEY: string | undefined;
  /** Unsplash API access key. Secondary source for themed "Dynamic" backgrounds — tried when Pixabay is unset or returns no result. Free tier, no cost. */
  UNSPLASH_ACCESS_KEY: string | undefined;

  /** Optional override for which `.env` file `load-env.ts` reads (rarely needed manually). */
  DOTENV_CONFIG_PATH: string | undefined;

  /** GitHub fine-grained personal access token with the "Gists: write" permission, belonging to the target gist's owner. Required to read/edit the secret gist backing `/random/shoti3`. */
  GITHUB_TOKEN: string | undefined;
  /** ID of the gist that stores the shoti3 TikTok URL pool. Defaults to the gist shipped with this endpoint (`306e70b8414690012b5092a9bbfaaa85`) when unset. */
  SHOTI_GIST_ID: string | undefined;
  /** Name of the file inside the shoti3 gist that holds the JSON array of URLs. Defaults to `Shoti` when unset. */
  SHOTI_GIST_FILENAME: string | undefined;
}

/** Describes one variable for the startup-validation pass. */
interface EnvVarSpec {
  key: keyof EnvConfig;
  /** If true, log a warning (not an error) when unset — the feature it powers will just be degraded/unavailable. */
  optional: boolean;
  /** Shown in the startup warning so it's obvious what breaks without it. */
  usedBy: string;
}

const ENV_VAR_SPECS: EnvVarSpec[] = [
  {
    key: 'API_KEY',
    optional: true,
    usedBy: 'POST /api/notification, GET/POST /random/shoti2?option=add (falls back to config.json "key")',
  },
  { key: 'LUMENFALL_API', optional: true, usedBy: 'GET/POST /ai/lumenfall' },
  { key: 'SHOTI_APIKEY', optional: true, usedBy: 'GET/POST /random/shoti (falls back to config.json "shotikey")' },
  {
    key: 'PIXABAY_API_KEY',
    optional: true,
    usedBy:
      'GET/POST /canvas/rankup, /canvas/greet (background=Dynamic) — themed photo search. Falls back to UNSPLASH_ACCESS_KEY, then Lorem Picsum, when unset',
  },
  {
    key: 'UNSPLASH_ACCESS_KEY',
    optional: true,
    usedBy: 'GET/POST /canvas/rankup, /canvas/greet (background=Dynamic) — secondary themed photo source, tried after Pixabay',
  },
  { key: 'GITHUB_TOKEN', optional: true, usedBy: 'GET/POST /random/shoti2 (reads/edits the Gist video store)' },
  { key: 'SHOTI_GIST_ID', optional: true, usedBy: 'GET/POST /random/shoti2 (falls back to the bundled gist ID)' },
  { key: 'SHOTI_GIST_FILENAME', optional: true, usedBy: 'GET/POST /random/shoti2 (falls back to "Shoti")' },
];

function readString(key: string): string | undefined {
  const value = process.env[key];
  return value !== undefined && value.trim() !== '' ? value : undefined;
}

function readNumber(key: string, fallback: number): number {
  const raw = readString(key);
  if (raw === undefined) return fallback;

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    logger.warn(`Environment variable ${key}="${raw}" is not a valid number — using default ${fallback}`);
    return fallback;
  }

  return parsed;
}

function readNodeEnv(): NodeEnv {
  const raw = readString('NODE_ENV');
  if (raw === 'production' || raw === 'test') return raw;
  return 'development';
}

const NODE_ENV = readNodeEnv();

export const env: EnvConfig = {
  NODE_ENV,
  isProduction: NODE_ENV === 'production',
  PORT: readNumber('PORT', 3000),

  API_KEY: readString('API_KEY'),

  LUMENFALL_API: readString('LUMENFALL_API'),
  SHOTI_APIKEY: readString('SHOTI_APIKEY'),

  PIXABAY_API_KEY: readString('PIXABAY_API_KEY'),
  UNSPLASH_ACCESS_KEY: readString('UNSPLASH_ACCESS_KEY'),

  DOTENV_CONFIG_PATH: readString('DOTENV_CONFIG_PATH'),

  GITHUB_TOKEN: readString('GITHUB_TOKEN'),
  SHOTI_GIST_ID: readString('SHOTI_GIST_ID'),
  SHOTI_GIST_FILENAME: readString('SHOTI_GIST_FILENAME'),
};

/**
 * Logs a warning for every optional variable that isn't set, so missing
 * keys show up once at boot instead of surfacing as a confusing 500/502
 * from deep inside a handler later. Call once from `app.ts` during startup.
 */
export function validateEnv(): void {
  const missing = ENV_VAR_SPECS.filter((spec) => env[spec.key] === undefined);

  if (missing.length === 0) {
    logger.ready('All optional environment variables are set');
    return;
  }

  for (const spec of missing) {
    logger.warn(`Environment variable ${String(spec.key)} is not set — ${spec.usedBy}`);
  }
}

export default env;
