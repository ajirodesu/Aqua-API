import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { cn } from '../lib/cn';
import { H_BRAND_TEXT, H_HEIGHT, H_ICON_BTN_MOBILE, H_PX, H_SEPARATOR, H_SHELL_SCOPE, H_SURFACE } from '../lib/shell';
import { NotificationBell } from './NotificationBell';

export function TopBar({ onMenuClick, menuOpen = false }: { onMenuClick: () => void; menuOpen?: boolean }) {
  const { config, findEndpoint } = useAppData();
  const { pathname } = useLocation();

  // /docs/:category/:name → current endpoint label; /docs → Overview.
  const segments = pathname.split('/').filter(Boolean);
  const endpoint = segments.length >= 3 ? findEndpoint(segments[1], segments[2]) : undefined;
  const currentLabel = endpoint?.name ?? 'Overview';

  return (
    <header
      className={cn(
        'sticky top-0 z-sticky flex shrink-0 items-center gap-2 border-b',
        H_SURFACE,
        H_SEPARATOR,
        H_HEIGHT,
        H_PX
      )}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className={cn(
          'flex items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden',
          H_ICON_BTN_MOBILE
        )}
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation menu'}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
      </button>

      {/* One left-aligned cluster: scope prefix + current page label */}
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn(H_SHELL_SCOPE, 'hidden sm:inline')}>DOCS /</span>
        <span className={cn(H_BRAND_TEXT, 'min-w-0 truncate text-on-surface')}>{currentLabel}</span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
        <Link
          to="/"
          className="hidden px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant transition-colors duration-fast hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex"
        >
          {config?.name ?? 'AQUA'}
        </Link>
        <NotificationBell />
      </div>
    </header>
  );
}
