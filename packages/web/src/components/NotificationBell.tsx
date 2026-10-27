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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {notifications.length > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-[1px] bg-primary" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-dropdown w-[calc(100vw-1.5rem)] max-w-80 overflow-hidden rounded-input border border-outline-variant bg-surface-container-low [animation:fade-in-down_150ms_var(--easing-standard-decelerate)_both]">
          <div className="flex items-center justify-between border-b border-hairline px-3.5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface">Notifications</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant">
              {notifications.length > 0 ? `${notifications.length} total` : 'clear'}
            </span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <span className="flex h-9 w-9 items-center justify-center border border-hairline bg-surface-container-high">
                  <BellOff className="h-4 w-4 text-on-surface-variant" strokeWidth={1.75} />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">No notifications yet.</span>
              </div>
            ) : (
              [...notifications]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((n) => (
                  <div key={n.id} className="border-b border-hairline px-3.5 py-3 transition-colors duration-fast last:border-b-0 hover:bg-surface-container-high">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-brand text-[15px] uppercase tracking-[0.06em] text-on-surface">
                        {n.title || 'Update'}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.04em] text-on-surface-variant">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-body-sm leading-snug text-on-surface-variant">{n.message}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
