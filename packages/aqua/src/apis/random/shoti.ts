import Shoti from 'shoti';
import type { ApiHandler, ApiMeta, AquaConfig } from '@/types.js';
import { logger } from '../../logger.js';

let cachedClient: Shoti | null = null;
let cachedKey: string | undefined;

/** Resolves the Shoti API key — env var takes priority, config.shotikey (config.json) is the fallback — and reuses the client as long as the key doesn't change. */
function getClient(config: AquaConfig): Shoti {
  const apikey = process.env.SHOTI_APIKEY || (config.shotikey as string | undefined);

  if (!cachedClient || cachedKey !== apikey) {
    if (!apikey) {
      logger.warn('SHOTI_APIKEY / config.shotikey is not set — the /random/shoti endpoint may be rate-limited until one is added.');
    }
    cachedClient = new Shoti(apikey);
    cachedKey = apikey;
  }

  return cachedClient;
}

/** Public-facing media type accepted by this endpoint. */
type MediaType = 'video' | 'photo';

/** Maps user-friendly aliases (and the shoti lib's own "image" type) down to a MediaType. */
const TYPE_ALIASES: Record<string, MediaType> = {
  video: 'video',
  vid: 'video',
  photo: 'photo',
  photos: 'photo',
  image: 'photo',
  img: 'photo',
  pic: 'photo',
};

function resolveType(value: unknown): MediaType {
  if (typeof value !== 'string' || !value.trim()) return 'video';
  return TYPE_ALIASES[value.trim().toLowerCase()] ?? 'video';
}

export const meta: ApiMeta = {
  name: 'Shoti',
  desc: 'Get a random TikTok clip — choose "video" for a random video or "photo" for a random photo slideshow',
  method: ['get', 'post'],
  category: 'random',
  params: [
    {
      name: 'type',
      desc: 'Which kind of random TikTok content to fetch',
      example: 'video',
      required: false,
      type: 'select',
      options: ['video', 'photo'],
    },
  ],
};

export const onStart: ApiHandler = async ({ req, res, config }) => {
  const body = (req.method === 'POST' ? req.body : req.query) as Record<string, unknown>;
  const type = resolveType(body?.type);
  const shoti = getClient(config);

  try {
    // getShoti() can resolve to `{ error, code }` instead of throwing on
    // failure — accessing `.user`/`.content` on that shape would otherwise
    // crash with a confusing "Cannot read properties of undefined" instead
    // of surfacing the actual API error.
    const result = await shoti.getShoti({ type: type === 'photo' ? 'image' : 'video' });

    if ('error' in result) {
      return res.status(502).json({ error: result.error, code: result.code });
    }

    const { user, content, type: resultType, ...rest } = result;
    const media = Array.isArray(content) ? content : [content];

    return res.json({
      type,
      shotiType: resultType,
      user,
      media,
      ...rest,
    });
  } catch (error) {
    logger.error(`Error fetching shoti (${type}): ${(error as Error).message}`);
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};
