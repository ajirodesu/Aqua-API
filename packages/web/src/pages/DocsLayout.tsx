import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Github, Send } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { PageLoader } from '../components/PageLoader';
import { useAppData, slugify } from '../lib/appData';

const COLLAPSED_STORAGE_KEY = 'aqua-sidebar:collapsed:v1';
const COLLAPSED_SIDEBAR_W = 'w-[4.75rem]';

export function DocsLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);
  const { loading, error, config, buckets, totalEndpoints } = useAppData();
  const mainRef = useRef<HTMLElement>(null);
  const year = new Date().getFullYear();

  // Desktop only: collapse the sidebar to a YouTube-style icon rail.
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

  const popularEndpoints = buckets
    .flatMap((b) => b.items.map((i) => ({ ...i, bucketName: b.name })))
    .slice(0, 5);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      {/* Desktop sidebar — permanent, collapses to a YouTube-style icon rail,
          hidden entirely below md (mobile uses the off-canvas drawer) */}
      <aside
        className={`glass-surface hidden shrink-0 flex-col border-r border-hairline md:flex sticky top-0 h-screen overflow-y-hidden transition-[width] duration-normal ${
          collapsed ? COLLAPSED_SIDEBAR_W : 'w-[var(--layout-sidebar-w)]'
        }`}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-drawer bg-scrim/50 md:hidden [backdrop-filter:var(--surface-blur-sm)]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile off-canvas drawer */}
      <aside
        className={`glass-surface fixed inset-y-0 left-0 z-modal flex w-[85%] max-w-xs flex-col border-r border-hairline transition-transform duration-normal ease-standard md:hidden ${
          mobileOpen ? 'translate-x-0 shadow-elevation-4' : '-translate-x-full'
        }`}
        aria-label="API navigation"
        aria-modal={mobileOpen}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main content column */}
      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen((p) => !p)} />

        <main ref={mainRef} className="flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {loading ? (
            <div className="flex min-h-[60dvh] items-center justify-center lg:h-full lg:min-h-0">
              <PageLoader label="Loading endpoints…" />
            </div>
          ) : error ? (
            <div className="flex min-h-[60dvh] items-center justify-center px-6 text-center lg:h-full lg:min-h-0">
              <div className="flex max-w-sm flex-col gap-3 rounded-card border border-error/30 bg-error/10 px-4 py-3 text-left">
                <p className="text-sm font-semibold text-error">Error loading bots</p>
                <p className="text-sm text-on-surface-variant">Couldn&apos;t load the API catalog: {error}</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
              <Outlet />
            </div>
          )}

          {/* Footer — part of the scrolling content, never sticky: it sits at
              the end of the page and scrolls away like any other section. */}
          <footer className="border-t border-hairline bg-surface-container-low">
            <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-6">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
                <div>
                  <p className="text-[15px] font-semibold tracking-tight text-on-surface">
                    {config?.name ?? 'Aqua APIs'}
                  </p>
                  <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-on-surface-variant">
                    {config?.description ?? 'A fast, friendly REST API playground.'}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-success">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-success" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                    </span>
                    {config?.header.status ?? 'Online'} • {totalEndpoints} endpoints
                  </p>
                </div>

                <nav aria-label="Documentation">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-surface-variant">
                    Documentation
                  </p>
                  <ul className="mt-3 space-y-1">
                    <li>
                      <Link
                        to="/docs"
                        className="tactile-press flex h-9 items-center gap-2.5 rounded-input px-2 text-[13px] text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <BookOpen className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                        Overview
                      </Link>
                    </li>
                    {popularEndpoints.map((e) => (
                      <li key={e.path}>
                        <Link
                          to={`/docs/${slugify(e.bucketName)}/${slugify(e.name)}`}
                          className="tactile-press flex h-9 items-center gap-2.5 rounded-input px-2 text-[13px] text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-surface-variant" />
                          <span className="truncate">{e.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>

                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-surface-variant">
                    Connect
                  </p>
                  <div className="mt-3 space-y-1">
                    {config?.telegram && (
                      <a
                        href={config.telegram}
                        target="_blank"
                        rel="noreferrer"
                        className="tactile-press flex h-9 items-center gap-2.5 rounded-input px-2 text-[13px] text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <Send className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                        Telegram
                      </a>
                    )}
                    {config?.github && (
                      <a
                        href={config.github}
                        target="_blank"
                        rel="noreferrer"
                        className="tactile-press flex h-9 items-center gap-2.5 rounded-input px-2 text-[13px] text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <Github className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-outline-variant pt-6 sm:flex-row">
                <p className="text-xs text-surface-variant">
                  © {year} {config?.name ?? 'API'}. All rights reserved.
                </p>
                <p className="font-mono text-[11px] text-surface-variant">
                  Built by {config?.operator ?? 'AjiroDesu'}
                </p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
