/*
 * INFO: shoti2.ts
 * Same `option=add` / `option=get` contract as shoti2.ts, but the video
 * pool lives in a GitHub Gist instead of Turso — a single JSON array of
 * TikTok URLs stored in one file of the target gist:
 *
 *
 *   option=add  -> fetches the gist, appends the new URL to the array,
 *                  and PATCHes the file back (requires `url` + `password`)
 *   option=get  -> (default) picks a random URL from the cached pool and
 *                  resolves it through tikwm — identical to shoti2
 *
 * `option=add` is gated behind `password`, checked against the same
 * `API_KEY` env var (falling back to config.json's `key`) used by
 * shoti2/POST /api/notification.
 *
 * Editing (and, since this gist is secret, even reading) it requires a
 * GitHub fine-grained personal access token with the "Gists: write"
 * account permission, belonging to the gist's owner — set via
 * `GITHUB_TOKEN`. The gist ID and target filename default to the values
 * above but can be overridden with `SHOTI_GIST_ID` / `SHOTI_GIST_FILENAME`
 * if the pool is ever moved to a different gist.
 */

import axios from 'axios';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';
import { env } from '@/engine/env.config.js';
import { logger } from '../../engine/logger.js';

const GIST_API_BASE = 'https://api.github.com/gists';
const DEFAULT_GIST_ID = '306e70b8414690012b5092a9bbfaaa85';
const DEFAULT_GIST_FILENAME = 'Shoti';

/** In-memory cache of stored TikTok URLs, refreshed on an interval and right after every add. */
let urlsCache: string[] = [];
let refreshTimer: NodeJS.Timeout | null = null;
let initialLoad: Promise<void> | null = null;

function gistId(): string {
  return env.SHOTI_GIST_ID || DEFAULT_GIST_ID;
}

function gistFilename(): string {
  return env.SHOTI_GIST_FILENAME || DEFAULT_GIST_FILENAME;
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  return headers;
}

/**
 * Fetches the gist and parses its target file's content as a JSON array of
 * URLs. Returns `[]` on any shape mismatch instead of throwing, so a
 * manually-edited (or empty) gist can't crash the endpoint.
 */
