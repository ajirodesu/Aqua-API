import axios from 'axios';
import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';
import { logger } from '../../engine/logger.js';

/** How long the scraped GitHub file list is reused before a re-scrape. */
const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedVideos: string[] | null = null;
let cacheExpiresAt = 0;

/**
 * Scrapes the cosplay repo's GitHub tree page for .mp4 file paths, then
 * caches the parsed list in memory so only the first request (or one every
 * 10 minutes) pays the GitHub round-trip. Everything in between is an
 * instant in-memory pick.
 */
async function fetchVideoList(): Promise<string[]> {
  if (cachedVideos && Date.now() < cacheExpiresAt) {
    return cachedVideos;
  }

  const owner = 'ajirodesu';
  const repo = 'cosplay';
  const branch = 'main';

  const repoUrl = `https://github.com/${owner}/${repo}/tree/${branch}/`;
  const response = await axios.get<string>(repoUrl);
  const html = response.data;

  const videoFileRegex = /href="\/ajirodesu\/cosplay\/blob\/main\/([^"]+\.mp4)"/g;
  const videoFiles: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = videoFileRegex.exec(html)) !== null) {
    videoFiles.push(match[1]);
  }

  cachedVideos = videoFiles;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedVideos;
}

export const meta: ApiMeta = {
  name: 'Cosplay',
  desc: 'Get a random cosplay video',
  method: 'get',
  category: 'random',
  params: [],
};

export async function initialize(ctx: EndpointCtx) {
  const { set } = ctx;
  try {
    const owner = 'ajirodesu';
    const repo = 'cosplay';
    const branch = 'main';

    const videoFiles = await fetchVideoList();

    if (videoFiles.length === 0) {
      set.status = 404;
      return { error: 'No videos found in the repository' };
    }

    const randomVideo = videoFiles[Math.floor(Math.random() * videoFiles.length)];
    const videoUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${randomVideo}`;

    return { videoUrl };
  } catch (error) {
    logger.error(`Error fetching random video: ${(error as Error).message}`);
    set.status = 500;
    return { error: 'Failed to fetch random video' };
  }
};
