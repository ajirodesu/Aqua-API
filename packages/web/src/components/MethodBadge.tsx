interface Props {
  method: string;
  size?: 'sm' | 'md';
}

const TONE: Record<string, string> = {
  GET: 'bg-success/15 text-success border-success/20',
  POST: 'bg-primary/15 text-primary border-primary/20',
  PUT: 'bg-warning/15 text-warning border-warning/20',
  DELETE: 'bg-error/15 text-error border-error/20',
};

export function MethodBadge({ method, size = 'sm' }: Props) {
  const upper = method.toUpperCase();
  const tone = TONE[upper] ?? 'bg-secondary/15 text-on-surface-variant border-hairline';
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-badge border font-mono font-semibold uppercase tracking-wider ${sizeCls} ${tone}`}
    >
      {upper}
    </span>
  );
}
