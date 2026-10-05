/**
 * Shared admin UI primitives — same tokens as the public docs.
 * By AjiroDesu. Dark-mode only; no theme toggle is rendered in admin.
 */

import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import type { ActivityHour } from '../lib/adminTypes';

export function SectionHeader({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[22px] font-bold tracking-tight text-on-surface">{title}</h1>
        {hint && <p className="max-w-xl text-[13px] leading-normal text-on-surface-variant">{hint}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-hairline bg-surface-container-low p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-container-high text-primary">
        {icon}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-lg font-bold leading-tight text-on-surface">{value}</span>
        <span className="truncate text-xs text-on-surface-variant">
          {label}
          {sub ? ` • ${sub}` : ''}
        </span>
      </div>
    </div>
  );
}

export function Alert({ tone, title, message }: { tone: 'error' | 'info'; title: string; message: string }) {
  const Icon = tone === 'error' ? AlertTriangle : Info;
  return (
    <div
      role="alert"
      className={`flex animate-fade-in items-start gap-3 rounded-card border px-4 py-3 ${
        tone === 'error' ? 'border-error/30 bg-error/10' : 'border-primary/30 bg-primary/10'
      }`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone === 'error' ? 'text-error' : 'text-primary'}`} />
      <div>
        <p className={`text-sm font-semibold ${tone === 'error' ? 'text-error' : 'text-on-surface'}`}>{title}</p>
        <p className="mt-0.5 text-[13px] text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
}

export function EmptyRow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card bg-surface-container px-3 py-12 text-center">
      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-on-surface/10 text-surface-variant">
        {icon}
      </span>
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      <p className="max-w-xs text-[13px] text-on-surface-variant">{body}</p>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-fast ${
        checked ? 'bg-primary' : 'bg-surface-container-highest'
      } disabled:cursor-not-allowed disabled:opacity-[0.38]`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-fast ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export function Dialog({
  title,
  body,
  onClose,
  actions,
}: {
  title: string;
  body: ReactNode;
  onClose: () => void;
  actions: ReactNode;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-scale-in rounded-card border border-hairline bg-surface-container-low p-4 shadow-elevation-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">{body}</div>
        <div className="mt-4 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function SuccessNote({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      {message}
    </p>
  );
}

export const ActivityChart = memo(function ActivityChart({ hours }: { hours: ActivityHour[] }) {
  const max = useMemo(() => Math.max(1, ...hours.map((h) => h.count)), [hours]);
  const width = 560;
  const height = 120;
  const gap = 4;
  const barW = (width - gap * (hours.length - 1)) / hours.length;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[480px]" role="img" aria-label="Requests per hour">
        {hours.map((h, i) => {
          const barH = Math.max(2, (h.count / max) * (height - 20));
          return (
            <g key={h.hour}>
              <title>{`${h.hour}: ${h.count} requests`}</title>
              <rect
                x={i * (barW + gap)}
                y={height - barH}
                width={barW}
                height={barH}
                rx={3}
                className="fill-primary opacity-80"
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-surface-variant">
        <span>{hours[0]?.hour}</span>
        <span>{hours[hours.length - 1]?.hour}</span>
      </div>
    </div>
  );
});
