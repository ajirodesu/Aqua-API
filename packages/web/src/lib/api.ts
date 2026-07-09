import type { AquaConfig, EndpointBucket } from './types';

/**
 * In development, Vite serves the frontend on :5173 while the Express
 * backend (and all dynamically-loaded endpoints) run on :3000. Meta routes
 * (/api/*) are proxied by Vite, but dynamically mounted endpoint routes
 * (e.g. /random/blue-archive) are not — so we call those against the
 * backend's absolute origin directly. In production the app is served by
 * Express itself, so everything is same-origin and this collapses to ''.
 */
export const API_ORIGIN: string = import.meta.env.DEV ? 'http://localhost:3000' : '';

export function endpointUrl(path: string): string {
  const clean = path.split('?')[0];
  return `${API_ORIGIN}${clean}`;
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_ORIGIN}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchConfig(): Promise<AquaConfig> {
  return getJSON<AquaConfig>('/api/config');
}

export function fetchEndpoints(): Promise<{ status: boolean; count: number; endpoints: EndpointBucket[] }> {
  return getJSON('/api/endpoints');
}

export function fetchNotifications(): Promise<{ notifications: AquaConfig['notification'] }> {
  return getJSON('/api/notifications');
}

export interface ExecuteResult {
  ok: boolean;
  status: number;
  contentType: string;
  durationMs: number;
  json?: unknown;
  blobUrl?: string;
  text?: string;
}

/**
 * Executes a live call against an endpoint. GET requests are sent as a
 * query string; POST/PUT requests are sent as an application/x-www-form-urlencoded
 * body built entirely from form parameters (no raw JSON body editor).
 */
export async function executeEndpoint(
  path: string,
  method: string,
  values: Record<string, string>
): Promise<ExecuteResult> {
  const started = performance.now();
  const base = endpointUrl(path);
  const upper = method.toUpperCase();

  let res: Response;
  if (upper === 'GET' || upper === 'DELETE') {
    const qs = new URLSearchParams(
      Object.entries(values).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    const url = qs ? `${base}?${qs}` : base;
    res = await fetch(url, { method: upper });
  } else {
    const form = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== '') form.set(k, v);
    });
    res = await fetch(base, {
      method: upper,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
  }

  const durationMs = Math.round(performance.now() - started);
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { ok: res.ok, status: res.status, contentType, durationMs, json };
  }

  if (contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/')) {
    const blob = await res.blob();
    return { ok: res.ok, status: res.status, contentType, durationMs, blobUrl: URL.createObjectURL(blob) };
  }

  const text = await res.text();
  return { ok: res.ok, status: res.status, contentType, durationMs, text };
}
