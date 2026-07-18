/**
 * Ported directly from yoinks (https://github.com/pablostanley/yoinks)
 * `src/lib/platforms.ts`, then substantially expanded. This is not a
 * redistribution of the npm package — it's the platform-detection logic
 * vendored straight into Aqua so the `/download/download` endpoint can label
 * results the same way yoinks does.
 *
 * IMPORTANT: this list is cosmetic only — it exists to put a friendly name
 * on the response (`platform`/`platformLabel`). It never gates what the
 * endpoint will attempt to download. `probe()`/`download()` are handed the
 * raw URL and go straight to yt-dlp regardless of whether the host below
 * matches, so every one of yt-dlp's 1,800+ supported sites already works —
 * matched or not, a URL always falls through to `{ key: 'generic', label:
 * hostname }` rather than being rejected.
 *
 * `hosts` only needs each platform's root domain(s) — `detectPlatform`
 * matches subdomains automatically (`m.youtube.com`, `vm.tiktok.com`,
 * `mobile.twitter.com`, `www.instagram.com`, etc. all match their root
 * entry below without a separate line). Entries here cover: every host
 * yoinks' README names by hand (YouTube, X/Twitter, Instagram, Threads,
 * TikTok), the rest yoinks' source also recognizes (Vimeo, Twitch, Reddit,
 * Facebook), their known alternate/short root domains (youtu.be, fb.watch,
 * redd.it, instagr.am, x.com vs twitter.com, threads.net vs threads.com),
 * and a broad set of other sites yt-dlp downloads from regularly.
 */

export type Platform = {
  key: string;
  label: string;
};

const PLATFORMS: Array<{ hosts: string[]; platform: Platform }> = [
  { hosts: ['youtube.com', 'youtu.be', 'music.youtube.com'], platform: { key: 'youtube', label: 'YouTube' } },
  { hosts: ['x.com', 'twitter.com', 't.co'], platform: { key: 'x', label: 'X / Twitter' } },
  { hosts: ['instagram.com', 'instagr.am'], platform: { key: 'instagram', label: 'Instagram' } },
  { hosts: ['threads.net', 'threads.com'], platform: { key: 'threads', label: 'Threads' } },
  { hosts: ['tiktok.com'], platform: { key: 'tiktok', label: 'TikTok' } },
  { hosts: ['vimeo.com'], platform: { key: 'vimeo', label: 'Vimeo' } },
  { hosts: ['twitch.tv'], platform: { key: 'twitch', label: 'Twitch' } },
  { hosts: ['reddit.com', 'redd.it'], platform: { key: 'reddit', label: 'Reddit' } },
  { hosts: ['facebook.com', 'fb.watch', 'fb.com'], platform: { key: 'facebook', label: 'Facebook' } },

  // Additional sites yt-dlp supports that yoinks itself doesn't special-case,
  // but are common enough to deserve a real label instead of "generic".
  { hosts: ['soundcloud.com', 'snd.sc'], platform: { key: 'soundcloud', label: 'SoundCloud' } },
  { hosts: ['dailymotion.com', 'dai.ly'], platform: { key: 'dailymotion', label: 'Dailymotion' } },
  { hosts: ['bilibili.com', 'b23.tv'], platform: { key: 'bilibili', label: 'Bilibili' } },
  { hosts: ['pinterest.com', 'pin.it'], platform: { key: 'pinterest', label: 'Pinterest' } },
  { hosts: ['linkedin.com'], platform: { key: 'linkedin', label: 'LinkedIn' } },
  { hosts: ['snapchat.com'], platform: { key: 'snapchat', label: 'Snapchat' } },
  { hosts: ['streamable.com'], platform: { key: 'streamable', label: 'Streamable' } },
  { hosts: ['bsky.app'], platform: { key: 'bluesky', label: 'Bluesky' } },
  { hosts: ['kick.com'], platform: { key: 'kick', label: 'Kick' } },
  { hosts: ['rumble.com'], platform: { key: 'rumble', label: 'Rumble' } },
  { hosts: ['odysee.com'], platform: { key: 'odysee', label: 'Odysee' } },
  { hosts: ['bandcamp.com'], platform: { key: 'bandcamp', label: 'Bandcamp' } },
  { hosts: ['mixcloud.com'], platform: { key: 'mixcloud', label: 'Mixcloud' } },
  { hosts: ['vk.com'], platform: { key: 'vk', label: 'VK' } },
  { hosts: ['weibo.com', 'weibo.cn'], platform: { key: 'weibo', label: 'Weibo' } },
  { hosts: ['tumblr.com'], platform: { key: 'tumblr', label: 'Tumblr' } },
  { hosts: ['dropbox.com'], platform: { key: 'dropbox', label: 'Dropbox' } },
  { hosts: ['ok.ru'], platform: { key: 'odnoklassniki', label: 'OK.ru' } },
  { hosts: ['niconico.jp', 'nicovideo.jp'], platform: { key: 'niconico', label: 'Niconico' } },
];

export function detectPlatform(url: string): Platform {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { key: 'unknown', label: 'Unknown site' };
  }

  for (const { hosts, platform } of PLATFORMS) {
    if (hosts.some((h) => hostname === h || hostname.endsWith(`.${h}`))) {
      return platform;
    }
  }

  return { key: 'generic', label: hostname };
}

export function isProbablyUrl(input: string): boolean {
  try {
    const u = new URL(input.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
