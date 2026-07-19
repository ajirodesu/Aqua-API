/**
 * Shared "page is loading" indicator used for the top-level route
 * fallback (App.tsx) and for the initial API-catalog fetch (Home,
 * DocsLayout). Centralizing it means one polished animation everywhere
 * instead of three copies of a bare spinner, and one place to tune it.
 *
 * Design notes:
 * - Every layer animates only `transform`/`opacity`, so it stays smooth
 *   and cheap even on low-power devices (no layout/paint thrashing).
 * - Fixed footprint (no intrinsic size changes) so it never causes
 *   layout shift while content swaps in around it.
 * - Respects prefers-reduced-motion by dropping the decorative glow/ring
 *   and slowing the spinner to a gentle fade instead of a spin.
 */
export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="relative h-12 w-12 shrink-0">
        {/* ambient glow, sits behind everything */}
        <span className="absolute inset-0 rounded-full bg-aqua-500/25 blur-lg motion-reduce:hidden" />
        {/* soft outward pulse */}
        <span className="absolute inset-0 rounded-full border border-aqua-400/40 animate-ping-soft motion-reduce:hidden" />
        {/* static track */}
        <span className="absolute inset-0 rounded-full border-2 border-white/10" />
        {/* spinning arc */}
        <span
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-aqua-400 border-r-aqua-400/60 motion-reduce:animate-none motion-reduce:border-t-aqua-400/70"
          style={{ animationDuration: '0.85s' }}
        />
        {/* solid core */}
        <span className="absolute inset-[13px] rounded-full bg-gradient-to-br from-aqua-300 to-aqua-600 shadow-glow-aqua" />
      </div>
      <p className="text-sm font-medium text-slate-400 animate-fade-up">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  );
}
