/**
 * Admin API contract — mirrors packages/aqua/src/engine/admin-router.ts.
 * By AjiroDesu. Keep both sides in sync; the backend is the source of truth.
 * The only account in the system is the admin — there are no user records.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface AdminLoginResponse {
  token: string;
  username: string;
  expiresAt: null;
}

export interface AdminMe {
  username: string;
  expiresAt: null;
}

export interface AdminStatus {
  totalRequests: number;
  uptimeSeconds: number;
  memoryMb: number;
  requestsLastHour: number;
  endpointTotal: number;
  endpointLastHour: number;
  totalEndpoints: number;
  categories: number;
  disabledEndpoints: number;
  maintenance: boolean;
  configured: boolean;
  db: 'neon' | 'fake';
}

export interface ActivityHour {
  hour: string;
  count: number;
}

export interface TrafficSource {
  source: string;
  count: number;
}

export interface TopPath {
  path: string;
  count: number;
  errors: number;
}

export interface AdminStats extends AdminStatus {
  hours: ActivityHour[];
  byStatus: { ok: number; clientError: number; serverError: number };
  bySource: TrafficSource[];
  topPaths: TopPath[];
}

export interface AdminEndpointItem {
  name: string;
  desc: string;
  path: string;
  methods: string[];
  category: string;
  enabled: boolean;
}

export interface AdminEndpointBucket {
  name: string;
  items: AdminEndpointItem[];
}

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  createdAt: number;
}

export interface RequestLogEntry {
  id: number;
  timestamp: number;
  level: LogLevel;
  source: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface AdminSettings {
  name: string;
  description: string;
  status: string;
  telegram: string;
  github: string;
  messenger: string;
  operator: string;
  maintenance: boolean;
  keys: Record<string, { set: boolean; preview: string }>;
}

export interface ApiErrorBody {
  error: string;
}
