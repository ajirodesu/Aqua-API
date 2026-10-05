export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="relative h-12 w-12 shrink-0">
        <span className="absolute inset-0 rounded-full border-2 border-outline-variant" />
        <span
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary motion-reduce:animate-none"
          style={{ animationDuration: '0.85s' }}
        />
        <span className="absolute inset-[18px] rounded-full bg-primary" />
      </div>
      <p className="animate-fade-in-up text-sm font-medium text-on-surface-variant">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
