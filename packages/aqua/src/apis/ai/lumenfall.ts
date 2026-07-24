import axios from 'axios';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';
import { env } from '@/engine/env.config.js';
import { logger } from '../../engine/logger.js';

/**
 * INFO: lumenfall.ts
 * REST endpoint wrapping the Lumenfall image generation API.
 * Converted from a Telegram-bot AI plugin script into a standalone
 * aqua endpoint — pass a `prompt` (and optionally `size`) and get
 * back the generated image URL.
 */

export const meta: ApiMeta = {
  name: 'Lumenfall',
  desc: 'Generate an image from a text prompt using the Lumenfall (Gemini image) API',
  method: ['get', 'post'],
  category: 'ai',
  params: [
    {
      name: 'prompt',
      desc: 'Text description of the image to generate',
      example: 'a cat astronaut floating in space',
      required: true,
      type: 'text',
    },
    {
      name: 'size',
      desc: 'Output image dimensions',
      example: '1024x1024',
      required: false,
      type: 'select',
      options: ['1024x1024', '1024x1792', '1792x1024'],
    },
  ],
};

export const onStart: ApiHandler = async ({ req, res, config }) => {
  const body = (req.method === 'POST' ? req.body : req.query) as Record<string, unknown>;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const size = typeof body?.size === 'string' && body.size.trim() ? body.size.trim() : '1024x1024';

  if (!prompt) {
    return res.status(400).json({ error: 'Missing required parameter: prompt' });
  }

  const apiKey = env.LUMENFALL_API || (config.lumenfallkey as string | undefined);

  if (!apiKey) {
    logger.warn('LUMENFALL_API / config.lumenfallkey is not set — the /ai/lumenfall endpoint cannot authenticate.');
    return res.status(500).json({ error: 'Server is missing LUMENFALL_API credentials' });
  }

  try {
    const { data } = await axios.post(
      'https://api.lumenfall.ai/openai/v1/images/generations',
      {
        model: 'gemini-3.1-flash-lite-image',
        prompt,
        size,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const imageUrl = data?.data?.[0]?.url;

    if (!imageUrl) {
      return res.status(502).json({ error: 'Lumenfall API returned no image URL' });
    }

    return res.json({ prompt, size, image: imageUrl });
  } catch (error) {
    const err = error as { response?: { status?: number; data?: unknown }; message?: string };
    logger.error(`Error generating image (lumenfall): ${err.message}`);

    return res.status(err.response?.status ?? 500).json({
      error: 'Failed to generate image',
      details: err.response?.data ?? err.message,
    });
  }
};
