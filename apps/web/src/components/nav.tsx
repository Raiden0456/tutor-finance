import { Home, Users, CalendarClock, Wallet, Settings } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/lessons', label: 'Lessons', icon: CalendarClock },
  { href: '/transactions', label: 'Transactions', icon: Wallet },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export interface NavProps {
  current: string;
}

export function Sidebar({ current }: NavProps) {
  return (
    <nav className="hidden w-56 shrink-0 border-r bg-card/50 md:flex md:flex-col md:gap-1 md:p-3">
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
    </nav>
  );
}

export function MobileTabBar({ current }: NavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === current || (href !== '/' && current.startsWith(href));
        return (
          <a
            key={href}
            href={href}
            className={
              'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ' +
              (active ? 'text-primary' : 'text-muted-foreground hover:text-foreground')
            }
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
            <span>{label}</span>
          </a>
        );
      })}
    </nav>
  );
}