async function fetchGistUrls(): Promise<string[]> {
  const response = await axios.get(`${GIST_API_BASE}/${gistId()}`, { headers: githubHeaders() });
  const file = response.data?.files?.[gistFilename()];

  if (!file?.content) {
    logger.warn(`shoti3: gist ${gistId()} has no file named "${gistFilename()}" — treating pool as empty.`);
    return [];
  }

  try {
    const parsed = JSON.parse(file.content);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch (error) {
    logger.error(`shoti3: failed to parse gist content as JSON: ${(error as Error).message}`);
    return [];
  }
}

async function refreshCache(): Promise<void> {
  try {
    urlsCache = await fetchGistUrls();
  } catch (error) {
    logger.error(`shoti3: failed to refresh video cache: ${(error as Error).message}`);
  }
}

/**
 * Kicks off the 1-minute refresh interval once, and — critically — returns
 * the *same* promise for the very first load on every call until it
 * settles. Mirrors shoti2's `ensureRefreshLoop` so a request landing right
 * after a cold start can't see an empty `urlsCache` before the gist has
 * been fetched at least once.
 */
function ensureRefreshLoop(): Promise<void> {
  if (!refreshTimer) {
    refreshTimer = setInterval(refreshCache, 1000 * 60);
  }
  if (!initialLoad) {
    initialLoad = refreshCache();
  }
  return initialLoad;
}

type Option = 'add' | 'get';

function resolveOption(value: unknown): Option {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return normalized === 'add' ? 'add' : 'get';
}

/** Minimal, dependency-free URL validator. */
function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const meta: ApiMeta = {
  name: 'Shoti V2',
  desc: 'Manage the community TikTok pool via a GitHub Gist — add a URL, or fetch a random one resolved through tikwm',
  method: ['get', 'post'],
  category: 'random',
  params: [
    {
      name: 'option',
      desc: 'Whether to add a new video URL or get a random one',
      example: 'get',
      default: 'get',
      required: false,
      type: 'select',
      options: ['get', 'add'],
    },
    {
      name: 'url',
      desc: 'TikTok video URL to store',
      example: 'https://www.tiktok.com/@user/video/1234567890',
      required: true,
      type: 'text',
      dependsOn: { param: 'option', value: 'add' },
    },
    {
      name: 'password',
      desc: 'Required to add a video — must match the server\'s API_KEY',
      required: true,
      type: 'password',
      dependsOn: { param: 'option', value: 'add' },
    },
  ],
};

async function handleAdd(
  url: unknown,
  password: unknown,
  config: Parameters<ApiHandler>[0]['config'],
  set: EndpointCtx['set']
) {
  const apiKey = env.API_KEY || (config.key as string | undefined);

  if (!apiKey) {
    logger.warn('shoti3: API_KEY / config.key is not set — refusing all option=add requests until one is configured.');
    set.status = 503;
    return { code: 503, error: 'Adding videos is not configured on this server yet' };
  }

  if (typeof password !== 'string' || password !== apiKey) {
    set.status = 401;
    return { code: 401, error: 'Invalid or missing password' };
  }

  if (!env.GITHUB_TOKEN) {
    logger.warn('shoti3: GITHUB_TOKEN is not set — refusing all option=add requests until one is configured.');
    set.status = 503;
    return { code: 503, error: 'Gist editing is not configured on this server yet' };
  }

  if (!isValidUrl(url)) {
    set.status = 400;
    return { code: 400, error: 'A valid "url" is required' };
  }

  const trimmedUrl = url.trim();

  // Re-fetch the live gist content right before writing — instead of
  // trusting `urlsCache` — so a stale local cache (or a manual gist edit
  // that happened in between) can't cause a duplicate or a lost write.
  const currentUrls = await fetchGistUrls();

  if (currentUrls.includes(trimmedUrl)) {
    set.status = 400;
    return { code: 400, error: 'Video already exists' };
  }

  const updatedUrls = [...currentUrls, trimmedUrl];

  await axios.patch(
    `${GIST_API_BASE}/${gistId()}`,
    {
      files: {
        [gistFilename()]: {
          content: JSON.stringify(updatedUrls, null, 2),
        },
      },
    },
    { headers: githubHeaders() }
  );

  urlsCache = updatedUrls;

  set.status = 200;
  return { code: 200, message: 'Video added successfully' };
}

async function handleGet(set: EndpointCtx['set']) {
  if (urlsCache.length === 0) {
    set.status = 404;
    return { code: 404, error: 'No videos have been added yet' };
  }

  const randomIndex = Math.floor(Math.random() * urlsCache.length);
  const url = urlsCache[randomIndex];

  const response = await axios.get(`https://tikwm.com/api?url=${encodeURIComponent(url)}`);
  const videoInfo = response.data;

  set.status = 200;
  return {
    code: 200,
    message: 'Video fetched successfully',
    data: {
      region: videoInfo.data?.region,
      url: videoInfo.data?.play,
      thumbnail: videoInfo.data?.origin_cover,
      userInfo: {
        userID: videoInfo.data?.author?.id,
        username: videoInfo.data?.author?.unique_id,
        nickname: videoInfo.data?.author?.nickname,
      },
      musicInfo: {
        musicId: videoInfo.data?.music_info?.id,
        musicTitle: videoInfo.data?.music_info?.title,
        musicUrl: videoInfo.data?.music_info?.play,
      },
    },
  };
}

export async function initialize(ctx: EndpointCtx) {
  const { request, query, set, config } = ctx;
  await ensureRefreshLoop();

  const body = (request.method === 'POST' ? (ctx.body ?? {}) : query) as Record<string, unknown>;
  const option = resolveOption(body?.option);

  try {
    if (option === 'add') {
      return await handleAdd(body?.url, body?.password, config, set);
    }
    return await handleGet(set);
  } catch (error) {
    logger.error(`shoti3 (${option}) error: ${(error as Error).message}`);
    set.status = 500;
    return {
      code: 500,
      message: option === 'add' ? 'Error adding video' : 'Failed to fetch video',
      error: (error as Error).message,
    };
  }
};
