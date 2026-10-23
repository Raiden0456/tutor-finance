import { Home, Users, CalendarClock, Wallet, Settings, LogOut, CircleUser } from 'lucide-react';
import { createTranslator, localizePath, stripLocale, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { BrandLogo } from './app-logo';
import { SignOutButton, signOutAndRedirect } from './sign-out-button';
import { AssistantTrigger } from '@/features/assistant';

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/lessons', label: 'Lessons', icon: CalendarClock },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/transactions', label: 'Finance', icon: Wallet },
];

export interface NavProps {
  current: string;
  locale?: Locale;
  userName?: string;
}

function isActive(href: string, current: string) {
  const clean = stripLocale(current);
  return href === clean || (href !== '/' && clean.startsWith(href));
}

function sidebarLinkClass(active: boolean) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200',
    active
      ? 'bg-primary/10 font-medium text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );
}

export function Sidebar({ current, locale = 'en', userName }: NavProps) {
  const t = createTranslator(locale);
  return (
    <nav className="sticky top-0 hidden h-screen w-56 shrink-0 border-r bg-card/50 md:flex md:flex-col md:gap-1 md:p-3">
      <a
        href={localizePath('/', locale)}
        className="mb-4 flex items-center gap-3 rounded-xl transition-opacity duration-200 hover:opacity-80"
      >
        <BrandLogo />
      </a>
      {links.map(({ href, label, icon: Icon }) => (
        <a
          key={href}
          href={localizePath(href, locale)}
          className={sidebarLinkClass(isActive(href, current))}
        >
          <Icon className="h-4 w-4" />
          <span>{t(label)}</span>
        </a>
      ))}
      <AssistantTrigger variant="sidebar" label={t('Assistant')} />
      <div className="mt-auto grid gap-1 border-t border-border pt-3">
        <a
          href={localizePath('/settings', locale)}
          className={sidebarLinkClass(isActive('/settings', current))}
        >
          <Settings className="h-4 w-4" />
          <span>{t('Settings')}</span>
        </a>
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5">
          <CircleUser className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{userName}</span>
          <SignOutButton locale={locale} />
        </div>
      </div>
    </nav>
  );
}

export function MobileHeaderMenu({ current, locale = 'en', userName }: NavProps) {
  const t = createTranslator(locale);
  return (
    <div className="flex items-center gap-2">
      <AssistantTrigger variant="icon" label={t('Assistant')} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon-lg"
            aria-label={t('Settings')}
            className={cn(
              'transition-all duration-150 active:scale-90',
              isActive('/settings', current) && 'border-primary/40 text-primary',
            )}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {userName && (
            <>
              <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                {userName}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem asChild>
            <a href={localizePath('/settings', locale)}>
              <Settings className="h-4 w-4" />
              {t('Settings')}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => void signOutAndRedirect(locale)}>
            <LogOut className="h-4 w-4" />
            {t('Sign out')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function MobileTabBar({ current, locale = 'en' }: NavProps) {
  const t = createTranslator(locale);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingInline: '16px' }}
    >
      <div className="flex w-full max-w-sm items-center rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, current);
          return (
            <a
              key={href}
              href={localizePath(href, locale)}
              aria-label={t(label)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-medium transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div
                className={cn(
                  'rounded-xl px-5 py-1.5 transition-colors duration-200',
                  active ? 'bg-primary/15' : 'bg-transparent',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.8} />
              </div>
              <span>{t(label)}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
