/**
 * Shared shell tokens — "telemetry printout".
 *
 * Single source of truth for the geometry and typography of every shell
 * surface (public masthead, docs rail, admin rail). The shell reads as a
 * printed technical document: flat ink fills, 1px hairline rules, mono
 * ordinals, and hierarchy carried by scale and weight — never by shadow,
 * blur, glow, or rounded boxes. One primary accent marks the current page,
 * keyboard focus, and the single primary action.
 *
 * Widths and insets reference the fluid `--layout-*` clamp() values from
 * styles/tokens.css; this file never re-declares them per breakpoint.
 */

export const H_HEIGHT = 'h-14' as const;
export const H_PX = 'px-4 md:px-6' as const;
export const H_SEPARATOR = 'border-separator' as const;
export const H_SURFACE = 'bg-header-surface' as const;
export const H_SIDEBAR_WIDTH = 'w-[var(--layout-sidebar-w)]' as const;

export const H_BRAND_TEXT = 'font-brand text-[15px] uppercase tracking-[0.16em] leading-none' as const;
export const H_SHELL_SCOPE = 'font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/85 select-none' as const;
export const H_MONO_LABEL = 'font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/80' as const;

export const H_SIDEBAR_NAV =
  'group relative flex h-10 shrink-0 items-center gap-2.5 border-l-2 border-transparent pl-2.5 pr-2 text-body-sm transition-colors duration-fast' as const;
export const H_SIDEBAR_INDEX = 'w-5 shrink-0 text-right font-mono text-[10px] tabular-nums tracking-[0.08em]' as const;
export const H_SECTION_LABEL = 'rule-label pl-2.5 pr-1 pb-2 pt-4' as const;

export const H_AVATAR = 'h-6 w-6' as const;
export const H_AVATAR_TEXT = 'font-mono text-[10px] font-semibold tracking-[0.04em]' as const;
export const H_CHEVRON = 'h-3.5 w-3.5' as const;
export const H_LOGO_ICON = 'h-5 w-5' as const;

export const H_DROPDOWN_ITEM =
  'flex w-full items-center gap-2.5 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.06em] transition-colors duration-fast' as const;
export const H_DROPDOWN_ICON = 'h-4 w-4 shrink-0' as const;

export const H_ICON_BTN_MOBILE =
  'relative !h-9 !w-9 before:absolute before:left-1/2 before:top-1/2 before:h-[var(--touch-target-min)] before:w-[var(--touch-target-min)] before:-translate-x-1/2 before:-translate-y-1/2 before:content-[""]' as const;

/** Flat frame used by every content panel. */
export const H_PANEL = 'rounded-card border border-hairline bg-surface-container-low' as const;

/** Inline status marker (square printout light, not a glowing dot). */
export const H_STATUS_SQUARE = 'h-1.5 w-1.5 shrink-0 rounded-[1px]' as const;
