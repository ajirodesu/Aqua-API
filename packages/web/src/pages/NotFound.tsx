import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-surface px-6 py-12 text-center">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-2 rounded-card bg-surface-container px-6 py-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-on-surface/10">
          <Compass className="h-8 w-8 text-primary" strokeWidth={1.8} />
        </span>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-on-surface">Page not found</h1>
        <p className="text-[13px] leading-relaxed text-on-surface-variant">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link to="/" className="btn-primary mt-4 h-12 w-full rounded-lg text-[14px]">
          Back home
        </Link>
      </div>
    </div>
  );
}
