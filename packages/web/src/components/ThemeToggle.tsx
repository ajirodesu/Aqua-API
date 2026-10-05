import { Droplets, Flame, Moon } from 'lucide-react';
import { useTheme, type AppTheme } from '../lib/theme';

const OPTIONS: { id: AppTheme; label: string; Icon: typeof Droplets }[] = [
  { id: 'aqua', label: 'Aqua', Icon: Droplets },
  { id: 'burnt', label: 'Burnt', Icon: Flame },
  { id: 'indigo', label: 'Indigo', Icon: Moon },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex w-full items-center gap-1 rounded-input border border-hairline bg-surface-container-high p-1"
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            aria-label={`${label} theme`}
            onClick={() => setTheme(id)}
            className={`flex h-9 flex-1 items-center justify-center rounded-compact transition-all duration-fast ease-standard focus-visible:outline-none ${
              active
                ? 'bg-primary text-on-primary shadow-elevation-1'
                : 'text-on-surface-variant hover:bg-on-surface/10 hover:text-on-surface'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
            {!compact && <span className="sr-only">{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
