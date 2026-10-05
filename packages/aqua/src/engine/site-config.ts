/*
 * INFO: site-config.ts
 * Mutable site config holder for the Aqua backend — by AjiroDesu.
 *
 * config.json is read once at boot; the admin dashboard can update a safe
 * subset of fields at runtime, so the holder keeps one shared in-memory
 * copy that both the public API middleware and the admin router use.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AquaConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG_PATH = path.resolve(__dirname, '..', 'json', 'config.json');

function loadFromDisk(): AquaConfig {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as AquaConfig;
}

let current: AquaConfig = loadFromDisk();

export function getSiteConfig(): AquaConfig {
  return current;
}

export function reloadSiteConfig(): AquaConfig {
  current = loadFromDisk();
  return current;
}

export interface SiteSettingsPatch {
  name?: string;
  description?: string;
  status?: string;
  telegram?: string;
  github?: string;
  messenger?: string;
}

const MAX_FIELD_LENGTH = 500;

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  return trimmed.slice(0, MAX_FIELD_LENGTH);
}

/** Applies a validated settings patch to memory + disk. Returns the config. */
export function updateSiteConfig(patch: SiteSettingsPatch): AquaConfig {
  // Mutate the shared object in place (never replace it): app.ts captured
  // the reference at boot, so replacement would leave the public API
  // serving stale values until the next restart.
  const name = clean(patch.name);
  const description = clean(patch.description);
  const status = clean(patch.status);
  const telegram = clean(patch.telegram);
  const github = clean(patch.github);
  const messenger = clean(patch.messenger);
  if (name !== undefined) current.name = name;
  if (description !== undefined) current.description = description;
  if (status !== undefined) current.header = { ...current.header, status };
  if (telegram !== undefined) current.telegram = telegram;
  if (github !== undefined) current.github = github;
  if (messenger !== undefined) current.messenger = messenger;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(current, null, 2), 'utf8');
  return current;
}
