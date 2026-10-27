import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      <div className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-[var(--layout-nav-max)] items-center justify-between gap-3 px-[var(--layout-section-px)] py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/85">AQUA / API MANUAL</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/85">404</span>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-[var(--layout-nav-max)] flex-1 items-center px-[var(--layout-section-px)] py-16">
        <div className="grid w-full gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="rule-label max-w-[14rem]">ERROR / NOT FOUND</p>
            <h1 className="mt-6 font-brand text-display-lg uppercase text-on-surface">Page not found.</h1>
            <p className="mt-5 max-w-[48ch] text-body-lg text-on-surface-variant">
              The page you&apos;re looking for doesn&apos;t exist or may have moved. The catalog is still online.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/" className="btn-primary">
                Back home
              </Link>
              <Link to="/docs" className="btn-secondary">
                Open documentation
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 lg:border-l lg:border-hairline lg:pl-8">
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 border border-hairline bg-surface-container-low p-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center border border-hairline bg-surface-container-high text-primary">
                <Compass className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">Route unregistered</p>
              <p className="font-brand text-headline-sm uppercase text-on-surface">Check the address</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex w-full max-w-[var(--layout-nav-max)] items-center justify-between gap-3 px-[var(--layout-section-px)] py-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/85">AQUA</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/85">REST / JSON</span>
        </div>
      </footer>
    </div>
  );
}
