import { cn } from '@/lib/utils';

const TONE_COLOURS = {
  planned: 'text-tf-indigo',
  income: 'text-income',
  expense: 'text-expense',
} as const;

export type StatTone = keyof typeof TONE_COLOURS;

export function FinanceStat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone: StatTone;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card p-4 shadow-sm', className)}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('mt-1 text-xl font-semibold tabular-nums', TONE_COLOURS[tone])}>
        {value}
      </div>
    </div>
  );
}
