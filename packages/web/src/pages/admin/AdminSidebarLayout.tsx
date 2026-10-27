/**
 * Admin shell — printed ledger rail + sticky scope header + outlet.
 * Desktop rail, mobile off-canvas drawer, numbered nav rows, square avatar
 * menu with logout. No theme toggle: admin follows the selected interface
 * theme exactly like the public shell. By AjiroDesu.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { cn } from '../../lib/cn';
import {
  H_AVATAR,
  H_AVATAR_TEXT,
  H_BRAND_TEXT,
  H_CHEVRON,
  H_DROPDOWN_ICON,
  H_DROPDOWN_ITEM,
  H_HEIGHT,
  H_ICON_BTN_MOBILE,
  H_PX,
  H_SECTION_LABEL,
  H_SEPARATOR,
  H_SHELL_SCOPE,
  H_SIDEBAR_INDEX,
  H_SIDEBAR_NAV,
  H_STATUS_SQUARE,
  H_SURFACE,
} from '../../lib/shell';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { to: '/admin/dashboard/stats', label: 'Stats', Icon: BarChart3 },
  { to: '/admin/dashboard/endpoints', label: 'Endpoints', Icon: Bot },
  { to: '/admin/dashboard/logs', label: 'Logs', Icon: ScrollText },
  { to: '/admin/dashboard/announce', label: 'Announce', Icon: Megaphone },
  { to: '/admin/dashboard/settings', label: 'Settings', Icon: Settings },
] as const;

const COLLAPSED_STORAGE_KEY = 'admin-sidebar:collapsed:v1';
const COLLAPSED_SIDEBAR_W = 'w-[4.75rem]';

const TITLES: Record<string, string> = {
  '/admin/dashboard': 'Overview',
  '/admin/dashboard/stats': 'Stats',
  '/admin/dashboard/endpoints': 'Endpoints',
  '/admin/dashboard/logs': 'Logs',
  '/admin/dashboard/announce': 'Announce',
  '/admin/dashboard/settings': 'Settings',
};

function NavRow({
  to,
  label,
  ordinal,
  icon,
  isActive,
  collapsed,
  onNavClick,
  onToggleCollapsed,
}: {
  to: string;
  label: string;
  ordinal: string;
  icon: React.ReactNode;
  isActive: boolean;
  collapsed?: boolean;
  onNavClick?: () => void;
  onToggleCollapsed?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={(e) => {
        if (isActive) {
          // Desktop: tapping the current page collapses the rail.
          // Mobile drawer: close instead.
          if (onToggleCollapsed) {
            e.preventDefault();
            onToggleCollapsed();
          } else {
            onNavClick?.();
          }
          return;
        }
        onNavClick?.();
      }}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        H_SIDEBAR_NAV,
        collapsed && 'justify-center !gap-0 !border-l-0 !px-0',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
        isActive
          ? 'border-l-primary bg-primary/[0.06] text-on-surface'
          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface active:bg-surface-container-highest'
      )}
    >
      {!collapsed && (
        <span
          aria-hidden="true"
          className={cn(H_SIDEBAR_INDEX, isActive ? 'text-primary' : 'text-on-surface-variant/85')}
        >
          {ordinal}
        </span>
      )}
      <span
        className={cn(
          'flex shrink-0 items-center justify-center',
          isActive ? 'text-primary' : 'text-on-surface-variant'
        )}
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function SidebarNav({
  activePath,
  onNavigate,
  collapsed,
  onToggleCollapsed,
}: {
  activePath: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Identity row — h-14, mark + wordmark + mono scope tag */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-separator px-6',
          collapsed && 'justify-center px-0'
        )}
      >
        <Link
          to="/admin/dashboard"
          onClick={() => {
            onNavigate?.();
            if (collapsed) onToggleCollapsed?.();
          }}
          title={collapsed ? 'AQUA Admin' : undefined}
          className={cn(
            'flex min-w-0 items-center gap-2.5 text-on-surface transition-opacity duration-fast hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            !collapsed && 'w-full'
          )}
        >
          <img src="/icon.png" alt="" className="h-5 w-5 shrink-0 rounded-[2px] object-contain" />
          {!collapsed && (
            <>
              <span className={cn(H_BRAND_TEXT, 'truncate')}>AQUA</span>
              <span className={cn(H_SHELL_SCOPE, 'ml-auto pr-1')}>/ ADMIN</span>
            </>
          )}
        </Link>
      </div>

      {/* Primary nav — one ledger under a single rule label */}
      <nav
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto',
          collapsed ? 'items-center gap-1 py-3' : 'pb-3'
        )}
        aria-label="Admin navigation"
      >
        {!collapsed && <div className={H_SECTION_LABEL}>ADMIN</div>}

        {NAV_ITEMS.map(({ to, label, Icon }, index) => (
          <NavRow
            key={to}
            to={to}
            label={label}
            ordinal={String(index + 1).padStart(2, '0')}
            icon={<Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />}
            isActive={activePath === to}
            collapsed={collapsed}
            onNavClick={onNavigate}
            onToggleCollapsed={onToggleCollapsed}
          />
        ))}
      </nav>

      {/* Footer — public exit, live status, ADMIN scope, collapse toggle */}
      <div className="shrink-0 border-t border-separator">
        <Link
          to="/docs"
          onClick={onNavigate}
          title={collapsed ? 'Public docs' : undefined}
          className={cn(
            'flex h-11 w-full items-center gap-2.5 text-body-sm text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
            collapsed ? 'justify-center px-0' : 'px-4'
          )}
        >
          <BookOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          {!collapsed && <span className="truncate">Public docs</span>}
        </Link>

        <div
          className={cn(
            'flex h-14 items-center justify-between gap-3 border-t border-separator',
            collapsed ? 'flex-col justify-center gap-1.5 px-0' : 'px-6'
          )}
        >
          <span
            className="flex min-w-0 items-center gap-2"
            title="Online — Admin Panel"
            role="img"
            aria-label="Online — Admin Panel"
          >
            <span className={cn(H_STATUS_SQUARE, 'bg-success')} aria-hidden="true" />
            {!collapsed && <span className={cn(H_SHELL_SCOPE, 'truncate')}>ADMIN</span>}
          </span>

          {(!collapsed || onToggleCollapsed) && (
            <span className={cn('flex items-center gap-2', collapsed ? 'shrink-0' : 'flex-1')}>
              {!collapsed && (
                <>
                  <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
                  <span className="select-none font-mono text-[10px] uppercase tracking-[0.2em] text-success">
                    Online
                  </span>
                </>
              )}
              {onToggleCollapsed && (
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  {collapsed ? (
                    <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminAvatarMenu({ username, onLogout }: { username: string | null; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const displayName = username ?? 'Admin';
  const initials = displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'AD';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${displayName} — account menu`}
        className={cn(
          'flex items-center gap-1.5 rounded-[var(--radius-input)] transition-colors duration-fast hover:bg-on-surface/[var(--state-hover-opacity)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'h-9 w-9 justify-center md:h-auto md:w-auto md:justify-start md:px-2 md:py-1.5',
          open && 'bg-on-surface/[var(--state-hover-opacity)]'
        )}
      >
        <span
          className={cn(
            'flex shrink-0 select-none items-center justify-center rounded-[var(--radius-compact)] border border-primary/50 bg-primary text-on-primary',
            H_AVATAR,
            H_AVATAR_TEXT
          )}
        >
          {initials}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            H_CHEVRON,
            'hidden text-on-surface-variant transition-transform duration-fast md:block',
            open && 'rotate-180'
          )}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Admin account menu"
          className="absolute right-0 top-full z-dropdown mt-1.5 min-w-[210px] overflow-hidden rounded-[var(--radius-input)] border border-outline-variant bg-surface-container-low py-1 shadow-none [animation:fade-in-down_150ms_var(--easing-standard-decelerate)_both]"
        >
          {/* Identity block — square stamp, name, mono role */}
          <div className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-3">
            <span
              className={cn(
                'flex shrink-0 select-none items-center justify-center rounded-[var(--radius-compact)] border border-primary/50 bg-primary text-on-primary',
                H_AVATAR,
                H_AVATAR_TEXT
              )}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-title-sm text-on-surface">{displayName}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant/85">
                Administrator
              </p>
            </div>
          </div>

          <Link
            to="/docs"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(H_DROPDOWN_ITEM, 'text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)]')}
          >
            <BookOpen className={H_DROPDOWN_ICON} strokeWidth={1.75} />
            Public docs
          </Link>

          <Link
            to="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(H_DROPDOWN_ITEM, 'text-on-surface hover:bg-on-surface/[var(--state-hover-opacity)]')}
          >
            <LayoutDashboard className={H_DROPDOWN_ICON} strokeWidth={1.75} />
            View site
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={cn(H_DROPDOWN_ITEM, 'text-error hover:bg-error/[var(--state-hover-opacity)]')}
          >
            <LogOut className={H_DROPDOWN_ICON} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminSidebarLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Desktop only: collapse the rail to an icon strip. Persisted.
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

  const currentLabel = TITLES[location.pathname] ?? 'Admin';

  const handleLogout = () => {
    logout();
    navigate('/admin');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface lg:h-[100dvh] lg:flex-row lg:overflow-hidden">
      {/* Desktop rail */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-hidden border-r border-hairline bg-surface-container-low transition-[width] duration-normal md:flex',
          collapsed ? COLLAPSED_SIDEBAR_W : 'w-[var(--layout-sidebar-w)]'
        )}
      >
        <SidebarNav
          activePath={location.pathname}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
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
        aria-label="Mobile admin navigation"
        aria-modal={mobileOpen}
        aria-hidden={!mobileOpen}
      >
        <SidebarNav activePath={location.pathname} onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Main content column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          className={cn(
            'sticky top-0 z-sticky flex shrink-0 items-center gap-2 border-b',
            H_SURFACE,
            H_SEPARATOR,
            H_HEIGHT,
            H_PX
          )}
        >
          <button
            type="button"
            onClick={() => setMobileOpen((p) => !p)}
            className={cn(
              'flex items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden',
              H_ICON_BTN_MOBILE
            )}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <span className={cn(H_SHELL_SCOPE, 'hidden sm:inline')}>ADMIN /</span>
            <span className={cn(H_BRAND_TEXT, 'min-w-0 truncate text-on-surface')}>{currentLabel}</span>
          </div>

          <div className="ml-auto pl-2">
            <AdminAvatarMenu username={username} onLogout={handleLogout} />
          </div>
        </header>

        <main className="min-h-0 flex-1 lg:overflow-y-auto lg:overscroll-contain">
          <div className="mx-auto w-full max-w-[var(--layout-content-max)] px-[var(--layout-main-p)] py-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
