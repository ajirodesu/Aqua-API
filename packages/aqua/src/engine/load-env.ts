/*
 * INFO: engine/load-env.ts
 * Loads variables from a `.env` file (repo root, then this package's own
 * root) into `process.env` before any other module reads them.
 *
 * This file has NO dependency on `./logger.ts` or `./env.config.ts` on
 * purpose — it must be importable as the very first line of `app.ts`,
 * ahead of everything else, including modules that themselves read
 * `process.env` at import time.
 *
 * Usage (must be the first import in the entrypoint):
 *   import './engine/load-env.js';
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/engine/load-env.ts -> packages/aqua/.env  and  <repo-root>/.env
// __dirname here is .../packages/aqua/src/engine (or dist/engine once built).
const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const MONOREPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..');

const CANDIDATE_ENV_FILES = [
  process.env.DOTENV_CONFIG_PATH,
  path.join(PACKAGE_ROOT, '.env'),
  path.join(MONOREPO_ROOT, '.env'),
].filter((p): p is string => Boolean(p));

/** Minimal KEY=VALUE parser — no external dependency required. */
function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key) continue;

    let value = line.slice(eqIndex + 1).trim();

    // Strip a single layer of matching quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Expand escaped newlines inside double-quoted-style values.
    value = value.replace(/\\n/g, '\n');

    result[key] = value;
  }

  return result;
}

let loadedFrom: string | null = null;

for (const candidate of CANDIDATE_ENV_FILES) {
  if (!fs.existsSync(candidate)) continue;

  try {
    const contents = fs.readFileSync(candidate, 'utf8');
    const parsed = parseEnvFile(contents);

    for (const [key, value] of Object.entries(parsed)) {
      // Real environment variables (e.g. set by the host/CI/Docker) always
      // win over anything declared in a .env file.
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    loadedFrom = candidate;
    break;
  } catch {
    // Unreadable file — try the next candidate instead of crashing startup.
    continue;
  }
}

// eslint-disable-next-line no-console -- runs before the logger is safe to import
if (loadedFrom) {
  console.log(`[env] Loaded environment variables from ${loadedFrom}`);
} else {
  console.log('[env] No .env file found — relying on variables already present in the environment');
}

export {};
