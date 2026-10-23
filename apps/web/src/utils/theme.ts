export type Theme = 'light' | 'dark' | 'system';

export function readTheme(): Theme {
  const stored = localStorage.getItem('theme');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function applyTheme(theme: Theme) {
  localStorage.setItem('theme', theme);
  document.cookie = `theme=${theme};path=/;max-age=31536000;samesite=lax`;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
