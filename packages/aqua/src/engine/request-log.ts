/*
 * INFO: request-log.ts
 * Request log ring buffer + stats for the Aqua admin dashboard — by AjiroDesu.
 *
 * Every request appends one entry (method, path, status, duration). The
 * buffer feeds the Logs page (REST + SSE stream) and the Overview activity
 * chart (per-hour buckets for the last 24h). Bounded and allocation-light.
 */

import type { NextFunction, Request, Response } from 'express';

export type LogLevel = 'info' | 'warn' | 'error';

export interface RequestLogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  source: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  /** True for real dynamic-endpoint hits (excludes admin polling, meta API, pages). */
  isEndpoint: boolean;
}

export interface SseSubscriber {
  id: number;
  res: Response;
}

const MAX_ENTRIES = 500;
const entries: RequestLogEntry[] = [];
let nextId = 1;

const subscribers = new Map<number, SseSubscriber>();
let nextSubscriberId = 1;

let totalRequests = 0;
const startedAt = Date.now();

function levelForStatus(status: number): LogLevel {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

function sourceForPath(path: string, isEndpoint: boolean): string {
  if (isEndpoint) return 'endpoint';
  if (path.startsWith('/api/admin')) return 'admin';
  if (path.startsWith('/api/')) return 'api';
  return 'web';
}

export function pushLog(entry: Omit<RequestLogEntry, 'id'>): RequestLogEntry {
  const full: RequestLogEntry = { ...entry, id: nextId++ };
  entries.push(full);
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
  broadcast(full);
  return full;
}

function broadcast(entry: RequestLogEntry): void {
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const [id, sub] of subscribers) {
    try {
      sub.res.write(payload);
    } catch {
      subscribers.delete(id);
    }
  }
}

export function subscribeLogs(res: Response): number {
  const id = nextSubscriberId++;
  subscribers.set(id, { id, res });
  return id;
}

export function unsubscribeLogs(id: number): void {
  subscribers.delete(id);
}

export function queryLogs(options: {
  level?: LogLevel;
  source?: string;
  search?: string;
  limit: number;
  before?: number;
}): { items: RequestLogEntry[]; total: number } {
  const since = options.before ?? Number.POSITIVE_INFINITY;
  const filtered = entries.filter(
    (e) =>
      e.id < since &&
      (!options.level || e.level === options.level) &&
      (!options.source || e.source === options.source) &&
      (!options.search ||
        e.path.toLowerCase().includes(options.search) ||
        e.method.toLowerCase().includes(options.search))
  );
  const total = filtered.length;
  const items = filtered.slice(Math.max(0, total - options.limit));
  return { items, total };
}

/** Endpoint hits per hour for the last 24h, oldest first.
 *  Only real endpoint usage counts — admin polling and page views are excluded. */
export function hourlyActivity(): { hour: string; count: number }[] {
  const now = Date.now();
  const buckets: { hour: string; count: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const end = now - i * 3_600_000;
    const label = new Date(end).toISOString().slice(11, 13) + ':00';
    buckets.push({ hour: label, count: 0 });
  }
  for (const e of entries) {
    if (!e.isEndpoint) continue;
    const ageHours = Math.floor((now - e.timestamp) / 3_600_000);
    if (ageHours >= 0 && ageHours < 24) {
      buckets[23 - ageHours].count += 1;
    }
  }
  return buckets;
}

export function requestStats(): {
  totalRequests: number;
  uptimeSeconds: number;
  memoryMb: number;
  requestsLastHour: number;
  endpointTotal: number;
  endpointLastHour: number;
} {
  const mem = process.memoryUsage();
  const cutoff = Date.now() - 3_600_000;
  const recent = entries.filter((e) => e.timestamp >= cutoff);
  return {
    totalRequests,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    memoryMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
    requestsLastHour: recent.length,
    endpointTotal: entries.filter((e) => e.isEndpoint).length,
    endpointLastHour: recent.filter((e) => e.isEndpoint).length,
  };
}

export interface TrafficBreakdown {
  byStatus: { ok: number; clientError: number; serverError: number };
  bySource: { source: string; count: number }[];
  topPaths: { path: string; count: number; errors: number }[];
}

/** Complete traffic breakdown for the admin Stats page. */
export function trafficStats(topN = 10): TrafficBreakdown {
  const byStatus = { ok: 0, clientError: 0, serverError: 0 };
  const sources = new Map<string, number>();
  const paths = new Map<string, { count: number; errors: number }>();
  for (const e of entries) {
    if (e.status >= 500) byStatus.serverError += 1;
    else if (e.status >= 400) byStatus.clientError += 1;
    else byStatus.ok += 1;
    sources.set(e.source, (sources.get(e.source) ?? 0) + 1);
    const row = paths.get(e.path) ?? { count: 0, errors: 0 };
    row.count += 1;
    if (e.status >= 400) row.errors += 1;
    paths.set(e.path, row);
  }
  return {
    byStatus,
    bySource: [...sources.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    topPaths: [...paths.entries()]
      .map(([path, row]) => ({ path, ...row }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN),
  };
}
/** Express middleware: records one entry per finished request. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  totalRequests += 1;
  // originalUrl keeps the mount prefix (/api/admin/…) that req.path strips.
  const fullPath = req.originalUrl.split('?')[0];
  res.on('finish', () => {
    pushLog({
      timestamp: Date.now(),
      level: levelForStatus(res.statusCode),
      source: sourceForPath(fullPath, req.isEndpoint === true),
      method: req.method,
      path: fullPath,
      status: res.statusCode,
      durationMs: Date.now() - start,
      isEndpoint: req.isEndpoint === true,
    });
  });
  next();
}
