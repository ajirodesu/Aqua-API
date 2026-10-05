/**
 * Admin stats — complete traffic and platform statistics.
 * By AjiroDesu. Reachable from the sidebar; covers public API,
 * admin panel, and site traffic (tracked separately by source).
 */

import { useEffect, useState } from 'react';
import { Activity, Bot, Clock, Database, Globe, Layers, Power, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { AdminStats } from '../../lib/adminTypes';
import { ActivityChart, Alert, SectionHeader, StatCard } from '../../components/AdminUI';

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function errorRate(stats: AdminStats): string {
  const total = stats.byStatus.ok + stats.byStatus.clientError + stats.byStatus.serverError;
  if (total === 0) return '0%';
  const bad = stats.byStatus.clientError + stats.byStatus.serverError;
  return `${Math.round((bad / total) * 1000) / 10}%`;
}

export function AdminStatsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await adminRequest<AdminStats>('/api/admin/stats');
        if (!cancelled) setStats(s);
      } catch (err) {
        if (!cancelled) setError(err instanceof AdminApiError ? err.message : 'Failed to load stats');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <Alert tone="error" title="Could not load stats" message={error} />;
  if (!stats) {
    return (
      <div className="flex animate-fade-in-up flex-col gap-4">
        <SectionHeader title="Stats" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] animate-skeleton rounded-xl border border-hairline bg-surface-container-low" />
          ))}
        </div>
      </div>
    );
  }

  const statusTotal = stats.byStatus.ok + stats.byStatus.clientError + stats.byStatus.serverError;
  const sourceTotal = stats.bySource.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex animate-fade-in-up flex-col gap-6">
      <SectionHeader title="Stats" hint="Complete traffic and platform statistics." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Activity className="h-5 w-5" />} label="Total requests" value={String(stats.totalRequests)} sub={`${stats.endpointTotal} endpoint hits`} />
        <StatCard icon={<Bot className="h-5 w-5" />} label="Endpoints" value={String(stats.totalEndpoints)} sub={`${stats.categories} categories`} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Uptime" value={formatUptime(stats.uptimeSeconds)} sub={`${stats.memoryMb} MB heap`} />
        <StatCard icon={<Power className="h-5 w-5" />} label="Error rate" value={errorRate(stats)} sub={stats.maintenance ? 'maintenance ON' : 'service live'} />
      </div>

      <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
        <h2 className="text-[13px] font-semibold text-on-surface">Activity — last 24h</h2>
        <p className="mb-3 text-xs text-on-surface-variant">Requests per hour across all routes</p>
        <ActivityChart hours={stats.hours} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
            <Globe className="h-4 w-4 text-primary" />
            Traffic by source
          </h2>
          <ul className="mt-3 space-y-2.5">
            {stats.bySource.length === 0 && (
              <li className="text-[13px] text-on-surface-variant">No traffic recorded yet.</li>
            )}
            {stats.bySource.map((s) => (
              <li key={s.source} className="flex items-center gap-2.5 text-[13px]">
                <span className="font-mono text-xs text-on-surface-variant">{s.source}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${sourceTotal === 0 ? 0 : Math.round((s.count / sourceTotal) * 100)}%` }}
                  />
                </span>
                <span className="font-mono text-xs text-on-surface">{s.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-on-surface-variant">endpoint = used API endpoints • api = meta API • admin = dashboard • web = site pages</p>
        </div>

        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Responses by status
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            {[
              { label: '2xx success', count: stats.byStatus.ok, cls: 'bg-success' },
              { label: '4xx client error', count: stats.byStatus.clientError, cls: 'bg-warning' },
              { label: '5xx server error', count: stats.byStatus.serverError, cls: 'bg-error' },
            ].map((row) => (
              <li key={row.label} className="flex items-center gap-2.5">
                <span className={`h-1.5 w-1.5 rounded-full ${row.cls}`} />
                <span className="text-on-surface-variant">{row.label}</span>
                <span className="ml-auto font-mono text-xs text-on-surface">{row.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[11px] text-surface-variant">{statusTotal} responses tracked</p>
        </div>

        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
            <Layers className="h-4 w-4 text-primary" />
            Platform
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13px]">
            <li className="flex items-center gap-2.5 text-on-surface-variant">
              Categories
              <span className="ml-auto font-mono text-xs text-on-surface">{stats.categories}</span>
            </li>
            <li className="flex items-center gap-2.5 text-on-surface-variant">
              Disabled endpoints
              <span className="ml-auto font-mono text-xs text-on-surface">{stats.disabledEndpoints}</span>
            </li>
            <li className="flex items-center gap-2.5 text-on-surface-variant">
              <Database className="h-4 w-4 text-primary" />
              Database
              <span className="ml-auto font-mono text-xs text-on-surface">{stats.db}</span>
            </li>
            <li className="flex items-center gap-2.5 text-on-surface-variant">
              Maintenance
              <span className={`ml-auto font-mono text-xs ${stats.maintenance ? 'text-warning' : 'text-success'}`}>
                {stats.maintenance ? 'ON' : 'OFF'}
              </span>
            </li>
          </ul>
          <Link to="/admin/dashboard/endpoints" className="btn-secondary mt-4 h-10 w-full rounded-lg text-[13px]">
            Manage endpoints
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline bg-surface-container-low">
        <header className="border-b border-outline-variant px-4 py-3">
          <h2 className="text-[13px] font-semibold text-on-surface">Top routes</h2>
          <p className="text-xs text-on-surface-variant">Most requested paths with error counts</p>
        </header>
        {stats.topPaths.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-on-surface-variant">No traffic recorded yet.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {stats.topPaths.map((t) => (
              <li key={t.path} className="flex items-center gap-3 px-4 py-2.5 font-mono text-xs">
                <span className="min-w-0 flex-1 truncate text-on-surface">{t.path}</span>
                {t.errors > 0 && <span className="shrink-0 text-error">{t.errors} err</span>}
                <span className="shrink-0 text-on-surface-variant">{t.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
