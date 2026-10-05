/**
 * Admin endpoint management — enable/disable toggles per API route.
 * By AjiroDesu. Disabled routes answer 404 until re-enabled.
 */

import { useEffect, useMemo, useState } from 'react';
import { Power, Search } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { AdminEndpointBucket } from '../../lib/adminTypes';
import { Alert, EmptyRow, SectionHeader, SuccessNote, Switch } from '../../components/AdminUI';

export function AdminEndpoints() {
  const [buckets, setBuckets] = useState<AdminEndpointBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminRequest<{ buckets: AdminEndpointBucket[] }>('/api/admin/endpoints');
        if (!cancelled) setBuckets(res.buckets);
      } catch (err) {
        if (!cancelled) setError(err instanceof AdminApiError ? err.message : 'Failed to load endpoints');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const all = buckets.flatMap((b) => b.items);
    return { total: all.length, enabled: all.filter((i) => i.enabled).length };
  }, [buckets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === '') return buckets;
    return buckets
      .map((b) => ({
        ...b,
        items: b.items.filter((i) => i.name.toLowerCase().includes(q) || i.path.toLowerCase().includes(q)),
      }))
      .filter((b) => b.items.length > 0);
  }, [buckets, search]);

  async function toggle(path: string, enabled: boolean) {
    setToggling(path);
    setNotice(null);
    const prev = buckets;
    setBuckets((b) =>
      b.map((bucket) => ({
        ...bucket,
        items: bucket.items.map((i) => (i.path === path ? { ...i, enabled } : i)),
      }))
    );
    try {
      await adminRequest('/api/admin/endpoints', { method: 'PATCH', body: { path, enabled } });
      setNotice(enabled ? `${path} enabled` : `${path} disabled`);
    } catch (err) {
      setBuckets(prev);
      setError(err instanceof AdminApiError ? err.message : 'Toggle failed');
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="flex animate-fade-in-up flex-col gap-4">
      <SectionHeader
        title="Endpoints"
        hint={`${counts.enabled} of ${counts.total} enabled — disabled routes answer 404.`}
      />

      {error && <Alert tone="error" title="Something went wrong" message={error} />}
      {notice && <SuccessNote message={notice} />}

      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter endpoints…"
          aria-label="Filter endpoints"
          type="search"
          className="input-field min-w-0 !py-2 !pl-9 !pr-3 text-[13px] [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[120px] animate-skeleton rounded-xl border border-hairline bg-surface-container-low" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyRow
          icon={<Power className="h-5 w-5" />}
          title="No endpoints found"
          body={search ? 'Nothing matches this filter.' : 'The API catalog is empty.'}
        />
      ) : (
        filtered.map((bucket) => (
          <section key={bucket.name} className="overflow-hidden rounded-xl border border-hairline bg-surface-container-low">
            <header className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-surface-variant">
                {bucket.name}
              </h2>
              <span className="font-mono text-[11px] text-on-surface-variant">
                {bucket.items.filter((i) => i.enabled).length}/{bucket.items.length} on
              </span>
            </header>
            <ul className="divide-y divide-outline-variant">
              {bucket.items.map((item) => (
                <li key={item.path} className="flex items-center gap-3 px-4 py-3">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.enabled ? 'bg-success' : 'bg-surface-variant'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold capitalize text-on-surface">{item.name}</p>
                    <p className="truncate font-mono text-xs text-surface-variant">{item.path}</p>
                  </div>
                  <span className="hidden shrink-0 gap-1 sm:flex">
                    {item.methods.map((m) => (
                      <span key={m} className="rounded-badge border border-hairline bg-surface-container-high px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
                        {m}
                      </span>
                    ))}
                  </span>
                  <Switch
                    checked={item.enabled}
                    disabled={toggling === item.path}
                    label={`${item.enabled ? 'Disable' : 'Enable'} ${item.name}`}
                    onChange={(next) => void toggle(item.path, next)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
