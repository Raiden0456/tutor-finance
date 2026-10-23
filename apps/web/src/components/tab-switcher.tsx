import { motion } from 'motion/react';

export interface TabItem<T extends string> {
  key: T;
  label: string;
}

export function TabSwitcher<T extends string>({
  value,
  onChange,
  tabs,
  groupId,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: ReadonlyArray<TabItem<T>>;
  groupId?: string;
}) {
  const pillId = `tab-pill-${groupId ?? 'default'}`;
  return (
    <div
      role="tablist"
      className={
        'max-w-full items-center gap-1 bg-muted p-1 text-xs font-medium md:w-fit ' +
        (tabs.length > 3
          ? 'grid grid-cols-2 rounded-2xl sm:flex sm:rounded-full'
          : 'flex overflow-x-auto rounded-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden')
      }
    >
      {tabs.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={(e) => {
              e.currentTarget.scrollIntoView({
                block: 'nearest',
                inline: 'nearest',
                behavior: 'smooth',
              });
              onChange(key);
            }}
            className={
              'relative flex h-8 flex-1 shrink-0 md:flex-auto items-center justify-center rounded-full px-2 sm:px-3 transition-colors duration-200 ' +
              (active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-card shadow-sm dark:bg-accent dark:ring-1 dark:ring-border"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }}
                style={{ originY: 0 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
