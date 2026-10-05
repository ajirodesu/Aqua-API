/**
 * Admin overview — live stats, activity chart, system health.
 * By AjiroDesu.
 */

import { useEffect, useState } from 'react';
import { Activity, Bot, Clock, Cpu, Database, Power, ShieldCheck } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { ActivityHour, AdminStatus, RequestLogEntry } from '../../lib/adminTypes';
import { ActivityChart, Alert, StatCard } from '../../components/AdminUI';

function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
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

  if (error) return <Alert tone="error" title="Could not load overview" message={error} />;
  if (!status) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[76px] animate-skeleton rounded-xl border border-hairline bg-surface-container-low" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex animate-fade-in-up flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Bot className="h-5 w-5" />} label="Endpoints" value={String(status.totalEndpoints)} sub={`${status.categories} categories`} />
        <StatCard icon={<Activity className="h-5 w-5" />} label="Endpoint hits (1h)" value={String(status.endpointLastHour)} sub={`${status.endpointTotal} total`} />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Uptime" value={formatUptime(status.uptimeSeconds)} sub={`${status.memoryMb} MB heap`} />
        <StatCard icon={<Power className="h-5 w-5" />} label="Disabled" value={String(status.disabledEndpoints)} sub={status.maintenance ? 'maintenance ON' : 'all systems live'} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <h2 className="text-[13px] font-semibold text-on-surface">Activity — last 24h</h2>
          <p className="mb-3 text-xs text-on-surface-variant">Endpoint hits per hour (admin traffic excluded)</p>
          <ActivityChart hours={hours} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
            <h2 className="text-[13px] font-semibold text-on-surface">System health</h2>
            <ul className="mt-3 space-y-2.5 text-[13px]">
              <li className="flex items-center gap-2.5 text-on-surface-variant">
                <Database className="h-4 w-4 text-primary" />
                Database
                <span className="ml-auto font-mono text-xs text-on-surface">{status.db}{status.db === 'fake' ? ' (instant)' : ''}</span>
              </li>
              <li className="flex items-center gap-2.5 text-on-surface-variant">
                <Cpu className="h-4 w-4 text-primary" />
                Memory
                <span className="ml-auto font-mono text-xs text-on-surface">{status.memoryMb} MB</span>
              </li>
              <li className="flex items-center gap-2.5 text-on-surface-variant">
                <Power className="h-4 w-4 text-primary" />
                Disabled endpoints
                <span className="ml-auto font-mono text-xs text-on-surface">{status.disabledEndpoints}</span>
              </li>
              <li className="flex items-center gap-2.5 text-on-surface-variant">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Maintenance
                <span className={`ml-auto font-mono text-xs ${status.maintenance ? 'text-warning' : 'text-success'}`}>
                  {status.maintenance ? 'ON' : 'OFF'}
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
            <h2 className="text-[13px] font-semibold text-on-surface">Recent warnings & errors</h2>
            {recentErrors.length === 0 ? (
              <p className="mt-2 text-[13px] text-on-surface-variant">Nothing but clean 2xx traffic lately.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {recentErrors.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 font-mono text-xs">
                    <span className={`rounded-badge border px-1.5 py-0.5 font-semibold ${e.level === 'error' ? 'border-error/20 bg-error/15 text-error' : 'border-warning/20 bg-warning/15 text-warning'}`}>
                      {e.status}
                    </span>
                    <span className="truncate text-on-surface-variant">{e.method} {e.path}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
