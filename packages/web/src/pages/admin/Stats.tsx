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
import { H_SHELL_SCOPE } from '../../lib/shell';
import { cn } from '../../lib/cn';

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

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 border border-hairline bg-surface-container-low">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <h2 className="min-w-0 truncate font-brand text-title-md uppercase tracking-[0.06em] text-on-surface">
          {title}
        </h2>
        {meta && (
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant/80">
            {meta}
          </span>
        )}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
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

  const header = (
    <SectionHeader
      title="Traffic ledger"
      hint="Request volume, response classes, and the busiest routes."
      right={<span className={H_SHELL_SCOPE}>ALL TIME</span>}
    />
  );

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Alert tone="error" title="Could not load stats" message={error} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[88px] animate-skeleton border border-hairline bg-surface-container-low" />
          ))}
        </div>
      </div>
    );
  }

  const statusTotal = stats.byStatus.ok + stats.byStatus.clientError + stats.byStatus.serverError;
  const sourceTotal = stats.bySource.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="flex animate-fade-in-up flex-col gap-5">
      {header}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Activity className="h-5 w-5" />} label="Total requests" value={String(stats.totalRequests)} sub={`${stats.endpointTotal} endpoint hits`} />
        <StatCard icon={<Bot className="h-5 w-5" />} label="Endpoints" value={String(stats.totalEndpoints)} sub={`${stats.categories} categories`} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Uptime" value={formatUptime(stats.uptimeSeconds)} sub={`${stats.memoryMb} MB heap`} />
        <StatCard icon={<Power className="h-5 w-5" />} label="Error rate" value={errorRate(stats)} sub={stats.maintenance ? 'maintenance ON' : 'service live'} />
      </div>

      <Panel title="Activity" meta="LAST 24H">
        <p className="mb-3 text-body-sm text-on-surface-variant">Requests per hour across all routes.</p>
        <ActivityChart hours={stats.hours} />
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Traffic by source" meta="ALL ROUTES">
          <ul className="space-y-2.5">
            {stats.bySource.length === 0 && (
              <li className="text-body-sm text-on-surface-variant">No traffic recorded yet.</li>
            )}
            {stats.bySource.map((s) => (
              <li key={s.source} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-2.5">
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant">{s.source}</span>
                <span className="h-1.5 overflow-hidden bg-surface-container-highest">
                  <span
                    className="block h-full bg-primary"
                    style={{ width: `${sourceTotal === 0 ? 0 : Math.round((s.count / sourceTotal) * 100)}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[11px] tabular-nums text-on-surface">{s.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-hairline pt-2 font-mono text-[9px] uppercase tracking-[0.06em] text-on-surface-variant/70">
            endpoint · api · admin · web
          </p>
        </Panel>

        <Panel title="Response classes" meta={`${statusTotal} TRACKED`}>
          <ul className="border-t border-hairline">
            {[
              { label: '2xx success', count: stats.byStatus.ok, cls: 'bg-success' },
              { label: '4xx client error', count: stats.byStatus.clientError, cls: 'bg-warning' },
              { label: '5xx server error', count: stats.byStatus.serverError, cls: 'bg-error' },
            ].map((row) => (
              <li key={row.label} className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm last:border-b-0">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-[1px]', row.cls)} aria-hidden="true" />
                <span className="text-on-surface-variant">{row.label}</span>
                <span className="ml-auto font-mono text-[11px] tabular-nums text-on-surface">{row.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
            <ShieldCheck className="h-3 w-3 text-primary" strokeWidth={1.75} />
            Error rate {errorRate(stats)}
          </p>
        </Panel>

        <Panel title="Platform" meta="RUNTIME">
          <ul className="border-t border-hairline">
            <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant">
              <Layers className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
              Categories
              <span className="ml-auto font-mono text-[11px] text-on-surface">{stats.categories}</span>
            </li>
            <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant">
              <Bot className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
              Disabled endpoints
              <span className="ml-auto font-mono text-[11px] text-on-surface">{stats.disabledEndpoints}</span>
            </li>
            <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant">
              <Database className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
              Database
              <span className="ml-auto font-mono text-[11px] text-on-surface">{stats.db}</span>
            </li>
            <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant last:border-b-0">
              <Globe className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
              Maintenance
              <span className={cn('ml-auto font-mono text-[11px] uppercase', stats.maintenance ? 'text-warning' : 'text-success')}>
                {stats.maintenance ? 'ON' : 'OFF'}
              </span>
            </li>
          </ul>
          <Link to="/admin/dashboard/endpoints" className="btn-secondary mt-4 w-full">
            Manage endpoints
          </Link>
        </Panel>
      </div>

      <section className="overflow-hidden border border-hairline bg-surface-container-low">
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
          <h2 className="font-brand text-title-md uppercase tracking-[0.06em] text-on-surface">Top routes</h2>
          <span className={H_SHELL_SCOPE}>BY HITS</span>
        </header>
        {stats.topPaths.length === 0 ? (
          <p className="px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
            No traffic recorded yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-3 border-b border-hairline bg-surface-container-high px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-on-surface-variant/80">
              <span>PATH</span>
              <span className="text-right">ERRORS</span>
              <span className="text-right">HITS</span>
            </div>
            <ul>
              {stats.topPaths.map((t) => (
                <li
                  key={t.path}
                  className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] items-center gap-3 border-b border-hairline px-4 py-2.5 font-mono text-[11px] last:border-b-0"
                >
                  <span className="min-w-0 truncate text-on-surface">{t.path}</span>
                  <span className={cn('text-right tabular-nums', t.errors > 0 ? 'text-error' : 'text-on-surface-variant/60')}>
                    {t.errors > 0 ? t.errors : '—'}
                  </span>
                  <span className="text-right tabular-nums text-on-surface-variant">{t.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
