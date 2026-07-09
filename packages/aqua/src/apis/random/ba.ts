import axios from 'axios';
import type { ApiHandler, ApiMeta } from '../../types.js';

export const meta: ApiMeta = {
  name: 'blue archive',
  desc: 'Blue Archive random image',
  method: 'get',
  category: 'random',
};

export const onStart: ApiHandler = async ({ res }) => {
  try {
    const { data } = await axios.get<string[]>(
      'https://raw.githubusercontent.com/rynxzyy/blue-archive-r-img/refs/heads/main/links.json'
    );

    const imageUrl = data[Math.floor(Math.random() * data.length)];
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imgBuffer = Buffer.from(response.data);

    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': imgBuffer.length,
    });
    res.end(imgBuffer);
  } catch (error) {
    res.status(500).json({ status: false, error: (error as Error).message });
  }
};
