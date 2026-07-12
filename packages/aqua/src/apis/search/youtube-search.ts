import { Client, MusicClient } from 'youtubei';
import type { ApiHandler, ApiMeta } from '@/types.js';

export const meta: ApiMeta = {
  name: 'YouTube Search',
  desc: 'Search YouTube for videos, playlists, and channels, or search YouTube Music for songs and music videos',
  method: ['get', 'post'],
  category: 'search',
  params: [
    {
      name: 'query',
      desc: 'Keyword to search for',
      example: 'Never gonna give you up',
      required: true,
      type: 'text',
    },
    {
      name: 'mode',
      desc: 'Where to search: regular YouTube or YouTube Music',
      example: 'video',
      required: false,
      type: 'select',
      options: ['video', 'music'],
    },
    {
      name: 'type',
      desc: 'Result type, only used when mode=video',
      example: 'video',
      required: false,
      type: 'select',
      options: ['video', 'playlist', 'channel', 'all'],
    },
    {
      name: 'limit',
      desc: 'Max number of results to return (1-30)',
      example: '10',
      required: false,
      type: 'number',
    },
  ],
};

// Single shared client instances reused across requests.
const youtube = new Client();
const music = new MusicClient();

type SearchMode = 'video' | 'music';
type VideoType = 'video' | 'playlist' | 'channel' | 'all';

const MODES: SearchMode[] = ['video', 'music'];
const TYPES: VideoType[] = ['video', 'playlist', 'channel', 'all'];
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

function bestThumbnail(thumbnails?: { url: string; width: number; height: number }[]): string | null {
  if (!thumbnails || thumbnails.length === 0) return null;
  return thumbnails.reduce((best, t) => (t.width > best.width ? t : best), thumbnails[0]).url;
}

function serializeChannel(channel: any) {
  if (!channel) return null;
  return {
    id: channel.id ?? null,
    name: channel.name ?? null,
    handle: channel.handle ?? null,
    thumbnail: bestThumbnail(channel.thumbnails),
    subscriberCount: channel.subscriberCount ?? null,
    url: channel.id ? `https://www.youtube.com/channel/${channel.id}` : null,
  };
}

function serializeVideo(item: any) {
  return {
    type: 'video',
    id: item.id,
    title: item.title,
    description: item.description || null,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    thumbnail: bestThumbnail(item.thumbnails),
    duration: item.duration ?? null,
    isLive: item.isLive ?? false,
    isShort: item.isShort ?? false,
    uploadDate: item.uploadDate ?? null,
    viewCount: item.viewCount ?? null,
    channel: serializeChannel(item.channel),
  };
}

function serializePlaylist(item: any) {
  return {
    type: 'playlist',
    id: item.id,
    title: item.title,
    url: `https://www.youtube.com/playlist?list=${item.id}`,
    thumbnail: bestThumbnail(item.thumbnails),
    videoCount: item.videoCount ?? null,
    channel: serializeChannel(item.channel),
  };
}

function serializeMusicSong(item: any) {
  return {
    type: 'song',
    id: item.id,
    title: item.title,
    url: item.id ? `https://music.youtube.com/watch?v=${item.id}` : null,
    thumbnail: bestThumbnail(item.thumbnails),
    duration: item.duration ?? null,
    artists: Array.isArray(item.artists) ? item.artists.map((a: any) => ({ id: a.id ?? null, name: a.name })) : [],
    album: item.album ? { id: item.album.id ?? null, title: item.album.title ?? null } : null,
  };
}

function serializeMusicVideo(item: any) {
  return {
    type: 'video',
    id: item.id,
    title: item.title,
    url: item.id ? `https://music.youtube.com/watch?v=${item.id}` : null,
    thumbnail: bestThumbnail(item.thumbnails),
    duration: item.duration ?? null,
    artists: Array.isArray(item.artists) ? item.artists.map((a: any) => ({ id: a.id ?? null, name: a.name })) : [],
  };
}

function serializeVideoModeItem(item: any) {
  // Distinguish result kinds coming back from the regular YouTube client search.
  if (item?.videoCount !== undefined) return serializePlaylist(item);
  if (item?.subscriberCount !== undefined || (item?.videos && item?.playlists)) {
    return { type: 'channel', ...serializeChannel(item) };
  }
  return serializeVideo(item);
}

export const onStart: ApiHandler = async ({ req, res }) => {
  const body = req.method === 'POST' ? req.body : req.query;

  const query: string | undefined = body?.query;
  const modeRaw = String(body?.mode || 'video').toLowerCase();
  const typeRaw = String(body?.type || 'video').toLowerCase();
  const limitRaw = Number(body?.limit);

  if (!query || !query.trim()) {
    return res.status(400).json({ status: false, error: 'Missing required parameter: query' });
  }

  const mode = (MODES.includes(modeRaw as SearchMode) ? modeRaw : 'video') as SearchMode;
  const type = (TYPES.includes(typeRaw as VideoType) ? typeRaw : 'video') as VideoType;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : DEFAULT_LIMIT;

  try {
    if (mode === 'music') {
      const result = await music.search(query, 'song');
      const items = (result.items || []).slice(0, limit).map((item: any) =>
        item?.duration !== undefined && item?.album !== undefined
          ? serializeMusicSong(item)
          : serializeMusicVideo(item)
      );

      return res.json({
        status: true,
        mode,
        query,
        result: items,
      });
    }

    const result = await youtube.search(query, { type });
    const items = (result.items || []).slice(0, limit).map(serializeVideoModeItem);

    return res.json({
      status: true,
      mode,
      type,
      query,
      result: items,
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: (error as Error).message || 'Internal server error' });
  }
};