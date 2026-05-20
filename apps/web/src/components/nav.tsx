import { Home, Users, CalendarClock, Wallet, Settings } from 'lucide-react';
import { localizePath, stripLocale, type Locale } from '@/lib/i18n';
import { BrandLogo } from './app-logo';
import { ThemeToggle } from './theme-toggle';

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/lessons', label: 'Lessons', icon: CalendarClock },
  { href: '/transactions', label: 'Transactions', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export interface NavProps {
  current: string;
  locale?: Locale;
  initialTheme?: 'light' | 'dark' | 'system';
}

const ruLabels: Record<string, string> = {
  Dashboard: 'Панель',
  Students: 'Ученики',
  Lessons: 'Занятия',
  Transactions: 'Финансы',
  Settings: 'Настройки',
};

function translate(label: string, locale: Locale) {
  return locale === 'ru' ? (ruLabels[label] ?? label) : label;
}

export function Sidebar({ current, locale = 'en', initialTheme }: NavProps) {
  const cleanCurrent = stripLocale(current);
  return (
    <nav className="sticky top-0 hidden h-screen w-56 shrink-0 border-r bg-card/50 md:flex md:flex-col md:gap-1 md:p-3">
      <a
        href={localizePath('/', locale)}
        className="mb-4 flex items-center gap-3 rounded-xl transition-opacity duration-200 hover:opacity-80"
      >
        <BrandLogo />
      </a>
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === cleanCurrent || (href !== '/' && cleanCurrent.startsWith(href));
        const translatedLabel = translate(label, locale);
        return (
          <a
            key={href}
            href={localizePath(href, locale)}
            className={
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ' +
              (active
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
            }
          >
            <Icon className="h-4 w-4" />
            <span>{translatedLabel}</span>
          </a>
        );
      })}
      <div className="mt-auto pt-2">
        <ThemeToggle initialTheme={initialTheme} variant="nav" />
      </div>
    </nav>
  );
}

export function MobileTabBar({ current, locale = 'en' }: NavProps) {
  const cleanCurrent = stripLocale(current);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingInline: '16px' }}
    >
      <div className="flex w-full max-w-sm items-center rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === cleanCurrent || (href !== '/' && cleanCurrent.startsWith(href));
          const translatedLabel = translate(label, locale);
          return (
            <a
              key={href}
              href={localizePath(href, locale)}
              aria-label={translatedLabel}
              className={
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors duration-200 ' +
                (active ? 'text-primary' : 'text-muted-foreground hover:text-foreground')
              }
            >
              <div
                className={
                  'rounded-xl py-2 px-6 transition-colors duration-200 ' +
                  (active ? 'bg-primary/15' : 'bg-transparent')
                }
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              </div>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
