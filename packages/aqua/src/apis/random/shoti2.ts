/*
 * INFO: shoti2.ts
 * Combines the old, separate `addVideo` / `getVideo` Express handlers into
 * a single Aqua endpoint. Callers pick a mode via the `option` param:
 *
 *   option=add  -> stores a new TikTok URL (requires `url` + `password`)
 *   option=get  -> (default) returns a random stored TikTok, resolved
 *                  through tikwm
 *
 * `option=add` is gated behind `password`, checked against the same
 * `API_KEY` env var (falling back to config.json's `key`) used by
 * POST /api/notification. `url`/`password` are declared with `dependsOn`
 * so the docs frontend only renders them once `option=add` is selected —
 * they stay hidden for `option=get`.
 *
 * Storage moved from Mongo (`db/mongoConnection.js`) to Turso/libSQL
 * (`db/tursoConnection.ts`) — same writeData/readData shape, different
 * backend.
 */

import axios from 'axios';
import moment from 'moment-timezone';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';
import { readData, writeData } from '@/db/tursoConnection.js';
import { env } from '@/engine/env.config.js';
import { logger } from '../../engine/logger.js';

interface VideoRow {
  id: number;
  url: string;
  createdAt: string;
}

/** In-memory cache of stored videos, refreshed on an interval and right after every add. */
let videosCache: VideoRow[] = [];
let refreshTimer: NodeJS.Timeout | null = null;
let initialLoad: Promise<void> | null = null;

async function refreshCache(): Promise<void> {
  try {
    videosCache = (await readData('videos')) as unknown as VideoRow[];
  } catch (error) {
    logger.error(`shoti2: failed to refresh video cache: ${(error as Error).message}`);
  }
}

/**
 * Kicks off the 1-minute refresh interval once, and — critically — returns
 * the *same* promise for the very first load on every call until it settles.
 * Without this, the fire-and-forget refresh on a fresh server start could
 * still be in flight when the first `option=get` request landed, so it saw
 * an empty `videosCache` and wrongly reported "No videos have been added
 * yet" even though the database already had rows. Awaiting this in
 * `onStart` guarantees the cache is populated before any request is served.
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

/** Minimal, dependency-free stand-in for express-validator's `.isURL()`. */
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
  name: 'Shoti 2',
  desc: 'Manage the community TikTok pool — add a URL, or fetch a random one resolved through tikwm',
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
  res: Parameters<ApiHandler>[0]['res']
) {
  const apiKey = env.API_KEY || (config.key as string | undefined);

  if (!apiKey) {
    logger.warn('shoti2: API_KEY / config.key is not set — refusing all option=add requests until one is configured.');
    return res.status(503).json({ code: 503, error: 'Adding videos is not configured on this server yet' });
  }

  if (typeof password !== 'string' || password !== apiKey) {
    return res.status(401).json({ code: 401, error: 'Invalid or missing password' });
  }

  if (!isValidUrl(url)) {
    return res.status(400).json({ code: 400, error: 'A valid "url" is required' });
  }

  const trimmedUrl = url.trim();
  const exists = videosCache.some((video) => video.url === trimmedUrl);

  if (exists) {
    return res.status(400).json({ code: 400, error: 'Video already exists' });
  }

  await writeData('videos', {
    url: trimmedUrl,
    createdAt: moment().tz('Asia/Manila').format('YYYY-MM-DD HH:mm:ss'),
  });

  await refreshCache();

  return res.status(200).json({ code: 200, message: 'Video added successfully' });
}

async function handleGet(res: Parameters<ApiHandler>[0]['res']) {
  if (videosCache.length === 0) {
    return res.status(404).json({ code: 404, error: 'No videos have been added yet' });
  }

  const randomIndex = Math.floor(Math.random() * videosCache.length);
  const video = videosCache[randomIndex];

  const response = await axios.get(`https://tikwm.com/api?url=${encodeURIComponent(video.url)}`);
  const videoInfo = response.data;

  return res.status(200).json({
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
  });
}

export const onStart: ApiHandler = async ({ req, res, config }) => {
  await ensureRefreshLoop();

  const body = (req.method === 'POST' ? req.body : req.query) as Record<string, unknown>;
  const option = resolveOption(body?.option);

  try {
    if (option === 'add') {
      return await handleAdd(body?.url, body?.password, config, res);
    }
    return await handleGet(res);
  } catch (error) {
    logger.error(`shoti2 (${option}) error: ${(error as Error).message}`);
    return res.status(500).json({
      code: 500,
      message: option === 'add' ? 'Error adding video' : 'Failed to fetch video',
      error: (error as Error).message,
    });
  }
};
