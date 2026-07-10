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

  // Jump the content pane back to the top on every navigation (e.g. docs
  // overview -> an endpoint page). This is a plain, instant scrollTop reset
  // — not an animated/smooth scroll — since scroll-behavior isn't set (and
  // isn't inherited) on this element, only on <html> for in-page anchors.
  useEffect(() => {
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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-surface lg:flex-row">
      {/* Desktop sidebar: its own full-height column with the search bar as
          its header, sitting at the same top level as — not nested under —
          the TopBar. Mobile uses the slide-in drawer below instead. */}
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-white/[.02] lg:block xl:w-80">
        <Sidebar />
      </aside>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setDrawerOpen((o) => !o)} scrolled={scrolled} />

        <div className="relative flex flex-1 overflow-hidden">
          {/* Mobile drawer */}
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

          <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-aqua-500 border-t-transparent" />
                  <p className="text-sm text-slate-400">Loading endpoints…</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
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