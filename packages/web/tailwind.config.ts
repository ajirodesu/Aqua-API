import type { Config } from 'tailwindcss';

/**
 * Tailwind configuration — Persian-Bot design system ported to Tailwind 3.
 *
 * Colors, typography, spacing, motion, elevation, z-index and layout tokens
 * all resolve to the runtime CSS custom properties declared in
 * `src/styles/tokens.css` and the three theme files. Switching
 * `html[data-theme]` changes color only — never geometry.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ==================== COLORS ====================
      colors: {
        // Structural rules — raw vars because the theme values are hex/rgba.
        hairline: 'var(--color-hairline-border)',
        separator: 'var(--color-separator)',
        'header-surface': 'var(--color-header-surface)',

        // Primary
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'on-primary': 'rgb(var(--color-on-primary) / <alpha-value>)',
        'primary-container': 'rgb(var(--color-primary-container) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--color-on-primary-container) / <alpha-value>)',

        // Secondary
        secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
        'on-secondary': 'rgb(var(--color-on-secondary) / <alpha-value>)',
        'secondary-container': 'rgb(var(--color-secondary-container) / <alpha-value>)',
        'on-secondary-container': 'rgb(var(--color-on-secondary-container) / <alpha-value>)',

        // Tertiary
        tertiary: 'rgb(var(--color-tertiary) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--color-on-tertiary) / <alpha-value>)',
        'tertiary-container': 'rgb(var(--color-tertiary-container) / <alpha-value>)',
        'on-tertiary-container': 'rgb(var(--color-on-tertiary-container) / <alpha-value>)',

        // Surface system
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        'on-surface': 'rgb(var(--color-on-surface) / <alpha-value>)',
        'surface-variant': 'rgb(var(--color-surface-variant) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--color-on-surface-variant) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--color-surface-container-lowest) / <alpha-value>)',
        'surface-container-low': 'rgb(var(--color-surface-container-low) / <alpha-value>)',
        'surface-container': 'rgb(var(--color-surface-container) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--color-surface-container-high) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--color-surface-container-highest) / <alpha-value>)',
        'surface-bright': 'rgb(var(--color-surface-bright) / <alpha-value>)',
        'surface-dim': 'rgb(var(--color-surface-dim) / <alpha-value>)',

        // Inverse
        'inverse-surface': 'rgb(var(--color-inverse-surface) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--color-inverse-on-surface) / <alpha-value>)',
        'inverse-primary': 'rgb(var(--color-inverse-primary) / <alpha-value>)',

        // Outline
        outline: 'rgb(var(--color-outline) / <alpha-value>)',
        'outline-variant': 'rgb(var(--color-outline-variant) / <alpha-value>)',

        // Scrim & shadow
        scrim: 'rgb(var(--color-scrim) / <alpha-value>)',
        shadow: 'rgb(var(--color-shadow) / <alpha-value>)',

        // Error
        error: 'rgb(var(--color-error) / <alpha-value>)',
        'on-error': 'rgb(var(--color-on-error) / <alpha-value>)',
        'error-container': 'rgb(var(--color-error-container) / <alpha-value>)',
        'on-error-container': 'rgb(var(--color-on-error-container) / <alpha-value>)',

        // Success
        success: 'rgb(var(--color-success) / <alpha-value>)',
        'on-success': 'rgb(var(--color-on-success) / <alpha-value>)',
        'success-container': 'rgb(var(--color-success-container) / <alpha-value>)',
        'on-success-container': 'rgb(var(--color-on-success-container) / <alpha-value>)',

        // Warning
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        'on-warning': 'rgb(var(--color-on-warning) / <alpha-value>)',
        'warning-container': 'rgb(var(--color-warning-container) / <alpha-value>)',
        'on-warning-container': 'rgb(var(--color-on-warning-container) / <alpha-value>)',

        // Info
        info: 'rgb(var(--color-info) / <alpha-value>)',
        'on-info': 'rgb(var(--color-on-info) / <alpha-value>)',
        'info-container': 'rgb(var(--color-info-container) / <alpha-value>)',
        'on-info-container': 'rgb(var(--color-on-info-container) / <alpha-value>)',

        // Platform identity
        discord: 'rgb(var(--platform-discord) / <alpha-value>)',
        telegram: 'rgb(var(--platform-telegram) / <alpha-value>)',

        // JSON / code data palette (flat, theme-compatible)
        json: {
          key: '#82b0e8',
          string: '#58c794',
          number: '#e2af58',
          boolean: '#a88cfa',
          punct: '#6a706a',
        },
      },

      // ==================== TYPOGRAPHY ====================
      fontFamily: {
        brand: 'var(--font-family-brand)',
        plain: 'var(--font-family-plain)',
        sans: 'var(--font-family-plain)',
        display: 'var(--font-family-display)',
        mono: 'var(--font-family-mono)',
      },
      fontSize: {
        'display-lg': [
          'var(--typography-display-large-font-size)',
          {
            lineHeight: 'var(--typography-display-large-line-height)',
            letterSpacing: 'var(--typography-display-large-letter-spacing)',
            fontWeight: 'var(--typography-display-large-font-weight)',
          },
        ],
        'display-md': [
          'var(--typography-display-medium-font-size)',
          {
            lineHeight: 'var(--typography-display-medium-line-height)',
            letterSpacing: 'var(--typography-display-medium-letter-spacing)',
            fontWeight: 'var(--typography-display-medium-font-weight)',
          },
        ],
        'display-sm': [
          'var(--typography-display-small-font-size)',
          {
            lineHeight: 'var(--typography-display-small-line-height)',
            letterSpacing: 'var(--typography-display-small-letter-spacing)',
            fontWeight: 'var(--typography-display-small-font-weight)',
          },
        ],
        'headline-lg': [
          'var(--typography-headline-large-font-size)',
          {
            lineHeight: 'var(--typography-headline-large-line-height)',
            letterSpacing: 'var(--typography-headline-large-letter-spacing)',
            fontWeight: 'var(--typography-headline-large-font-weight)',
          },
        ],
        'headline-md': [
          'var(--typography-headline-medium-font-size)',
          {
            lineHeight: 'var(--typography-headline-medium-line-height)',
            letterSpacing: 'var(--typography-headline-medium-letter-spacing)',
            fontWeight: 'var(--typography-headline-medium-font-weight)',
          },
        ],
        'headline-sm': [
          'var(--typography-headline-small-font-size)',
          {
            lineHeight: 'var(--typography-headline-small-line-height)',
            letterSpacing: 'var(--typography-headline-small-letter-spacing)',
            fontWeight: 'var(--typography-headline-small-font-weight)',
          },
        ],
        'title-lg': [
          'var(--typography-title-large-font-size)',
          {
            lineHeight: 'var(--typography-title-large-line-height)',
            letterSpacing: 'var(--typography-title-large-letter-spacing)',
            fontWeight: 'var(--typography-title-large-font-weight)',
          },
        ],
        'title-md': [
          'var(--typography-title-medium-font-size)',
          {
            lineHeight: 'var(--typography-title-medium-line-height)',
            letterSpacing: 'var(--typography-title-medium-letter-spacing)',
            fontWeight: 'var(--typography-title-medium-font-weight)',
          },
        ],
        'title-sm': [
          'var(--typography-title-small-font-size)',
          {
            lineHeight: 'var(--typography-title-small-line-height)',
            letterSpacing: 'var(--typography-title-small-letter-spacing)',
            fontWeight: 'var(--typography-title-small-font-weight)',
          },
        ],
        'body-lg': [
          'var(--typography-body-large-font-size)',
          {
            lineHeight: 'var(--typography-body-large-line-height)',
            letterSpacing: 'var(--typography-body-large-letter-spacing)',
            fontWeight: 'var(--typography-body-large-font-weight)',
          },
        ],
        'body-md': [
          'var(--typography-body-medium-font-size)',
          {
            lineHeight: 'var(--typography-body-medium-line-height)',
            letterSpacing: 'var(--typography-body-medium-letter-spacing)',
            fontWeight: 'var(--typography-body-medium-font-weight)',
          },
        ],
        'body-sm': [
          'var(--typography-body-small-font-size)',
          {
            lineHeight: 'var(--typography-body-small-line-height)',
            letterSpacing: 'var(--typography-body-small-letter-spacing)',
            fontWeight: 'var(--typography-body-small-font-weight)',
          },
        ],
        'label-lg': [
          'var(--typography-label-large-font-size)',
          {
            lineHeight: 'var(--typography-label-large-line-height)',
            letterSpacing: 'var(--typography-label-large-letter-spacing)',
            fontWeight: 'var(--typography-label-large-font-weight)',
          },
        ],
        'label-md': [
          'var(--typography-label-medium-font-size)',
          {
            lineHeight: 'var(--typography-label-medium-line-height)',
            letterSpacing: 'var(--typography-label-medium-letter-spacing)',
            fontWeight: 'var(--typography-label-medium-font-weight)',
          },
        ],
        'label-sm': [
          'var(--typography-label-small-font-size)',
          {
            lineHeight: 'var(--typography-label-small-line-height)',
            letterSpacing: 'var(--typography-label-small-letter-spacing)',
            fontWeight: 'var(--typography-label-small-font-weight)',
          },
        ],
      },

      // ==================== SPACING ====================
      spacing: {
        px: 'var(--spacing-px)',
        0: 'var(--spacing-0)',
        1: 'var(--spacing-1)',
        2: 'var(--spacing-2)',
        3: 'var(--spacing-3)',
        4: 'var(--spacing-4)',
        5: 'var(--spacing-5)',
        6: 'var(--spacing-6)',
        7: 'var(--spacing-7)',
        8: 'var(--spacing-8)',
        9: 'var(--spacing-9)',
        10: 'var(--spacing-10)',
        11: 'var(--spacing-11)',
        12: 'var(--spacing-12)',
        14: 'var(--spacing-14)',
        16: 'var(--spacing-16)',
        20: 'var(--spacing-20)',
        24: 'var(--spacing-24)',
        28: 'var(--spacing-28)',
        32: 'var(--spacing-32)',
        36: 'var(--spacing-36)',
        40: 'var(--spacing-40)',
        44: 'var(--spacing-44)',
        48: 'var(--spacing-48)',
        52: 'var(--spacing-52)',
        56: 'var(--spacing-56)',
        60: 'var(--spacing-60)',
        64: 'var(--spacing-64)',
        72: 'var(--spacing-72)',
        80: 'var(--spacing-80)',
        96: 'var(--spacing-96)',
      },

      // ==================== SHAPE ====================
      borderRadius: {
        card: 'var(--radius-card)',
        'card-lg': 'var(--radius-card-lg)',
        button: 'var(--radius-button)',
        input: 'var(--radius-input)',
        badge: 'var(--radius-badge)',
        compact: 'var(--radius-compact)',
      },
      borderColor: {
        DEFAULT: 'var(--color-hairline-border)',
      },

      // ==================== ELEVATION ====================
      boxShadow: {
        'elevation-0': 'var(--shadow-elevation-0)',
        'elevation-1': 'var(--shadow-elevation-1)',
        'elevation-2': 'var(--shadow-elevation-2)',
        'elevation-3': 'var(--shadow-elevation-3)',
        'elevation-4': 'var(--shadow-elevation-4)',
        'elevation-5': 'var(--shadow-elevation-5)',
        'elevation-1-soft': 'var(--shadow-elevation-1-soft)',
        'elevation-1-medium': 'var(--shadow-elevation-1-medium)',
        'elevation-1-hard': 'var(--shadow-elevation-1-hard)',
        'elevation-2-soft': 'var(--shadow-elevation-2-soft)',
        'elevation-2-medium': 'var(--shadow-elevation-2-medium)',
        'elevation-2-hard': 'var(--shadow-elevation-2-hard)',
        'elevation-3-soft': 'var(--shadow-elevation-3-soft)',
        'elevation-3-medium': 'var(--shadow-elevation-3-medium)',
        'elevation-3-hard': 'var(--shadow-elevation-3-hard)',
        'soft-sm': 'var(--shadow-soft-sm)',
        'soft-md': 'var(--shadow-soft-md)',
        'soft-lg': 'var(--shadow-soft-lg)',
        'card-rest': 'var(--shadow-card-rest)',
        'card-hover': 'var(--shadow-card-hover)',
        'focus-ring': 'var(--shadow-focus-ring)',
        inner: 'var(--shadow-inner)',
        'inner-lg': 'var(--shadow-inner-lg)',
      },

      // ==================== Z-INDEX ====================
      zIndex: {
        deep: 'var(--z-deep)',
        base: 'var(--z-base)',
        raised: 'var(--z-raised)',
        sticky: 'var(--z-sticky)',
        fixed: 'var(--z-fixed)',
        drawer: 'var(--z-drawer)',
        dropdown: 'var(--z-dropdown)',
        'modal-backdrop': 'var(--z-modal-backdrop)',
        modal: 'var(--z-modal)',
        popover: 'var(--z-popover)',
        tooltip: 'var(--z-tooltip)',
        notification: 'var(--z-notification)',
        overlay: 'var(--z-overlay)',
        max: 'var(--z-max)',
      },

      // ==================== MOTION ====================
      transitionDuration: {
        'short-1': 'var(--duration-short1)',
        'short-2': 'var(--duration-short2)',
        'short-3': 'var(--duration-short3)',
        'short-4': 'var(--duration-short4)',
        'medium-1': 'var(--duration-medium1)',
        'medium-2': 'var(--duration-medium2)',
        'medium-3': 'var(--duration-medium3)',
        'medium-4': 'var(--duration-medium4)',
        'long-1': 'var(--duration-long1)',
        'long-2': 'var(--duration-long2)',
        'long-3': 'var(--duration-long3)',
        'long-4': 'var(--duration-long4)',
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        slower: 'var(--duration-slower)',
      },
      transitionTimingFunction: {
        standard: 'var(--easing-standard)',
        'standard-decelerate': 'var(--easing-standard-decelerate)',
        'standard-accelerate': 'var(--easing-standard-accelerate)',
        emphasized: 'var(--easing-emphasized)',
        'emphasized-decelerate': 'var(--easing-emphasized-decelerate)',
        'emphasized-accelerate': 'var(--easing-emphasized-accelerate)',
      },

      // ==================== SCREENS ====================
      screens: {
        '3xl': '1920px',
        '4xl': '2560px',
        '5xl': '3840px',
      },

      // ==================== OPACITY ====================
      opacity: {
        'state-hover': 'var(--state-hover-opacity)',
        'state-focus': 'var(--state-focus-opacity)',
        'state-pressed': 'var(--state-pressed-opacity)',
        'state-dragged': 'var(--state-dragged-opacity)',
        'state-disabled': 'var(--state-disabled-opacity)',
        'state-disabled-container': 'var(--state-disabled-container-opacity)',
      },

      // ==================== KEYFRAMES ====================
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        skeleton: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        'ping-soft': { '75%, 100%': { transform: 'scale(1.8)', opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms var(--easing-standard) both',
        'fade-in-up': 'fade-in-up 300ms var(--easing-emphasized-decelerate) both',
        'fade-up': 'fade-in-up 300ms var(--easing-emphasized-decelerate) both',
        'fade-in-down': 'fade-in-down 150ms var(--easing-standard-decelerate) both',
        'scale-in': 'scale-in 150ms var(--easing-standard) both',
        shimmer: 'shimmer 2.4s linear infinite',
        skeleton: 'skeleton 1.6s ease-in-out infinite',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
