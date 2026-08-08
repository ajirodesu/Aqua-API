import type { ApiHandler, ApiMeta, EndpointCtx } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Example',
  desc: 'A simple example API that echoes back the input text with a greeting',
  method: ['get', 'post'],
  category: 'example',
  params: [
    {
      name: 'text',
      desc: 'Input your text here',
      example: 'Hello, world!',
      required: true,
      type: 'text',
    },
  ],
};

export async function initialize(ctx: EndpointCtx) {
  const { request, query, set } = ctx;
  const body = (request.method === 'POST' ? (ctx.body ?? {}) : query) as Record<string, unknown>;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!text) {
    set.status = 400;
    return { error: 'Missing required parameter: text' };
  }

  try {
    const greeting = `Hello, ${text}! This is an example response.`;
    return { message: greeting };
  } catch (error) {
    set.status = 500;
    return { error: (error as Error).message || 'Internal server error' };
  }
};
