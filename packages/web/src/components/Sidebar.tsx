import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  ChevronDown,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
} from 'lucide-react';
import { useAppData, slugify } from '../lib/appData';
import { BrandIcon } from './BrandIcon';
import { cn } from '../lib/cn';
import {
  H_BRAND_TEXT,
  H_MONO_LABEL,
  H_SECTION_LABEL,
  H_SEPARATOR,
  H_SHELL_SCOPE,
  H_SIDEBAR_INDEX,
  H_SIDEBAR_NAV,
  H_STATUS_SQUARE,
} from '../lib/shell';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  onNavigate?: () => void;
  /** Desktop only: when true the sidebar collapses to a printed icon rail. */
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

  // ── Collapsed icon rail (printed margin) ─────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-separator">
          <Link
            to="/docs"
            title="AQUA / Documentation"
            aria-label="Documentation home"
            className="flex items-center text-primary transition-opacity duration-fast hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <BrandIcon className="h-5 w-5 rounded-[2px] object-contain" />
          </Link>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Search routes"
            aria-label="Expand sidebar to search"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          >
            <Search className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <NavLink
            to="/docs"
            end
            title="Overview"
            aria-label="Overview"
            className={({ isActive }) =>
              cn(
                'flex h-10 w-10 items-center justify-center rounded-[var(--radius-compact)] border-l-2 transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                isActive
                  ? 'border-l-primary bg-primary/[0.06] text-primary'
                  : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              )
            }
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
          </NavLink>

          {buckets.map((bucket, index) => {
            const isActive = slugify(bucket.name) === activeCategory;
            const ordinal = String(index + 1).padStart(2, '0');
            return (
              <button
                key={bucket.name}
                type="button"
                onClick={() => expandAndOpen(bucket.name)}
                title={`${bucket.name} (${bucket.items.length})`}
                aria-label={`${bucket.name}, ${bucket.items.length} endpoints`}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-[var(--radius-compact)] border-l-2 transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                  isActive
                    ? 'border-l-primary bg-primary/[0.06] text-primary'
                    : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                )}
              >
                <span className="font-mono text-[11px] font-semibold tabular-nums tracking-[0.04em]">
                  {ordinal}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-separator py-2">
          <button
            type="button"
            onClick={() => {
              onToggleCollapsed?.();
              setSettingsOpen(true);
            }}
            title="Theme"
            aria-label="Expand sidebar to change theme"
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          >
            <Settings2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <span
            className={cn(H_STATUS_SQUARE, 'bg-success')}
            title="Online — Documentation"
            role="img"
            aria-label="Online — Documentation"
          />
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="mt-1 flex h-9 w-9 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            >
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Expanded ledger ──────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Identity row — h-14, mark + condensed wordmark + mono scope tag */}
      <div className="flex h-14 shrink-0 items-center border-b border-separator px-6">
        <Link
          to="/docs"
          onClick={onNavigate}
          aria-label="Documentation home"
          className="flex w-full min-w-0 items-center gap-2.5 text-on-surface transition-opacity duration-fast hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <BrandIcon className="h-5 w-5 shrink-0 rounded-[2px] object-contain" />
          <span className={cn(H_BRAND_TEXT, 'truncate')}>AQUA</span>
          <span className={cn(H_SHELL_SCOPE, 'ml-auto pr-1')}>/ DOCS</span>
        </Link>
      </div>

      {/* Filter row — one flat field between two rules */}
      <div className="border-b border-hairline p-3">
        <div className="relative w-full min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder="Filter routes…"
            className="input-field min-w-0 !py-1.5 !pl-9 !pr-3 text-body-sm [&::-webkit-search-cancel-button]:hidden"
            aria-label="Search endpoints"
          />
        </div>
      </div>

      {/* Block layout (not flex column): rows keep their fixed heights instead
          of shrinking when an expanded category makes the list scroll. */}
      <nav className="min-h-0 flex-1 overflow-y-auto pb-3" aria-label="API categories">
        <div className={H_SECTION_LABEL}>{query.trim() ? 'RESULTS' : 'REFERENCE'}</div>

        <NavLink
          to="/docs"
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              H_SIDEBAR_NAV,
              'w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
              isActive
                ? 'border-l-primary bg-primary/[0.06] text-on-surface'
                : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface active:bg-surface-container-highest'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={cn(H_SIDEBAR_INDEX, isActive ? 'text-primary' : 'text-on-surface-variant/85')}
              >
                00
              </span>
              <span className={cn('flex shrink-0 items-center justify-center', isActive ? 'text-primary' : 'text-on-surface-variant')}>
                <LayoutGrid className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="truncate">Overview</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums tracking-[0.06em] text-on-surface-variant/75">
                {totalEndpoints}
              </span>
            </>
          )}
        </NavLink>

        {filtered.map((bucket, index) => {
          const isCollapsed = query.trim() ? false : collapsedMap[bucket.name] ?? true;
          const isActiveBucket = slugify(bucket.name) === activeCategory;
          const ordinal = String(index + 1).padStart(2, '0');
          return (
            <div key={bucket.name}>
              <button
                type="button"
                onClick={() => setCollapsedMap((c) => ({ ...c, [bucket.name]: !isCollapsed }))}
                aria-expanded={!isCollapsed}
                className={cn(
                  H_SIDEBAR_NAV,
                  'w-full text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                  isActiveBucket
                    ? 'border-l-primary bg-primary/[0.06] text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface active:bg-surface-container-highest'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(H_SIDEBAR_INDEX, isActiveBucket ? 'text-primary' : 'text-on-surface-variant/85')}
                >
                  {ordinal}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 transition-transform duration-fast ease-standard',
                    isCollapsed ? '-rotate-90' : ''
                  )}
                />
                <span className="min-w-0 flex-1 truncate capitalize">{bucket.name}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums tracking-[0.06em] text-on-surface-variant/75">
                  {bucket.items.length}
                </span>
              </button>

              {!isCollapsed && (
                <ul className="animate-fade-in pb-1">
                  {bucket.items.map((item) => {
                    const catSlug = slugify(bucket.name);
                    const nameSlug = slugify(item.name);
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={`/docs/${catSlug}/${nameSlug}`}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            cn(
                              'flex h-9 items-center gap-2 border-l-2 pl-[1.9rem] pr-2 text-body-sm transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                              isActive
                                ? 'border-l-primary bg-primary/[0.06] text-on-surface'
                                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={cn(
                                  'w-7 shrink-0 font-mono text-[9px] uppercase tracking-[0.04em]',
                                  isActive ? 'text-primary' : 'text-on-surface-variant/75'
                                )}
                              >
                                {item.methods[0]}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
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
          <div className="mx-3 mt-2 flex flex-col items-center gap-2 border border-hairline bg-surface-container-low px-3 py-10 text-center">
            <Search className="h-4 w-4 text-on-surface-variant" strokeWidth={1.75} />
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">
              No routes match
            </p>
          </div>
        )}
      </nav>

      {/* Footer — theme control, status line, collapse toggle */}
      <div className="shrink-0 border-t border-separator">
        {settingsOpen && (
          <div className="border-b border-hairline p-3">
            <p className={cn(H_MONO_LABEL, 'mb-2')}>INTERFACE THEME</p>
            <ThemeToggle />
          </div>
        )}

        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          aria-expanded={settingsOpen}
          className={cn(
            'flex h-11 w-full items-center gap-2.5 px-4 text-left text-body-sm transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
            settingsOpen
              ? 'bg-primary/[0.06] text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
          )}
        >
          <Settings2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="truncate">Theme</span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'ml-auto h-3.5 w-3.5 shrink-0 transition-transform duration-fast ease-standard',
              settingsOpen ? '' : '-rotate-90'
            )}
          />
        </button>

        <div className="flex h-14 items-center justify-between gap-3 border-t border-separator px-6">
          <span
            className="flex min-w-0 items-center gap-2"
            title="Online — Documentation"
            role="img"
            aria-label="Online — Documentation"
          >
            <span className={cn(H_STATUS_SQUARE, 'bg-success')} aria-hidden="true" />
            <span className={cn(H_SHELL_SCOPE, 'truncate')}>DOCS</span>
          </span>

          <span className="flex flex-1 items-center gap-2">
            <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
            <span className="select-none font-mono text-[10px] uppercase tracking-[0.2em] text-success">Online</span>
            {onToggleCollapsed && (
              <button
                type="button"
                onClick={onToggleCollapsed}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              >
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
