/**
 * Admin overview — live stats, activity chart, system health.
 * By AjiroDesu.
 */

import { useEffect, useState } from 'react';
import { Activity, Bot, Clock, Cpu, Database, Power, ShieldCheck } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { ActivityHour, AdminStatus, RequestLogEntry } from '../../lib/adminTypes';
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

export function AdminOverview() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [hours, setHours] = useState<ActivityHour[]>([]);
  const [recentErrors, setRecentErrors] = useState<RequestLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, a, logs] = await Promise.all([
          adminRequest<AdminStatus>('/api/admin/status'),
          adminRequest<{ hours: ActivityHour[] }>('/api/admin/activity'),
          adminRequest<{ items: RequestLogEntry[]; total: number }>('/api/admin/logs?limit=100'),
        ]);
        if (cancelled) return;
        setStatus(s);
        setHours(a.hours);
        setRecentErrors(logs.items.filter((e) => e.level !== 'info').slice(-5).reverse());
      } catch (err) {
        if (!cancelled) setError(err instanceof AdminApiError ? err.message : 'Failed to load overview');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const header = (
    <SectionHeader
      title="System overview"
      hint="Live service status, request activity, and recent warnings."
      right={<span className={H_SHELL_SCOPE}>REV 02</span>}
    />
  );

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <Alert tone="error" title="Could not load overview" message={error} />
      </div>
    );
  }

  if (!status) {
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

  return (
    <div className="flex animate-fade-in-up flex-col gap-5">
      {header}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Bot className="h-5 w-5" />} label="Endpoints" value={String(status.totalEndpoints)} sub={`${status.categories} categories`} />
        <StatCard icon={<Activity className="h-5 w-5" />} label="Endpoint hits (1h)" value={String(status.endpointLastHour)} sub={`${status.endpointTotal} total`} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Uptime" value={formatUptime(status.uptimeSeconds)} sub={`${status.memoryMb} MB heap`} />
        <StatCard icon={<Power className="h-5 w-5" />} label="Disabled" value={String(status.disabledEndpoints)} sub={status.maintenance ? 'maintenance ON' : 'all systems live'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Activity" meta="LAST 24H">
          <p className="mb-3 text-body-sm text-on-surface-variant">Endpoint hits per hour (admin traffic excluded).</p>
          <ActivityChart hours={hours} />
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="System health" meta="RUNTIME">
            <ul className="border-t border-hairline">
              <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant last:border-b-0">
                <Database className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
                Database
                <span className="ml-auto font-mono text-[11px] text-on-surface">
                  {status.db}
                  {status.db === 'fake' ? ' (instant)' : ''}
                </span>
              </li>
              <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant last:border-b-0">
                <Cpu className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
                Memory
                <span className="ml-auto font-mono text-[11px] text-on-surface">{status.memoryMb} MB</span>
              </li>
              <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant last:border-b-0">
                <Power className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
                Disabled endpoints
                <span className="ml-auto font-mono text-[11px] text-on-surface">{status.disabledEndpoints}</span>
              </li>
              <li className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-body-sm text-on-surface-variant last:border-b-0">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
                Maintenance
                <span className={cn('ml-auto font-mono text-[11px] uppercase', status.maintenance ? 'text-warning' : 'text-success')}>
                  {status.maintenance ? 'ON' : 'OFF'}
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title="Recent warnings" meta="LAST 5">
            {recentErrors.length === 0 ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
                Nothing but clean 2xx traffic lately.
              </p>
            ) : (
              <ul className="border-t border-hairline">
                {recentErrors.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 border-b border-hairline py-2 font-mono text-[11px] last:border-b-0">
                    <span
                      className={cn(
                        'shrink-0 rounded-badge border px-1.5 py-0.5 font-semibold tabular-nums',
                        e.level === 'error'
                          ? 'border-error/30 bg-error-container text-on-error-container'
                          : 'border-warning/30 bg-warning-container text-on-warning-container'
                      )}
                    >
                      {e.status}
                    </span>
                    <span className="min-w-0 truncate text-on-surface-variant">
                      {e.method} {e.path}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
