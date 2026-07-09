import { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ChevronDown, LayoutGrid, Search } from 'lucide-react';
import { useAppData, slugify } from '../lib/appData';
import { MethodBadge } from './MethodBadge';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { buckets, totalEndpoints } = useAppData();
  const { category: activeCategory } = useParams();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Whenever the active route's category changes, force that category open
  // so the currently-open endpoint is always visible in the sidebar.
  useEffect(() => {
    if (!activeCategory) return;
    const bucket = buckets.find((b) => slugify(b.name) === activeCategory);
    if (!bucket) return;
    setCollapsed((prev) => (prev[bucket.name] === false ? prev : { ...prev, [bucket.name]: false }));
  }, [activeCategory, buckets]);

  const filtered = useMemo(() => {
    if (!query.trim()) return buckets;
    const q = query.toLowerCase();
    return buckets
      .map((b) => ({
        ...b,
        items: b.items.filter(
          (i) => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
        ),
      }))
      .filter((b) => b.items.length > 0);
  }, [buckets, query]);

  return (
    <nav className="flex h-full flex-col" aria-label="API categories">
      <div className="px-4 pb-3 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Search APIs…"
            className="input-field !py-2 pl-9 text-[13px]"
            aria-label="Search endpoints"
          />
        </div>
      </div>

      <NavLink
        to="/docs"
        end
        onClick={onNavigate}
        className={({ isActive }) =>
          `mx-3 mb-2 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200 ${
            isActive ? 'bg-aqua-500/12 text-aqua-300' : 'text-slate-300 hover:bg-white/5'
          }`
        }
      >
        <LayoutGrid className="h-4 w-4" strokeWidth={2.2} />
        Overview
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-slate-400">
          {totalEndpoints}
        </span>
      </NavLink>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        {filtered.map((bucket) => {
          const isCollapsed = query.trim() ? false : collapsed[bucket.name] ?? true;
          return (
            <div key={bucket.name} className="mb-1">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [bucket.name]: !isCollapsed }))}
                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ease-ios ${isCollapsed ? '-rotate-90' : ''}`}
                />
                {bucket.name}
                <span className="ml-auto font-mono text-[10px] font-medium normal-case tracking-normal text-slate-500/80">
                  {bucket.items.length}
                </span>
              </button>

              {!isCollapsed && (
                <ul className="mt-0.5 animate-fade-up space-y-0.5 pb-2">
                  {bucket.items.map((item) => {
                    const catSlug = slugify(bucket.name);
                    const nameSlug = slugify(item.name);
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={`/docs/${catSlug}/${nameSlug}`}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `group flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors duration-200 ${
                              isActive ? 'bg-aqua-500/10 font-semibold text-aqua-300' : 'text-slate-300 hover:bg-white/5'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 ${
                                  isActive ? 'bg-aqua-500' : 'bg-transparent'
                                }`}
                              />
                              <span className="truncate">{item.name}</span>
                              <span className="ml-auto opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                <MethodBadge method={item.methods[0]} />
                              </span>
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
            <Search className="h-5 w-5 text-slate-600" />
            <p className="text-sm text-slate-500">No results found.</p>
          </div>
        )}
      </div>
    </nav>
  );
}
