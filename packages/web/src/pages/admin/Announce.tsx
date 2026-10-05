/**
 * Admin announcements — broadcast a notification to all API users.
 * By AjiroDesu. Posts land in every user's notification bell instantly.
 */

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Megaphone, Send, Trash2 } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { AdminNotification } from '../../lib/adminTypes';
import { Alert, Dialog, EmptyRow, SectionHeader, SuccessNote } from '../../components/AdminUI';

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
        title="Announce"
        hint="Broadcast a notification to every API user — it appears in their bell instantly."
        right={
          items.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="btn-secondary h-10 rounded-lg !px-4 text-[13px]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          ) : undefined
        }
      />

      {error && <Alert tone="error" title="Something went wrong" message={error} />}
      {notice && <SuccessNote message={notice} />}

      <form
        className="rounded-xl border border-hairline bg-surface-container-low p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-on-surface">
          <Megaphone className="h-4 w-4 text-primary" />
          New announcement
        </h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="announce-title">
              Title <span className="font-normal text-surface-variant">(optional, defaults to “Announcement”)</span>
            </label>
            <input
              id="announce-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="input-field text-[13px]"
              placeholder="Scheduled maintenance"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-on-surface" htmlFor="announce-message">
              Message
            </label>
            <textarea
              id="announce-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              className="input-field resize-y text-[13px]"
              placeholder="What should every API user know?"
            />
          </div>
          <button type="submit" disabled={sending || message.trim() === ''} className="btn-primary h-11 w-full rounded-lg text-[13px] disabled:opacity-[0.38]">
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sending ? 'Broadcasting…' : 'Broadcast to all users'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-hairline bg-surface-container-low">
        <header className="border-b border-outline-variant px-4 py-3">
          <h2 className="text-[13px] font-semibold text-on-surface">
            Live announcements
            <span className="ml-2 font-mono text-[11px] font-normal text-on-surface-variant">{items.length}</span>
          </h2>
        </header>
        {loading ? (
          <div className="space-y-1.5 p-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-skeleton rounded-input bg-surface-container-high" />
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
          <ul className="divide-y divide-outline-variant">
            {items.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-on-surface">{n.title}</p>
                  <span className="shrink-0 text-[11px] text-on-surface-variant">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-on-surface-variant">{n.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmClear && (
        <Dialog
          title="Clear all announcements"
          onClose={() => setConfirmClear(false)}
          body={<p className="text-[13px] text-on-surface-variant">Every user&apos;s bell goes quiet. This cannot be undone.</p>}
          actions={
            <>
              <button type="button" onClick={() => setConfirmClear(false)} className="btn-secondary h-10 rounded-lg text-[13px]">
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={() => void clearAll()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-button bg-error px-4 text-[13px] font-semibold text-on-error transition-all duration-fast hover:brightness-110 active:scale-[0.98] disabled:opacity-[0.38]"
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
