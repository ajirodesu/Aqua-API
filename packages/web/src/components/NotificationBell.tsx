import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useAppData } from '../lib/appData';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { config } = useAppData();
  const notifications = config?.notification ?? [];
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else if (mounted) {
      const t = setTimeout(() => setMounted(false), 150);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-primary" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        )}
      </button>

      {mounted && (
        <div
          className={`absolute right-0 top-11 z-dropdown w-[calc(100vw-1.5rem)] max-w-80 origin-top-right rounded-input border border-hairline bg-surface-container-low p-2 shadow-elevation-3 transition-all duration-fast ease-standard ${
            open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-semibold text-on-surface">Notifications</span>
            <span className="text-xs text-on-surface-variant">
              {notifications.length > 0 ? `${notifications.length} total` : 'all caught up'}
            </span>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto px-1 pb-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-on-surface/10">
                  <BellOff className="h-5 w-5 text-surface-variant" />
                </span>
                <span className="text-xs text-on-surface-variant">No notifications yet.</span>
              </div>
            ) : (
              [...notifications]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((n) => (
                  <div
                    key={n.id}
                    className="tactile-press rounded-input px-3 py-2.5 transition-colors duration-fast hover:bg-surface-container-high"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[13px] font-semibold text-on-surface">
                        {n.title || 'Update'}
                      </span>
                      <span className="shrink-0 text-[11px] text-on-surface-variant">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">{n.message}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
