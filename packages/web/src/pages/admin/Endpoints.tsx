/**
 * Admin endpoint management — enable/disable toggles per API route.
 * By AjiroDesu. Disabled routes answer 404 until re-enabled.
 */

import { useEffect, useMemo, useState } from 'react';
import { Power, Search } from 'lucide-react';
import { adminRequest, AdminApiError } from '../../lib/adminApi';
import type { AdminEndpointBucket } from '../../lib/adminTypes';
import { Alert, EmptyRow, SectionHeader, SuccessNote, Switch } from '../../components/AdminUI';
import { cn } from '../../lib/cn';

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

  const allItems = buckets.flatMap((b) => b.items);
  const enabledCount = allItems.filter((i) => i.enabled).length;

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
        title="Endpoint registry"
        hint="Disable a route to make it answer 404 until re-enabled. Changes apply immediately."
        right={
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
            {loading ? '—' : `${enabledCount}/${allItems.length} ON`}
          </span>
        }
      />

      {error && <Alert tone="error" title="Something went wrong" message={error} />}
      {notice && <SuccessNote message={notice} />}

      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.75} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter endpoints by name or path…"
          aria-label="Filter endpoints"
          type="search"
          className="input-field min-w-0 !py-2 !pl-9 !pr-3 text-[13px] [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-[120px] animate-skeleton border border-hairline bg-surface-container-low" />
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
          <section key={bucket.name} className="overflow-hidden border border-hairline bg-surface-container-low">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-surface-container-high px-4 py-2.5">
              <h2 className="min-w-0 truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-on-surface">
                {bucket.name}
              </h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">
                {bucket.items.filter((i) => i.enabled).length}/{bucket.items.length} ON
              </span>
            </header>
            <ul>
              {bucket.items.map((item) => (
                <li key={item.path} className="flex items-center gap-3 border-b border-hairline px-4 py-3 last:border-b-0">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-[1px]',
                      item.enabled ? 'bg-success' : 'bg-on-surface-variant/40'
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-brand text-title-md uppercase tracking-[0.04em] text-on-surface">
                      {item.name}
                    </p>
                    <p className="truncate font-mono text-[10px] tracking-[0.02em] text-on-surface-variant/80">{item.path}</p>
                  </div>
                  <span className="hidden shrink-0 gap-1 sm:flex">
                    {item.methods.map((m) => (
                      <span
                        key={m}
                        className="rounded-badge border border-hairline bg-surface-container-high px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-on-surface-variant"
                      >
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
