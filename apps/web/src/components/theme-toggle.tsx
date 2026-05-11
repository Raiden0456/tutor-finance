import { useEffect, useState, type JSX } from 'react';
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

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme | null) ?? 'system';
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  }

  return (
    <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={cycle}>
      <span key={theme} className="theme-icon-animate">
        {ICONS[theme]}
      </span>
    </Button>
  );
}
