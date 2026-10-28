import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Github, Send } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { BrandIcon } from '../components/BrandIcon';
import { TopBar } from '../components/TopBar';
import { PageLoader } from '../components/PageLoader';
import { useAppData, slugify } from '../lib/appData';
import { H_BRAND_TEXT, H_SHELL_SCOPE, H_STATUS_SQUARE } from '../lib/shell';
import { cn } from '../lib/cn';

const COLLAPSED_STORAGE_KEY = 'aqua-sidebar:collapsed:v1';
const COLLAPSED_SIDEBAR_W = 'w-[4.75rem]';

export function DocsLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);
  const { loading, error, config, buckets, totalEndpoints } = useAppData();
  const mainRef = useRef<HTMLElement>(null);
  const year = new Date().getFullYear();

  // Desktop only: collapse the sidebar to a printed icon rail.
  // Persisted across refreshes.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage failures (private mode / quota).
      }
      return next;
    });
  }, []);

  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const name = config?.name ?? 'Aqua APIs';
  const status = config?.header.status ?? 'Online';
  const linkCategories = buckets.slice(0, 3);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      {/* Desktop rail — permanent ledger, collapses to an icon rail, hidden
          below md where the off-canvas drawer takes over. */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-hidden border-r border-hairline bg-surface-container-low transition-[width] duration-normal md:flex',
          collapsed ? COLLAPSED_SIDEBAR_W : 'w-[var(--layout-sidebar-w)]'
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile scrim — flat ink, no blur */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-drawer bg-scrim/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile off-canvas drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-modal flex w-[var(--layout-sidebar-w)] flex-col border-r border-hairline bg-surface-container-low transition-transform duration-normal md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="API navigation"
        aria-modal={mobileOpen}
        aria-hidden={!mobileOpen}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main content column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setMobileOpen((p) => !p)} menuOpen={mobileOpen} />

        <main ref={mainRef} className="min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {loading ? (
            <div className="flex min-h-[60dvh] items-center justify-center lg:h-full lg:min-h-0">
              <PageLoader label="Loading endpoints…" />
            </div>
          ) : error ? (
            <div className="mx-auto flex min-h-[60dvh] w-full max-w-[var(--layout-content-max)] items-center justify-center px-[var(--layout-main-p)] lg:h-full lg:min-h-0">
              <div className="w-full max-w-sm border border-error/30 bg-error-container/40 px-4 py-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-error">ERROR / CATALOG</p>
                <p className="mt-2 font-brand text-headline-sm uppercase text-on-surface">Could not load the API catalog</p>
                <p className="mt-1 text-body-sm text-on-surface-variant">{error}</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[var(--layout-content-max)] px-[var(--layout-main-p)] py-6 md:py-8">
              <Outlet />
            </div>
          )}

          {/* Colophon — end of the document, scrolls with the page. */}
          <footer className="border-t border-hairline">
            <div className="mx-auto w-full max-w-[var(--layout-content-max)] px-[var(--layout-main-p)] py-10">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BrandIcon className="h-4 w-4 rounded-[2px] object-contain opacity-80" />
                    <span className={cn(H_BRAND_TEXT, 'text-on-surface')}>AQUA</span>
                  </div>
                  <p className="mt-3 max-w-xs text-body-sm text-on-surface-variant">
                    {config?.description ?? 'An interactive API platform for endpoint exploration and real-time testing.'}
                  </p>
                  <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant/85">
                    <span className={cn(H_STATUS_SQUARE, 'bg-success')} aria-hidden="true" />
                    {status} · {totalEndpoints} endpoints
                  </p>
                </div>

                <div>
                  <h2 className="rule-label">REFERENCE</h2>
                  <ul className="mt-3 space-y-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-on-surface-variant">
                    <li>
                      <Link to="/docs" className="transition-colors hover:text-on-surface">
                        Overview
                      </Link>
                    </li>
                    {linkCategories.map((bucket) => {
                      const first = bucket.items[0];
                      return (
                        <li key={bucket.name}>
                          <Link
                            to={first ? `/docs/${slugify(bucket.name)}/${slugify(first.name)}` : '/docs'}
                            className="transition-colors hover:text-on-surface"
                          >
                            {bucket.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <h2 className="rule-label">CONNECT</h2>
                  <ul className="mt-3 space-y-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-on-surface-variant">
                    {config?.telegram && (
                      <li>
                        <a
                          href={config.telegram}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 transition-colors hover:text-on-surface"
                        >
                          <Send className="h-3 w-3" strokeWidth={1.75} />
                          Telegram
                        </a>
                      </li>
                    )}
                    {config?.github && (
                      <li>
                        <a
                          href={config.github}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 transition-colors hover:text-on-surface"
                        >
                          <Github className="h-3 w-3" strokeWidth={1.75} />
                          GitHub
                        </a>
                      </li>
                    )}
                    <li>
                      <Link to="/docs/tools/ipcheck" className="transition-colors hover:text-on-surface">
                        IP checker
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-10 flex items-center justify-between gap-3 border-t border-hairline pt-4">
                <span className={H_SHELL_SCOPE}>© {year} {name}</span>
                <span className={cn(H_SHELL_SCOPE, 'text-right')}>
                  BUILT BY {config?.operator ?? 'AjiroDesu'}
                </span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
