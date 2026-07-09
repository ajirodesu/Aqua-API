interface Props {
  method: string;
  size?: 'sm' | 'md';
}

export function MethodBadge({ method, size = 'sm' }: Props) {
  const upper = method.toUpperCase();
  const sizeCls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  return (
    <span className={`pill font-mono font-bold ${sizeCls} method-badge-${upper}`}>
      {upper}
    </span>
  );
}
