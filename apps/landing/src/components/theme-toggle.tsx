import { useEffect, useState, type JSX } from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { createTranslator, type Locale } from '@/lib/i18n';
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
  locale = 'en',
}: {
  initialTheme?: Theme;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const stored = (localStorage.getItem('theme') as Theme | null) ?? 'system';
    if (stored !== theme) setTheme(stored);
  }, []);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setTheme(next);
    localStorage.setItem('theme', next);
    document.cookie = `theme=${next};path=/;max-age=31536000;samesite=lax`;
    applyTheme(next);
  }

  return (
    <Button
      className="transition-all duration-150 active:scale-90"
      variant="outline"
      size="icon"
      aria-label={`${t('Toggle theme')} (${t(LABELS[theme])})`}
      onClick={cycle}
    >
      <span key={theme} className="theme-icon-animate">
        {ICONS[theme]}
      </span>
    </Button>
  );
}
