import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { NotificationBell } from './NotificationBell';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { config } = useAppData();

  return (
    <header className="sticky top-0 z-sticky flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface-container-low px-5 transition-colors duration-fast ease-standard">
      <div className="relative z-10 flex items-center gap-1">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface active:bg-surface-container-highest md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <Link
          to="/"
          className="hidden truncate px-1 text-base font-semibold tracking-tight text-on-surface transition-opacity duration-fast md:inline-flex"
        >
          {config?.name ?? 'Aqua APIs'}
        </Link>
      </div>

      {/* Mobile: brand — absolutely centred, like Persian-Bot's public shell */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center md:hidden">
        <span className="truncate px-14 text-base font-semibold tracking-tight text-on-surface">
          {config?.name ?? 'Aqua APIs'}
        </span>
      </div>

      <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
