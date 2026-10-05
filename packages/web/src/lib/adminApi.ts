/**
 * Admin API client — same-origin fetch wrapper with Bearer token.
 * By AjiroDesu. In dev, Vite proxies /api/* to the backend on :3000.
 */

import type { ApiErrorBody } from './adminTypes';

export const ADMIN_TOKEN_KEY = 'aqua-admin-token';

export function getAdminToken(): string | null {
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode) — session just won't persist.
  }
}

export class AdminApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  /** Send the Bearer token (default true). False for login. */
  auth?: boolean;
}

function errorMessage(status: number, body: ApiErrorBody | null, fallback: string): string {
  if (body && typeof body.error === 'string' && body.error !== '') return body.error;
  if (status === 401) return 'Session expired — please sign in again';
  if (status === 429) return 'Too many requests — slow down and retry';
  return fallback;
}

export async function adminRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs = 30000, auth = true } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getAdminToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const parsed = text !== '' ? (JSON.parse(text) as T | ApiErrorBody) : null;
    if (!res.ok) {
      throw new AdminApiError(res.status, errorMessage(res.status, parsed as ApiErrorBody | null, `Request failed: ${res.status}`));
    }
    return (parsed ?? undefined) as T;
  } catch (err) {
    if (err instanceof AdminApiError) throw err;
    throw new AdminApiError(0, err instanceof Error ? err.message : 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

export function adminStreamUrl(path: string): string {
  const token = getAdminToken();
  return token ? `${path}?token=${encodeURIComponent(token)}` : path;
}
