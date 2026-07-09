import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-aqua-500/10 text-aqua-400">
        <Compass className="h-7 w-7" strokeWidth={1.8} />
      </span>
      <h1 className="font-display text-2xl font-extrabold text-white">Page not found</h1>
      <p className="max-w-sm text-sm text-slate-400">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/" className="btn-primary mt-2">
        Back home
      </Link>
    </div>
  );
}
