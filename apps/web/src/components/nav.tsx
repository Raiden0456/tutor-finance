import { Home, Users, CalendarClock, Wallet, Settings } from 'lucide-react';
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
  initialTheme?: 'light' | 'dark' | 'system';
}

export function Sidebar({ current, initialTheme }: NavProps) {
  return (
    <nav className="sticky top-0 hidden h-screen w-56 shrink-0 border-r bg-card/50 md:flex md:flex-col md:gap-1 md:p-3">
      <h1 className="text-2xl font-bold mb-4">Uchetka</h1>
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === current || (href !== '/' && current.startsWith(href));
        return (
          <a
            key={href}
            href={href}
            className={
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ' +
              (active
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </a>
        );
      })}
      <div className="mt-auto pt-2">
        <ThemeToggle initialTheme={initialTheme} variant="nav" />
      </div>
    </nav>
  );
}

export function MobileTabBar({ current }: NavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center md:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)', paddingInline: '16px' }}
    >
      <div className="flex w-full max-w-sm items-center rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-md">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === current || (href !== '/' && current.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              aria-label={label}
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
