import { Check } from 'lucide-react';
import { useTheme, type AppTheme } from '../lib/theme';

const OPTIONS: { id: AppTheme; label: string; dot: string }[] = [
  { id: 'emerald', label: 'Emerald', dot: 'bg-primary/80' },
  { id: 'jasper', label: 'Jasper', dot: 'theme-dot-jasper' },
  { id: 'amethyst', label: 'Amethyst', dot: 'theme-dot-amethyst' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Interface theme"
      className="grid grid-cols-3 gap-2"
    >
      {OPTIONS.map(({ id, label, dot }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={label}
            onClick={() => setTheme(id)}
            className={`relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border px-1.5 py-2 transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-hairline bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {active && (
              <Check
                className="absolute right-1 top-1 h-2.5 w-2.5 shrink-0"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            )}
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            <span className="truncate text-[10px] leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
