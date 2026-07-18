/**
 * Bridges the gap between "yt-dlp finished writing a file to disk" and
 * "the client can fetch it over HTTP". `/download/download` no longer
 * streams the file itself — it downloads it once, registers it here under a
 * random token, and returns a `/download/file?token=...` link in its JSON
 * response. `/download/file` looks the token up and streams the bytes.
 *
 * Entries expire on their own after `TTL_MS` so temp files don't pile up on
 * disk if a link is never claimed; claiming the link doesn't delete it early
 * so a slow client or a retry can still succeed within the window.
 */

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

export type RegisteredDownload = {
  filepath: string;
  filename: string;
  outDir: string;
  platform: string;
  kind: 'video' | 'audio';
  expiresAt: number;
};

export const DOWNLOAD_TTL_MS = 10 * 60 * 1000; // 10 minutes

const registry = new Map<string, RegisteredDownload>();

export function registerDownload(opts: {
  filepath: string;
  outDir: string;
  platform: string;
  kind: 'video' | 'audio';
  filename?: string;
}): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + DOWNLOAD_TTL_MS;

  registry.set(token, {
    filepath: opts.filepath,
    filename: opts.filename ?? path.basename(opts.filepath),
    outDir: opts.outDir,
    platform: opts.platform,
    kind: opts.kind,
    expiresAt,
  });

  const timer = setTimeout(() => {
    void expire(token);
  }, DOWNLOAD_TTL_MS);
  timer.unref?.();

  return { token, expiresAt };
}

export function resolveDownload(token: string): RegisteredDownload | undefined {
  const entry = registry.get(token);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    void expire(token);
    return undefined;
  }

  return entry;
}

async function expire(token: string): Promise<void> {
  const entry = registry.get(token);
  if (!entry) return;
  registry.delete(token);
  await fs.rm(entry.outDir, { recursive: true, force: true }).catch(() => {});
}
