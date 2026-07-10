import type { ApiHandler, ApiMeta } from '@/types.js';

export const meta: ApiMeta = {
  name: 'Example 2',
  desc: 'A simple example API that echoes back a chosen greeting word',
  method: ['get', 'post'],
  category: 'example',
  params: [
    {
      name: 'text',
      desc: 'choose a text here',
      example: 'Hello',
      required: true,
      type: 'select',
      options: ['Hello', 'Hi', 'Sup', 'Hey', 'Hola', 'Yo'],
    },
  ],
};

export const onStart: ApiHandler = async ({ req, res }) => {
  const text: string | undefined = req.method === 'POST' ? req.body?.text : (req.query?.text as string);

  if (!text) {
    return res.status(400).json({ error: 'Missing required parameter: text' });
  }

  try {
    const greeting = `Hello, ${text}! This is an example response.`;
    return res.json({ message: greeting });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
};
