import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type AppTheme = 'aqua' | 'burnt' | 'indigo';

const STORAGE_KEY = 'aqua-ui-theme';
const DEFAULT_THEME: AppTheme = 'aqua';
const THEME_ORDER: readonly AppTheme[] = ['aqua', 'burnt', 'indigo'];

function isAppTheme(value: string | null): value is AppTheme {
  return value === 'aqua' || value === 'burnt' || value === 'indigo';
}

function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isAppTheme(stored)) return stored;
  const attr = document.documentElement.getAttribute('data-theme');
  return isAppTheme(attr) ? attr : DEFAULT_THEME;
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
    const map: Record<AppTheme, string> = { aqua: '#0A0C0E', burnt: '#111110', indigo: '#0B0714' };
    if (meta) meta.setAttribute('content', map[theme]);
  }, [theme]);

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
