import { THEME_ICON, useTheme } from '../lib/theme';

/**
 * App brand mark that follows the active emerald / jasper / amethyst theme.
 * The favicon swaps through the same map in ThemeProvider, so the tab icon
 * and every in-app mark always match.
 */
export function BrandIcon({ className, alt = '' }: { className?: string; alt?: string }) {
  const { theme } = useTheme();
  return <img src={THEME_ICON[theme]} alt={alt} className={className} />;
}
