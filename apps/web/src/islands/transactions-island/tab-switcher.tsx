export function TabSwitcher({
  value,
  onChange,
}: {
  value: 'transactions' | 'recurring';
  onChange: (v: 'transactions' | 'recurring') => void;
}) {
  return (
    <div
      role="tablist"
      className="flex md:w-fit items-center gap-1 rounded-full bg-muted p-1 text-xs font-medium"
    >
      {(
        [
          { key: 'transactions', label: 'Transactions' },
          { key: 'recurring', label: 'Recurring' },
        ] as const
      ).map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={
              'flex h-8 flex-1 md:flex-auto items-center justify-center rounded-full px-3 transition-colors ' +
              (active
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
