/**
 * Admin shell — sidebar + sticky header + outlet, modeled on Persian-Bot's
 * AdminSidebarLayout. Desktop sidebar, mobile off-canvas drawer, avatar
 * menu with logout. No theme toggle: admin is dark-mode only.
 * By AjiroDesu.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ScrollText,
  Settings,
  X,
  Menu,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const NAV_ITEMS = [
  { to: '/admin/dashboard', end: true, label: 'Overview', Icon: LayoutDashboard },
  { to: '/admin/dashboard/stats', end: false, label: 'Stats', Icon: BarChart3 },
  { to: '/admin/dashboard/endpoints', end: false, label: 'Endpoints', Icon: Bot },
  { to: '/admin/dashboard/logs', end: false, label: 'Logs', Icon: ScrollText },
  { to: '/admin/dashboard/announce', end: false, label: 'Announce', Icon: Megaphone },
  { to: '/admin/dashboard/settings', end: false, label: 'Settings', Icon: Settings },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  return (
    <nav className="flex h-full flex-col" aria-label="Admin navigation">
      <div className="flex h-14 shrink-0 items-center border-b border-hairline px-6">
        <Link
          to="/admin/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 text-on-surface transition-opacity duration-fast hover:opacity-75"
        >
          <span className="text-[17px] font-semibold leading-none tracking-tight">Aqua Admin</span>
        </Link>
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
        {NAV_ITEMS.map(({ to, end, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `tactile-press flex h-11 items-center gap-3 rounded-input border px-3 text-sm transition-colors duration-fast ${
                isActive
                  ? 'border-primary/20 bg-primary/10 font-semibold text-primary'
                  : 'border-transparent font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="border-t border-hairline p-3">
        <Link
          to="/docs"
          onClick={onNavigate}
          className="tactile-press flex h-11 items-center gap-3 rounded-input border border-transparent px-3 text-sm font-medium text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
        >
          <ScrollText className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="truncate">Public docs</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/admin');
            onNavigate?.();
          }}
          className="tactile-press mt-1 flex h-11 w-full items-center gap-3 rounded-input border border-transparent px-3 text-sm font-medium text-error transition-colors duration-fast hover:bg-error/10"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="truncate">Log out</span>
        </button>
        <p className="flex items-center gap-2 px-2 pt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-surface-variant">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Admin Panel
        </p>
      </div>
    </nav>
  );
}

const TITLES: Record<string, string> = {
  '/admin/dashboard': 'Overview',
  '/admin/dashboard/stats': 'Stats',
  '/admin/dashboard/endpoints': 'Endpoints',
  '/admin/dashboard/logs': 'Logs',
  '/admin/dashboard/announce': 'Announce',
  '/admin/dashboard/settings': 'Settings',
};

export function AdminSidebarLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(useLocation().pathname);
  const location = useLocation();
  const { username, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setMobileOpen(false);
    setMenuOpen(false);
  }

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

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const initials = (username ?? 'A').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      <aside className="glass-surface sticky top-0 hidden h-screen w-[var(--layout-sidebar-w)] shrink-0 flex-col overflow-y-hidden border-r border-hairline md:flex">
        <SidebarNav />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-drawer bg-scrim/50 md:hidden [backdrop-filter:var(--surface-blur-sm)]"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`glass-surface fixed inset-y-0 left-0 z-modal flex w-[85%] max-w-xs flex-col border-r border-hairline transition-transform duration-normal ease-standard md:hidden ${
          mobileOpen ? 'translate-x-0 shadow-elevation-4' : '-translate-x-full'
        }`}
        aria-label="Admin navigation"
        aria-modal={mobileOpen}
      >
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:overflow-hidden">
        <header className="sticky top-0 z-sticky flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface-container-low px-5">
          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface md:hidden"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="hidden truncate px-1 text-base font-semibold tracking-tight md:inline">
            {TITLES[location.pathname] ?? 'Admin'}
          </span>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center md:hidden">
            <span className="truncate px-14 text-base font-semibold tracking-tight">
              {TITLES[location.pathname] ?? 'Admin'}
            </span>
          </div>

          <div className="relative z-10 ml-auto" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex h-9 items-center gap-1.5 rounded-input px-2 transition-colors duration-fast hover:bg-surface-container-high"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                {initials}
              </span>
              <ChevronDown className={`hidden h-4 w-4 text-on-surface-variant md:block ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-dropdown mt-1.5 min-w-[210px] animate-fade-in-down overflow-hidden rounded-input border border-hairline bg-surface-container-low py-1 shadow-elevation-3"
              >
                <div className="border-b border-hairline px-3.5 py-3">
                  <p className="truncate text-sm font-semibold text-on-surface">{username ?? 'Admin'}</p>
                  <p className="truncate text-xs text-on-surface-variant">Administrator</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    logout();
                    navigate('/admin');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-error transition-colors duration-fast hover:bg-error/10"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:overflow-y-auto lg:overscroll-contain">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
