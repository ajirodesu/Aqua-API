/**
 * Admin announcements — broadcast a notification to all API users.
 * By AjiroDesu. Posts land in every user's notification bell instantly.
 */

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Send, Trash2 } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { AdminNotification } from '../../lib/adminTypes';
import { Alert, Dialog, EmptyRow, SectionHeader, SuccessNote } from '../../components/AdminUI';
import { H_SHELL_SCOPE } from '../../lib/shell';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminAnnounce() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminRequest<{ notifications: AdminNotification[] }>('/api/notifications');
      setItems(res.notifications);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    if (message.trim() === '') return;
    setSending(true);
    setNotice(null);
    try {
      const created = await adminRequest<AdminNotification>('/api/admin/announce', {
        method: 'POST',
        body: { title: title.trim(), message: message.trim() },
      });
      setItems((prev) => [created, ...prev]);
      setTitle('');
      setMessage('');
      setNotice(`“${created.title}” is now live for all API users`);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  async function clearAll() {
    setClearing(true);
    try {
      await adminRequest('/api/admin/announce', { method: 'DELETE' });
      setItems([]);
      setConfirmClear(false);
      setNotice('All announcements cleared');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Clear failed');
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex animate-fade-in-up flex-col gap-4">
      <SectionHeader
        title="Broadcast"
        hint="Post a notification to every API user's bell. Broadcasts are immediate and public."
        right={
          items.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="btn-secondary !min-h-9 !px-3"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.75} />
              Clear all
            </button>
          ) : undefined
        }
      />

      {error && <Alert tone="error" title="Something went wrong" message={error} />}
      {notice && <SuccessNote message={notice} />}

      <form
        className="border border-hairline bg-surface-container-low"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
          <h2 className="font-brand text-title-md uppercase tracking-[0.06em] text-on-surface">New announcement</h2>
          <span className={H_SHELL_SCOPE}>PUBLIC</span>
        </header>

        <div className="px-4">
          <div className="grid gap-1.5 border-b border-hairline py-4 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-6">
            <label
              htmlFor="announce-title"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant sm:pt-2.5"
            >
              Title
            </label>
            <div className="min-w-0">
              <input
                id="announce-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className="input-field text-[13px]"
                placeholder="Scheduled maintenance"
              />
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant/80">
                Optional — defaults to “Announcement”
              </p>
            </div>
          </div>

          <div className="grid gap-1.5 border-b border-hairline py-4 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-6">
            <label
              htmlFor="announce-message"
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant sm:pt-2.5"
            >
              Message
            </label>
            <div className="min-w-0">
              <textarea
                id="announce-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                className="input-field resize-y text-[13px]"
                placeholder="What should every API user know?"
              />
              <p className="mt-1.5 text-right font-mono text-[10px] tabular-nums text-on-surface-variant/70">
                {message.length}/2000
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            type="submit"
            disabled={sending || message.trim() === ''}
            className="btn-primary w-full"
          >
            {sending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-[1px] border border-on-primary/40 border-t-on-primary" />
            ) : (
              <Send className="h-3 w-3" strokeWidth={1.75} />
            )}
            {sending ? 'Broadcasting…' : 'Broadcast to all users'}
          </button>
        </div>
      </form>

      <section className="overflow-hidden border border-hairline bg-surface-container-low">
        <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
          <h2 className="font-brand text-title-md uppercase tracking-[0.06em] text-on-surface">Live announcements</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
            {items.length} total
          </span>
        </header>
        {loading ? (
          <div className="space-y-1.5 p-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-skeleton bg-surface-container-high" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-3">
            <EmptyRow
              icon={<BellRing className="h-5 w-5" />}
              title="No announcements"
              body="Nothing broadcast yet — the bell is quiet everywhere."
            />
          </div>
        ) : (
          <ul>
            {items.map((n) => (
              <li key={n.id} className="border-b border-hairline px-4 py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate font-brand text-title-md uppercase tracking-[0.04em] text-on-surface">
                    {n.title}
                  </p>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/80">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-body-sm leading-snug text-on-surface-variant">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmClear && (
        <Dialog
          title="Clear all announcements"
          onClose={() => setConfirmClear(false)}
          body={
            <p className="text-body-sm text-on-surface-variant">
              Every user&apos;s bell goes quiet. This cannot be undone.
            </p>
          }
          actions={
            <>
              <button type="button" onClick={() => setConfirmClear(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={() => void clearAll()}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-button bg-error px-4 font-mono text-[11px] uppercase tracking-[0.08em] text-on-error transition-colors duration-fast hover:bg-error/90 disabled:pointer-events-none disabled:opacity-[0.38]"
              >
                {clearing ? 'Clearing…' : 'Clear all'}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
