export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <span className="relative flex h-8 w-8 items-center justify-center border border-hairline">
        <span className="absolute inset-0 animate-spin border border-transparent border-t-primary motion-reduce:animate-none" />
        <span className="h-1.5 w-1.5 bg-primary" />
      </span>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
