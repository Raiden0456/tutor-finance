import { useState, type JSX } from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { createTranslator, type Locale } from '@/lib/i18n';
import { applyTheme, type Theme } from '@/utils/theme';
import { Button } from './ui/button';

const CYCLE: Theme[] = ['light', 'dark', 'system'];

const ICONS: Record<Theme, JSX.Element> = {
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
  system: <Laptop className="h-4 w-4" />,
};

export function ThemeToggle({
  initialTheme = 'system',
  locale = 'en',
}: {
  initialTheme?: Theme;
  locale?: Locale;
}) {
  const t = createTranslator(locale);
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]!;
    setTheme(next);
    applyTheme(next);
  }

  return (
    <Button
      className="transition-all duration-150 active:scale-90"
      variant="outline"
      size="icon-lg"
      aria-label={t('Toggle theme')}
      onClick={cycle}
    >
      <span key={theme} className="theme-icon-animate">
        {ICONS[theme]}
      </span>
    </Button>
  );
}
