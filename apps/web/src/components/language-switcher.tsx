import { localizePath, type Locale } from '@/lib/i18n';

type LanguageSwitcherProps = {
  current: string;
  locale: Locale;
};

export function LanguageSwitcher({ current, locale }: LanguageSwitcherProps) {
  const [pathname, search = ''] = current.split('?');
  const label = locale === 'ru' ? 'Язык' : 'Language';

  return (
    <div
      className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-medium shadow-sm transition-all duration-200 ease-in-out"
      aria-label={label}
    >
      {(['en', 'ru'] as const).map((item) => {
        const active = item === locale;
        return (
          <a
            key={item}
            href={`${localizePath(pathname || '/', item)}${search ? `?${search}` : ''}`}
            className={
              'rounded-md px-2.5 py-1 transition-all duration-200 ease-in-out ' +
              (active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
            }
            aria-current={active ? 'page' : undefined}
          >
            {item.toUpperCase()}
          </a>
        );
      })}
    </div>
  );
}
