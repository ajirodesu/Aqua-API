/**
 * Shared admin UI primitives — same printed-document tokens as the public
 * docs. Flat frames, mono labels, hairline rules; no fills, blur, or glow.
 * By AjiroDesu. Dark-mode only; no theme toggle is rendered in admin.
 */

import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import type { ActivityHour } from '../lib/adminTypes';
import { cn } from '../lib/cn';

export function SectionHeader({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-brand text-headline-md uppercase text-on-surface">{title}</h1>
        {hint && <p className="max-w-xl text-body-sm text-on-surface-variant">{hint}</p>}
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
    <div className="flex min-w-0 flex-col border border-hairline bg-surface-container-low px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/80">
          {label}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-hairline bg-surface-container-high text-primary [&>svg]:h-3.5 [&>svg]:w-3.5">
          {icon}
        </span>
      </div>
      <span className="mt-2 break-words font-brand text-headline-md uppercase leading-none text-on-surface">
        {value}
      </span>
      {sub && (
        <span className="mt-1.5 truncate font-mono text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/70">
          {sub}
        </span>
      )}
    </div>
  );
}

export function Alert({ tone, title, message }: { tone: 'error' | 'info'; title: string; message: string }) {
  const Icon = tone === 'error' ? AlertTriangle : Info;
  return (
    <div
      role="alert"
      className={cn(
        'flex animate-fade-in items-start gap-3 border px-4 py-3',
        tone === 'error'
          ? 'border-error/30 bg-error-container/40'
          : 'border-primary/30 bg-primary/[0.06]'
      )}
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-hairline bg-surface-container-high">
        <Icon className={cn('h-3.5 w-3.5', tone === 'error' ? 'text-error' : 'text-primary')} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.18em]',
            tone === 'error' ? 'text-error' : 'text-primary'
          )}
        >
          {tone === 'error' ? 'ERROR / ' : 'NOTICE / '}
          {title}
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
}

export function EmptyRow({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 border border-hairline bg-surface-container-low px-3 py-12 text-center">
      <span className="flex h-9 w-9 items-center justify-center border border-hairline bg-surface-container-high text-on-surface-variant [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <p className="font-brand text-headline-sm uppercase text-on-surface">{title}</p>
      <p className="max-w-xs text-body-sm text-on-surface-variant">{body}</p>
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
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-compact border p-0.5 transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-[0.38]',
        checked ? 'border-primary bg-primary' : 'border-outline-variant bg-surface-container-highest'
      )}
    >
      <span
        className={cn(
          'block h-3 w-3 rounded-[1px] transition-transform duration-fast ease-standard',
          checked ? 'translate-x-[1.125rem] bg-on-primary' : 'translate-x-0 bg-on-surface-variant'
        )}
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
      <div className="absolute inset-0 bg-scrim/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md animate-scale-in border border-outline-variant bg-surface-container-low shadow-elevation-3"
      >
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
          <span className="rule-label min-w-0 flex-1 truncate">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="px-4 py-4">{body}</div>
        <div className="flex justify-end gap-2 border-t border-hairline px-4 py-3">{actions}</div>
      </div>
    </div>
  );
}

export function SuccessNote({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-2 border border-success/25 bg-success-container/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-success">
      <span className="h-1.5 w-1.5 shrink-0 rounded-[1px] bg-success" aria-hidden="true" />
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
        <line
          x1="0"
          y1={height - 1}
          x2={width}
          y2={height - 1}
          className="stroke-hairline"
          strokeWidth="1"
        />
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
                rx={0}
                className="fill-primary opacity-75"
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-on-surface-variant/80">
        <span>{hours[0]?.hour}</span>
        <span>{hours[hours.length - 1]?.hour}</span>
      </div>
    </div>
  );
});
