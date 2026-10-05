/**
 * Admin logs — live SSE stream with level/source filters.
 * By AjiroDesu.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Search } from 'lucide-react';
import { adminRequest, adminStreamUrl, AdminApiError } from '../../lib/adminApi';
import type { LogLevel, RequestLogEntry } from '../../lib/adminTypes';
import { Alert, EmptyRow } from '../../components/AdminUI';

const MAX_ROWS = 200;

function levelTone(level: LogLevel): string {
  if (level === 'error') return 'border-error/20 bg-error/15 text-error';
  if (level === 'warn') return 'border-warning/20 bg-warning/15 text-warning';
  return 'border-primary/20 bg-primary/15 text-primary';
}

function formatTime(ts: number): string {
  return new Date(ts).toISOString().slice(11, 19);
}

export function AdminLogs() {
  const [entries, setEntries] = useState<RequestLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<'' | LogLevel>('');
  const [source, setSource] = useState('');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState(true);
  const [paused, setPaused] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: '100' });
      if (level !== '') qs.set('level', level);
      if (source !== '') qs.set('source', source);
      const res = await adminRequest<{ items: RequestLogEntry[]; total: number }>(`/api/admin/logs?${qs}`);
      setEntries(res.items);
      setExhausted(res.items.length === 0);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [level, source]);

  useEffect(() => {
    setEntries([]);
    setExhausted(false);
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!live || paused) {
      return;
    }
    const es = new EventSource(adminStreamUrl('/api/admin/logs/stream'));
    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const entry = JSON.parse(e.data) as RequestLogEntry;
        if (typeof entry.id !== 'number') return;
        setEntries((prev) => {
          if (prev.some((p) => p.id === entry.id)) return prev;
          const next = [...prev, entry];
          return next.length > MAX_ROWS ? next.slice(next.length - MAX_ROWS) : next;
        });
      } catch {
        // Ignore malformed frames and keep-alive comments.
      }
    };
    return () => {
      es.close();
    };
  }, [live, paused]);

  async function loadOlder() {
    if (entries.length === 0 || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const oldest = Math.min(...entries.map((e) => e.id));
      const qs = new URLSearchParams({ limit: '100', before: String(oldest) });
      if (level !== '') qs.set('level', level);
      if (source !== '') qs.set('source', source);
      const res = await adminRequest<{ items: RequestLogEntry[]; total: number }>(`/api/admin/logs?${qs}`);
      if (res.items.length === 0) {
        setExhausted(true);
      } else {
        setEntries((prev) => [...res.items, ...prev].slice(-MAX_ROWS));
      }
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Failed to load older logs');
    } finally {
      setLoadingOlder(false);
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered =
      q === ''
        ? entries
        : entries.filter(
            (e) => e.path.toLowerCase().includes(q) || e.method.toLowerCase().includes(q)
          );
    return [...filtered].reverse();
  }, [entries, search]);

  return (
    <div className="flex animate-fade-in-up flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="btn-secondary h-10 rounded-lg !px-4 text-[13px]"
          aria-pressed={paused}
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => setLive((v) => !v)}
          className={live ? 'btn-primary h-10 rounded-lg !px-4 text-[13px]' : 'btn-secondary h-10 rounded-lg !px-4 text-[13px]'}
          aria-pressed={live}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${live && !paused ? 'bg-on-primary' : 'bg-surface-variant'}`} />
          Live
        </button>
      </div>

      {error && <Alert tone="error" title="Something went wrong" message={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by path or method…"
            aria-label="Filter logs"
            type="search"
            className="input-field min-w-0 !py-2 !pl-9 !pr-3 text-[13px] [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        <select value={level} onChange={(e) => setLevel(e.target.value as '' | LogLevel)} aria-label="Filter by level" className="input-field w-auto !py-2 text-[13px]">
          <option value="">All levels</option>
          <option value="info">info</option>
          <option value="warn">warn</option>
          <option value="error">error</option>
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source" className="input-field w-auto !py-2 text-[13px]">
          <option value="">All sources</option>
          <option value="api">api</option>
          <option value="admin">admin</option>
          <option value="web">web</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-hairline bg-surface-container-lowest">
        {loading ? (
          <div className="space-y-1.5 p-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-skeleton rounded-input bg-surface-container-high" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="p-3">
            <EmptyRow icon={<Search className="h-5 w-5" />} title="No log entries" body="Traffic will appear here as requests arrive." />
          </div>
        ) : (
          <ul className="max-h-[560px] divide-y divide-outline-variant overflow-y-auto p-2">
            {visible.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-input px-2 py-1.5 font-mono text-xs">
                <span className="shrink-0 text-surface-variant">{formatTime(e.timestamp)}</span>
                <span className={`shrink-0 rounded-badge border px-1.5 py-0.5 font-semibold ${levelTone(e.level)}`}>
                  {e.status}
                </span>
                <span className="shrink-0 text-primary">{e.method}</span>
                <span className="min-w-0 flex-1 truncate text-on-surface">{e.path}</span>
                <span className="shrink-0 text-surface-variant">{e.durationMs}ms</span>
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>
        )}
      </div>

      {!loading && !exhausted && entries.length > 0 && (
        <button type="button" onClick={() => void loadOlder()} disabled={loadingOlder} className="btn-secondary h-10 self-center rounded-lg text-[13px] disabled:opacity-[0.38]">
          {loadingOlder ? 'Loading…' : 'Load older'}
        </button>
      )}
    </div>
  );
}
