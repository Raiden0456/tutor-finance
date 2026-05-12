import { useState, type JSX } from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { Button } from './ui/button';

type Theme = 'light' | 'dark' | 'system';

const CYCLE: Theme[] = ['light', 'dark', 'system'];

function applyTheme(t: Theme) {
  const resolved =
    t === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : t;
  document.documentElement.setAttribute('data-theme', resolved);
}

const ICONS: Record<Theme, JSX.Element> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <Laptop className="h-4 w-4" />,
};

const LABELS: Record<Theme, string> = { light: 'Light', dark: 'Dark', system: 'System' };

export function ThemeToggle({
  initialTheme = 'system',
  variant = 'icon',
}: {
  initialTheme?: Theme;
  variant?: 'icon' | 'nav' | 'button';
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
    localStorage.setItem('theme', next);
    document.cookie = `theme=${next};path=/;max-age=31536000;samesite=lax`;
    applyTheme(next);
  }

  if (variant === 'nav') {
    return (
      <button
        type="button"
        onClick={cycle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <span key={theme} className="theme-icon-animate h-4 w-4">
          {ICONS[theme]}
        </span>
        <span>{LABELS[theme]}</span>
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        className="transition-all duration-150 active:scale-90"
        variant="outline"
        size="icon-lg"
        aria-label="Toggle theme"
        onClick={cycle}
      >
        <span key={theme} className="theme-icon-animate">
          {ICONS[theme]}
        </span>
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={cycle}>
      <span key={theme} className="theme-icon-animate">
        {ICONS[theme]}
      </span>
    </Button>
  );
}
