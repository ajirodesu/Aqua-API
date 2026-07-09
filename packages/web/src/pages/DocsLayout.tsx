import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useAppData } from '../lib/appData';

export function DocsLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { loading, error } = useAppData();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar onMenuClick={() => setDrawerOpen((o) => !o)} />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-white/[.02] lg:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-up"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="glass absolute inset-y-0 left-0 w-[85%] max-w-xs shadow-ios-lg">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-aqua-500 border-t-transparent" />
                <p className="text-sm text-slate-400">Loading endpoints…</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-rose-500">Couldn't load the API catalog: {error}</p>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
