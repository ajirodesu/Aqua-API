import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        aqua: {
          50: '#eefcff',
          100: '#d6f6ff',
          200: '#b0edff',
          300: '#75e2ff',
          400: '#33d0fb',
          500: '#0ab4e8',
          600: '#0090c2',
          700: '#03729d',
          800: '#0a5d80',
          900: '#0d4d6b',
          950: '#062f45',
        },
        surface: {
          DEFAULT: '#0b1220',
          dim: '#0e1626',
          card: '#151f34',
          border: 'rgba(255,255,255,0.08)',
        },
        json: {
          key: '#7dd3fc',
          string: '#86efac',
          number: '#fbbf24',
          boolean: '#c4b5fd',
          punct: '#64748b',
        },
      },
      boxShadow: {
        'ios-sm': '0 1px 2px rgba(0, 0, 0, 0.28), 0 1px 1px rgba(0, 0, 0, 0.2)',
        'ios-md': '0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.25)',
        'ios-lg': '0 12px 40px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
        'glow-aqua': '0 0 0 1px rgba(10, 180, 232, 0.2), 0 8px 24px rgba(10, 180, 232, 0.22)',
      },
      borderRadius: {
        xl2: '1.25rem',
        '3xl': '1.75rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'ping-soft': {
          '75%, 100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 2.4s linear infinite',
        'ping-soft': 'ping-soft 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
