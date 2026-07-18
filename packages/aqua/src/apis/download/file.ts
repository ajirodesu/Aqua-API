import fs from 'node:fs';
import type { ApiHandler, ApiMeta } from '@/types.js';
import { resolveDownload } from '@/lib/yoinks/downloadRegistry.js';

/**
 * Serves a file that `/download/download` already prepared, identified by
 * the one-time `token` it returned. Kept as its own endpoint (rather than
 * folded into download.ts) because the loader mounts one fixed route per
 * module — this gives us `/download/file` alongside `/download/download`.
 */
export const meta: ApiMeta = {
  name: 'Download File',
  desc: 'Stream a file previously prepared by /download/download, using the token from its JSON response. Links expire 10 minutes after the file is ready.',
  method: 'get',
  category: 'downloader',
  params: [
    {
      name: 'token',
      desc: 'The token returned in the "url" field of /download/download',
      example: 'a1b2c3d4e5f6...',
      required: true,
      type: 'text',
    },
  ],
};

export const onStart: ApiHandler = async ({ req, res, logger }) => {
  const token = (req.query?.token as string | undefined)?.trim();

  if (!token) {
    return res.status(400).json({ status: false, error: 'Missing required parameter: token' });
  }

  const entry = resolveDownload(token);
  if (!entry) {
    return res.status(404).json({ status: false, error: 'This download link is invalid or has expired.' });
  }

  if (!fs.existsSync(entry.filepath)) {
    return res.status(404).json({ status: false, error: 'The file for this link is no longer available.' });
  }

  res.setHeader('X-Platform', entry.platform);
  res.setHeader('X-Content-Kind', entry.kind);

  return res.download(entry.filepath, entry.filename, (err) => {
    if (err) logger.error(`[download/file] failed to send file: ${err.message}`);
  });
};
