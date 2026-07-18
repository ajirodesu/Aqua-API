import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ApiHandler, ApiMeta } from '@/types.js';
import { detectPlatform, isProbablyUrl } from '@/lib/yoinks/platforms.js';
import { registerDownload, DOWNLOAD_TTL_MS } from '@/lib/yoinks/downloadRegistry.js';
import {
  buildChoices,
  download as runDownload,
  ensureYtDlp,
  findFfmpeg,
  probe,
  type DownloadChoice,
} from '@/lib/yoinks/ytdlp.js';

/**
 * Universal video/audio downloader — the Yoinks engine (yt-dlp under the
 * hood), vendored directly into Aqua rather than pulled in as the `yoinks`
 * npm package. Every platform yoinks' README names by hand (YouTube,
 * X/Twitter, Instagram, Threads, TikTok, Vimeo, Twitch, Reddit, Facebook) is
 * supported, and so is everything else in yt-dlp's "1,800+ other sites" —
 * any URL yt-dlp can extract works here, it just gets tagged with a
 * `generic` platform + its hostname instead of a friendly label.
 *
 * This endpoint always responds with JSON. It never streams the media file
 * itself — once yt-dlp finishes, the file is registered with a token and the
 * response's `url` field points at `/download/file?token=...`, which is what
 * actually serves the bytes (see file.ts). The link is valid for
 * DOWNLOAD_TTL_MS.
 */
export const meta: ApiMeta = {
  name: 'Download',
  desc: 'Get a JSON response with a download link for video or audio from YouTube, X/Twitter, Instagram, Threads, TikTok, Vimeo, Twitch, Reddit, Facebook, and 1,800+ other sites (powered by yt-dlp, via the vendored Yoinks engine)',
  method: ['get', 'post'],
  category: 'downloader',
  params: [
    {
      name: 'url',
      desc: 'The video/post URL to download',
      example: 'https://youtu.be/uyupd2PXbSQ?si=0AtlIozYRTPBxsUY',
      required: true,
      type: 'text',
    },
    {
      name: 'quality',
      desc: '"best" (default) for highest resolution mp4, "audio" for mp3, or a resolution like 1080/720/480',
      example: 'best',
      required: false,
      type: 'select',
      options: ['best', 'audio', '2160', '1440', '1080', '720', '480', '360'],
    },
    {
      name: 'info',
      desc: 'Set to "true" to only fetch title/uploader/duration + available formats, without downloading anything',
      example: 'false',
      required: false,
      type: 'text',
    },
  ],
};

const TMP_ROOT = path.join(os.tmpdir(), 'aqua-downloads');

export const onStart: ApiHandler = async ({ req, res, logger }) => {
  const isPost = req.method === 'POST';
  const body = isPost ? (req.body ?? {}) : {};
  const query = req.query ?? {};

  const url = (isPost ? body.url : query.url) as string | undefined;
  const qualityRaw = (isPost ? body.quality : query.quality) as string | undefined;
  const infoRaw = (isPost ? body.info : query.info) as string | undefined;

  const quality = qualityRaw?.trim().toLowerCase();
  const infoOnly = String(infoRaw ?? '').trim().toLowerCase() === 'true';

  if (!url || !isProbablyUrl(url)) {
    return res.status(400).json({ status: false, error: 'A valid "url" parameter is required.' });
  }

  const platform = detectPlatform(url);

  let infoJsonPath: string | undefined;
  let outDir: string | undefined;

  try {
    const ytdlp = await ensureYtDlp((message) => logger.info(`[download] ${message}`));
    const ffmpegLocation = await findFfmpeg();

    const probed = await probe(ytdlp, url);
    infoJsonPath = probed.infoJsonPath;
    const { info } = probed;

    const choices = buildChoices(info);
    if (choices.length === 0) {
      throw new Error('No downloadable formats were found for this URL.');
    }

    if (infoOnly) {
      await fs.rm(infoJsonPath, { force: true });
      return res.json({
        status: true,
        platform: platform.key,
        platformLabel: platform.label,
        title: info.title,
        uploader: info.uploader,
        duration: info.duration,
        sourceUrl: info.webpage_url ?? url,
        choices: choices.map(({ label, kind }) => ({ label, kind })),
      });
    }

    const choice = pickChoice(choices, quality);

    await fs.mkdir(TMP_ROOT, { recursive: true });
    outDir = await fs.mkdtemp(path.join(TMP_ROOT, 'dl-'));

    const filepath = await runDownload(
      { ytdlp, ffmpegLocation, url, infoJsonPath, choice, outDir },
      { onProgress: () => {}, onProcessing: () => {} },
    );

    await fs.rm(infoJsonPath, { force: true });
    infoJsonPath = undefined;

    const filename = path.basename(filepath);
    const { token, expiresAt } = registerDownload({
      filepath,
      outDir,
      platform: platform.key,
      kind: choice.kind,
      filename,
    });
    // Ownership of outDir now belongs to the registry (it deletes it on
    // expiry) — don't also clean it up here.
    outDir = undefined;

    const base = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${base}/download/file?token=${token}`;

    return res.json({
      status: true,
      platform: platform.key,
      platformLabel: platform.label,
      title: info.title,
      uploader: info.uploader,
      duration: info.duration,
      sourceUrl: info.webpage_url ?? url,
      kind: choice.kind,
      quality: choice.label,
      filename,
      url: downloadUrl,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInSeconds: Math.round(DOWNLOAD_TTL_MS / 1000),
    });
  } catch (error) {
    if (infoJsonPath) await fs.rm(infoJsonPath, { force: true }).catch(() => {});
    if (outDir) await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});

    const message = (error as Error).message || 'Download failed.';
    logger.error(`[download] ${message}`);
    return res.status(500).json({ status: false, error: message });
  }
};

function pickChoice(choices: DownloadChoice[], quality?: string): DownloadChoice {
  const videoChoices = choices.filter((c) => c.kind === 'video');
  const audioChoice = choices.find((c) => c.kind === 'audio');

  if (!quality || quality === 'best') {
    return videoChoices[0] ?? choices[0];
  }

  if (quality === 'audio' || quality === 'mp3') {
    return audioChoice ?? choices[choices.length - 1];
  }

  const requestedHeight = Number.parseInt(quality, 10);
  if (Number.isFinite(requestedHeight)) {
    const exact = videoChoices.find((c) => c.label.startsWith(`${requestedHeight}p`));
    if (exact) return exact;

    // No exact match (e.g. asked for 720 but source only has 1080/480):
    // pick the closest available height at or below the request, otherwise
    // the smallest available.
    const withHeights = videoChoices
      .map((c) => ({ choice: c, height: Number.parseInt(c.label, 10) }))
      .filter((c) => Number.isFinite(c.height));

    const atOrBelow = withHeights.filter((c) => c.height <= requestedHeight).sort((a, b) => b.height - a.height)[0];
    if (atOrBelow) return atOrBelow.choice;

    const smallest = withHeights.sort((a, b) => a.height - b.height)[0];
    if (smallest) return smallest.choice;
  }

  return videoChoices[0] ?? choices[0];
}
