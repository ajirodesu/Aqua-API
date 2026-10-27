import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Available UI themes — the Persian-Bot colorways.
 * - 'emerald'  — gemstone emerald on charcoal (default)
 * - 'jasper'   — warm jasper rust on warm ink
 * - 'amethyst' — amethyst violet on cold ink
 *
 * Shape, spacing and typography are identical across all three; only color
 * roles change. Persisted under Aqua's existing key so returning users keep
 * a working preference; legacy names are migrated in place.
 */
export type AppTheme = 'emerald' | 'jasper' | 'amethyst';

const STORAGE_KEY = 'aqua-ui-theme';
const DEFAULT_THEME: AppTheme = 'emerald';
const THEME_ORDER: readonly AppTheme[] = ['emerald', 'jasper', 'amethyst'];

const LEGACY_THEME_MAP: Readonly<Record<string, AppTheme>> = {
  aqua: 'emerald',
  burnt: 'jasper',
  indigo: 'amethyst',
};

const THEME_COLOR: Record<AppTheme, string> = {
  emerald: '#0F1112',
  jasper: '#110E0C',
  amethyst: '#0E1116',
};

function isAppTheme(value: string | null): value is AppTheme {
  return value === 'emerald' || value === 'jasper' || value === 'amethyst';
}

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  const legacy = stored !== null && Object.hasOwn(LEGACY_THEME_MAP, stored) ? LEGACY_THEME_MAP[stored] : undefined;
  if (legacy) return legacy;
  if (isAppTheme(stored)) return stored;

  const attr = document.documentElement.getAttribute('data-theme');
  if (isAppTheme(attr)) return attr;
  if (attr !== null && Object.hasOwn(LEGACY_THEME_MAP, attr)) return LEGACY_THEME_MAP[attr];

  return DEFAULT_THEME;
}

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.add('dark');
    window.localStorage.setItem(STORAGE_KEY, theme);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  // Scrollbars sit faint at rest and go solid while scrolling — capture phase
  // so nested overflow containers (docs rail, log console) participate too.
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const handleScroll = () => {
      document.documentElement.setAttribute('data-scrolling', 'true');
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        document.documentElement.removeAttribute('data-scrolling');
      }, 600);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const setTheme = useCallback((next: AppTheme) => setThemeState(next), []);
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => THEME_ORDER[(THEME_ORDER.indexOf(prev) + 1) % THEME_ORDER.length]);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
