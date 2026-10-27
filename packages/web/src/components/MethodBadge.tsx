interface Props {
  method: string;
  size?: 'sm' | 'md';
}

const TONE: Record<string, string> = {
  GET: 'border-success/30 bg-success-container text-on-success-container',
  POST: 'border-primary/30 bg-primary-container text-on-primary-container',
  PUT: 'border-warning/30 bg-warning-container text-on-warning-container',
  DELETE: 'border-error/30 bg-error-container text-on-error-container',
};

export function MethodBadge({ method, size = 'sm' }: Props) {
  const upper = method.toUpperCase();
  const tone = TONE[upper] ?? 'border-outline-variant bg-surface-container-high text-on-surface-variant';
  const sizeCls = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[var(--radius-badge)] border font-mono font-semibold uppercase tracking-[0.08em] ${sizeCls} ${tone}`}
    >
      {upper}
    </span>
  );
}
