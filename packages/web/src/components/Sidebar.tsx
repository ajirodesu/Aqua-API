import { useEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  ChevronDown,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
} from 'lucide-react';
import { useAppData, slugify } from '../lib/appData';
import { MethodBadge } from './MethodBadge';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  onNavigate?: () => void;
  /** Desktop only: when true the sidebar collapses to a YouTube-style icon rail. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const { buckets, totalEndpoints } = useAppData();
  const { category: activeCategory } = useParams();
  const [query, setQuery] = useState('');
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!activeCategory) return;
    const bucket = buckets.find((b) => slugify(b.name) === activeCategory);
    if (!bucket) return;
    setCollapsedMap((prev) => (prev[bucket.name] === false ? prev : { ...prev, [bucket.name]: false }));
  }, [activeCategory, buckets]);

  const filtered = useMemo(() => {
    if (!query.trim()) return buckets;
    const q = query.toLowerCase();
    return buckets
      .map((b) => ({
        ...b,
        items: b.items.filter((i) => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)),
      }))
      .filter((b) => b.items.length > 0);
  }, [buckets, query]);

  function expandAndOpen(bucketName: string) {
    onToggleCollapsed?.();
    setCollapsedMap((c) => ({ ...c, [bucketName]: false }));
  }

  // ── Collapsed icon rail (YouTube desktop style) ──────────────────────────
  if (collapsed) {
    return (
      <nav className="flex h-full flex-col" aria-label="API categories">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-hairline">
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Search APIs"
            aria-label="Expand sidebar to search"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
          >
            <Search className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto px-0 py-3">
          <NavLink
            to="/docs"
            end
            title="Overview"
            aria-label="Overview"
            className={({ isActive }) =>
              `tactile-press flex h-11 w-11 items-center justify-center rounded-input border transition-colors duration-fast ${
                isActive
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <LayoutGrid className="h-5 w-5 shrink-0" strokeWidth={2} />
          </NavLink>

          {buckets.map((bucket) => {
            const isActive = slugify(bucket.name) === activeCategory;
            return (
              <button
                key={bucket.name}
                type="button"
                onClick={() => expandAndOpen(bucket.name)}
                title={`${bucket.name} (${bucket.items.length})`}
                aria-label={`${bucket.name}, ${bucket.items.length} endpoints`}
                className={`tactile-press flex h-11 w-11 items-center justify-center rounded-input border transition-colors duration-fast ${
                  isActive
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="text-sm font-bold uppercase">{bucket.name.charAt(0)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-hairline py-3">
          <button
            type="button"
            onClick={() => {
              onToggleCollapsed?.();
              setSettingsOpen(true);
            }}
            title="Settings"
            aria-label="Open settings"
            className="flex h-11 w-11 items-center justify-center rounded-input border border-transparent text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
          >
            <Settings2 className="h-5 w-5" strokeWidth={2} />
          </button>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="flex h-11 w-11 items-center justify-center rounded-input border border-transparent text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
            >
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </nav>
    );
  }

  // ── Expanded sidebar ─────────────────────────────────────────────────────
  return (
    <nav className="flex h-full flex-col" aria-label="API categories">
      <div className="flex h-14 shrink-0 items-center border-b border-hairline px-4">
        <div className="relative w-full min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Search APIs…"
            className="input-field min-w-0 !py-1.5 !pl-9 !pr-3 text-[13px] [&::-webkit-search-cancel-button]:hidden"
            aria-label="Search endpoints"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
        <NavLink
          to="/docs"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            `tactile-press flex h-11 items-center gap-3 rounded-input border px-3 text-sm font-medium transition-colors duration-fast ${
              isActive
                ? 'border-primary/20 bg-primary/10 font-semibold text-primary'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`
          }
        >
          <LayoutGrid className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="truncate">Overview</span>
          <span className="ml-auto rounded bg-surface-container-high px-1.5 py-0.5 font-mono text-[10px] text-on-surface-variant">
            {totalEndpoints}
          </span>
        </NavLink>

        {filtered.map((bucket) => {
          const isCollapsed = query.trim() ? false : collapsedMap[bucket.name] ?? true;
          return (
            <div key={bucket.name}>
              <button
                type="button"
                onClick={() => setCollapsedMap((c) => ({ ...c, [bucket.name]: !isCollapsed }))}
                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-surface-variant transition-colors hover:text-on-surface"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-fast ease-standard ${isCollapsed ? '-rotate-90' : ''}`}
                />
                <span className="truncate">{bucket.name}</span>
                <span className="ml-auto font-mono text-[10px] font-medium normal-case tracking-normal opacity-80">
                  {bucket.items.length}
                </span>
              </button>

              {!isCollapsed && (
                <ul className="animate-fade-in space-y-0.5 pb-2">
                  {bucket.items.map((item) => {
                    const catSlug = slugify(bucket.name);
                    const nameSlug = slugify(item.name);
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={`/docs/${catSlug}/${nameSlug}`}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `tactile-press group flex items-center gap-2 rounded-input border px-3 py-2 text-[13px] transition-colors duration-fast ${
                              isActive
                                ? 'border-primary/20 bg-primary/10 font-semibold text-primary'
                                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-primary' : 'bg-surface-variant'}`}
                              />
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
                              <span className="shrink-0 opacity-0 transition-opacity duration-fast group-hover:opacity-100">
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
          <div className="flex flex-col items-center gap-2 rounded-card bg-surface-container px-3 py-12 text-center">
            <Search className="h-5 w-5 text-surface-variant" />
            <p className="text-sm text-on-surface-variant">No results found.</p>
          </div>
        )}
      </div>

      <div className="space-y-1 border-t border-hairline p-3">
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          aria-expanded={settingsOpen}
          className={`tactile-press flex h-11 w-full items-center gap-3 rounded-input border px-3 text-sm font-medium transition-colors duration-fast ${
            settingsOpen
              ? 'border-primary/20 bg-primary/10 font-semibold text-primary'
              : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
          }`}
        >
          <Settings2 className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="truncate">Settings</span>
          <ChevronDown
            className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-fast ease-standard ${
              settingsOpen ? '' : '-rotate-90'
            }`}
          />
        </button>

        {settingsOpen && (
          <div className="animate-fade-in rounded-input border border-hairline bg-surface-container-high p-3">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-surface-variant">
              Theme
            </p>
            <ThemeToggle />
          </div>
        )}

        <div className="flex items-center justify-between px-2 pt-1">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-surface-variant">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Dashboard
          </p>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
            >
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
