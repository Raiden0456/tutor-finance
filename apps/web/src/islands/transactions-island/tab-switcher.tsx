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
  /**
   * Unique id for the sliding pill `layoutId`. Required when multiple TabSwitchers
   * are mounted simultaneously so motion doesn't try to animate one pill across instances.
   */
  groupId?: string;
}) {
  const pillId = `tab-pill-${groupId ?? 'default'}`;
  return (
    <div
      role="tablist"
      className="flex md:w-fit items-center gap-1 rounded-full bg-muted p-1 text-xs font-medium"
    >
      {tabs.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={
              'relative flex h-8 flex-1 md:flex-auto items-center justify-center rounded-full px-3 transition-colors duration-200 ' +
              (active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-card shadow-sm"
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
