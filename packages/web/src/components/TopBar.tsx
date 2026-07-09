import { Link } from 'react-router-dom';
import { Github, Menu, Send } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { NotificationBell } from './NotificationBell';

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { config } = useAppData();

  return (
    <header className="glass sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-3 sm:px-5">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 lg:hidden"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2.2} />
      </button>

      <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-white">
        <span className="hidden text-[15px] sm:inline">{config?.name ?? 'Aqua APIs'}</span>
      </Link>

      <div className="ml-auto flex items-center gap-1.5">
        {config?.telegram && (
          <a
            href={config.telegram}
            target="_blank"
            rel="noreferrer"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 sm:flex"
            aria-label="Telegram community"
          >
            <Send className="h-[17px] w-[17px]" strokeWidth={2.2} />
          </a>
        )}
        {config?.github && (
          <a
            href={config.github}
            target="_blank"
            rel="noreferrer"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 sm:flex"
            aria-label="GitHub"
          >
            <Github className="h-[17px] w-[17px]" strokeWidth={2.2} />
          </a>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
