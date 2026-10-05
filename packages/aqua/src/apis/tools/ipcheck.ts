import type { Request } from 'express';
import type { ApiHandler, ApiMeta } from '@/engine/types.js';

export const meta: ApiMeta = {
  name: 'Ipcheck',
  desc: 'Look up geolocation and network info for an IP address (defaults to the caller)',
  method: ['get', 'post'],
  category: 'tools',
  params: [
    {
      name: 'ip',
      desc: 'IPv4 or IPv6 address to look up — leave empty to check your own IP',
      example: '8.8.8.8',
      required: false,
      type: 'text',
    },
  ],
};

interface IpApiResponse {
  status?: string;
  message?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
}

function callerIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() ?? '';
  return first !== '' ? first : req.ip ?? '';
}

function isPublicIp(ip: string): boolean {
  if (ip === '') return false;
  // Unwrap IPv4-mapped IPv6 (Express reports localhost as ::ffff:127.0.0.1).
  const v4 = ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip;
  if (v4 === '::1' || v4 === 'localhost') return false;
  if (/^127\./.test(v4)) return false;
  if (/^10\./.test(v4)) return false;
  if (/^192\.168\./.test(v4)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v4)) return false;
  if (/^(fc|fd)[0-9a-f]{0,2}:/i.test(v4)) return false;
  if (/^fe80:/i.test(v4)) return false;
  return true;
}

export const initialize: ApiHandler = async ({ req, res }) => {
  const raw: string | undefined =
    req.method === 'POST' ? req.body?.ip : (req.query?.ip as string | undefined);
  const fromCaller = raw === undefined || raw.trim() === '';
  const ip = fromCaller ? callerIp(req) : raw.trim();

  if (!isPublicIp(ip)) {
    res.status(400).json({
      error: fromCaller
        ? 'Could not determine a public caller IP (you appear to be on a local network)'
        : 'Only public IPv4/IPv6 addresses can be looked up',
    });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const upstream = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { signal: controller.signal }
    );
    if (!upstream.ok) {
      res.status(502).json({ error: `IP lookup service returned HTTP ${upstream.status}` });
      return;
    }
    const data = (await upstream.json()) as IpApiResponse;
    if (data.status !== 'success') {
      res.status(400).json({ error: data.message || 'IP lookup failed' });
      return;
    }
    res.json({
      status: true,
      ip: data.query,
      country: data.country,
      countryCode: data.countryCode,
      region: data.regionName,
      city: data.city,
      zip: data.zip,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      org: data.org,
      as: data.as,
    });
  } catch (err) {
    res.status(502).json({
      error: `IP lookup service unreachable (${err instanceof Error ? err.message : 'network error'})`,
    });
  } finally {
    clearTimeout(timer);
  }
};
