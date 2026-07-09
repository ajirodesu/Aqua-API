import { Link } from 'react-router-dom';
import { Github, Menu, Send } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { NotificationBell } from './NotificationBell';

export function TopBar({
  onMenuClick,
  scrolled,
}: {
  onMenuClick: () => void;
  /** True once the page has been scrolled — reveals the brand name and
   * social links. At rest (top of page) only the hamburger and the
   * notification bell stay visible, and the bar itself is transparent. */
  scrolled: boolean;
}) {
  const { config } = useAppData();

  return (
    <header
      className={`sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-3 transition-all duration-300 ease-ios sm:px-5 ${
        scrolled ? 'glass border-b' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10 active:scale-90 lg:hidden"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2.2} />
      </button>

      <Link
        to="/"
        className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-2 font-display font-extrabold text-white transition-opacity duration-300 ease-ios lg:static lg:left-auto lg:translate-x-0 ${
          scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <span className="text-[15px]">{config?.name ?? 'Aqua APIs'}</span>
      </Link>

      <div className="relative z-10 ml-auto flex items-center gap-1.5">
        <div
          className={`flex items-center gap-1.5 transition-opacity duration-300 ease-ios ${
            scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {config?.telegram && (
            <a
              href={config.telegram}
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10 sm:flex"
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
              className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10 sm:flex"
              aria-label="GitHub"
            >
              <Github className="h-[17px] w-[17px]" strokeWidth={2.2} />
            </a>
          )}
        </div>
        <NotificationBell />
      </div>
    </header>
  );
}
