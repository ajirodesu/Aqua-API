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
      const t = setTimeout(() => setMounted(false), 180);
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
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10 active:scale-90"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2.2} />
        {notifications.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-aqua-400" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua-500" />
          </span>
        )}
      </button>

      {mounted && (
        <div
          className={`absolute right-0 top-11 z-30 w-[calc(100vw-1.5rem)] max-w-80 origin-top-right rounded-2xl border border-white/10 bg-surface-card p-2 shadow-ios-lg transition-all duration-200 ease-ios ${
            open ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
          }`}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-sm font-bold text-slate-200">Notifications</span>
            <span className="text-xs text-slate-500">
              {notifications.length > 0 ? `${notifications.length} total` : 'all caught up'}
            </span>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto px-1 pb-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <BellOff className="h-6 w-6 text-slate-600" />
                <span className="text-xs text-slate-500">No notifications yet.</span>
              </div>
            ) : (
              [...notifications]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((n) => (
                  <div key={n.id} className="rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[13px] font-semibold text-slate-200">{n.title || 'Update'}</span>
                      <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-400">{n.message}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
