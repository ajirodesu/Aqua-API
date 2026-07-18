import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useAppData } from '../lib/appData';
import { useScrolled } from '../lib/useScrolled';

export function DocsLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const location = useLocation();
  const { loading, error } = useAppData();
  const mainRef = useRef<HTMLElement>(null);
  const scrolled = useScrolled(mainRef);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Jump the page back to the top on every navigation (e.g. docs overview ->
  // an endpoint page). Below lg the document itself is what scrolls (see the
  // layout note below), so reset both window scroll and the content pane's
  // own scrollTop — only one of the two is ever actually active at a given
  // breakpoint, so resetting both is harmless. Both are plain, instant
  // resets — not animated/smooth scrolls — since scroll-behavior isn't set
  // (and isn't inherited) here, only on <html> for in-page anchors.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
    } else if (drawerMounted) {
      const t = setTimeout(() => setDrawerMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [drawerOpen, drawerMounted]);

  // Lock background scroll while the mobile drawer is open. Needed now that
  // the page scrolls natively below lg — previously the app-shell's own
  // overflow-hidden made this a non-issue at every breakpoint.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    // Below lg: normal document flow (min-height only) so the page itself
    // scrolls and the mobile browser's own chrome — the URL bar, Brave's
    // bottom toolbar, etc. — can collapse on scroll the way it does on any
    // ordinary page, for a fuller-screen feel. At lg+ this becomes the
    // fixed-height, two-pane app shell (sidebar + independently-scrolling
    // content), which is the right pattern once there's no browser chrome
    // to worry about collapsing.
    <div className="flex min-h-[100dvh] flex-col bg-surface lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      {/* Desktop sidebar: its own full-height column with the search bar as
          its header, sitting at the same top level as — not nested under —
          the TopBar. Mobile uses the slide-in drawer below instead. */}
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-white/[.02] lg:block xl:w-80">
        <Sidebar />
      </aside>

      <div className="relative flex flex-1 flex-col lg:overflow-hidden">
        <TopBar onMenuClick={() => setDrawerOpen((o) => !o)} scrolled={scrolled} />

        <div className="relative lg:flex lg:flex-1 lg:overflow-hidden">
          {/* Mobile drawer — position: fixed, so it's unaffected by whether
              the document or an inner pane owns scrolling. */}
          {drawerMounted && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-ios ${
                  drawerOpen ? 'opacity-100' : 'opacity-0'
                }`}
                onClick={() => setDrawerOpen(false)}
              />
              <div
                className={`glass absolute inset-y-0 left-0 w-[85%] max-w-xs shadow-ios-lg transition-transform duration-300 ease-ios ${
                  drawerOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                <Sidebar onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          )}

          <main ref={mainRef} className="lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
            {loading ? (
              <div className="flex min-h-[60dvh] items-center justify-center lg:h-full lg:min-h-0">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-aqua-500 border-t-transparent" />
                  <p className="text-sm text-slate-400">Loading endpoints…</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex min-h-[60dvh] items-center justify-center px-6 text-center lg:h-full lg:min-h-0">
                <p className="text-sm text-rose-400">Couldn't load the API catalog: {error}</p>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl px-5 py-8 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:px-8 xl:max-w-5xl xl:px-10 2xl:max-w-6xl">
                <Outlet />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}