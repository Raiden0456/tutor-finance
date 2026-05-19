import { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarRange } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type PresetKey = '7d' | '30d' | '90d';
export type RangeState =
  | { kind: 'preset'; key: PresetKey }
  | { kind: 'custom'; from: Date; to: Date };

const PRESET_LABELS: Record<PresetKey, string> = { '7d': '7d', '30d': '30d', '90d': '90d' };
const PRESETS: PresetKey[] = ['7d', '30d', '90d'];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveRange(r: RangeState): { from: Date; to: Date } {
  if (r.kind === 'custom') return { from: startOfDay(r.from), to: endOfDay(r.to) };
  const now = new Date();
  const to = endOfDay(now);
  const from = startOfDay(now);
  const days = r.key === '7d' ? 7 : r.key === '30d' ? 30 : 90;
  from.setDate(from.getDate() - (days - 1));
  return { from, to };
}

export function rangeLabel(r: RangeState): string {
  if (r.kind === 'preset') return PRESET_LABELS[r.key];
  const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  return `${fmt.format(r.from)} – ${fmt.format(r.to)}`;
}

export function inferRange(fromIso: string, toIso: string): RangeState {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  if (days >= 6 && days <= 8) return { kind: 'preset', key: '7d' };
  if (days >= 28 && days <= 31) return { kind: 'preset', key: '30d' };
  if (days >= 88 && days <= 92) return { kind: 'preset', key: '90d' };
  return { kind: 'custom', from, to };
}

export function RangeTabs({
  value,
  onChange,
  groupId,
}: {
  value: RangeState;
  onChange: (r: RangeState) => void;
  groupId?: string;
}) {
  const pillId = `range-tabs-pill-${groupId ?? 'default'}`;
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    value.kind === 'custom' ? { from: value.from, to: value.to } : undefined,
  );
  const customActive = value.kind === 'custom';
  const customLabel = customActive ? rangeLabel(value) : 'Custom';

  function onCalendarSelect(r: DateRange | undefined) {
    setDateRange(r);
    if (r?.from && r.to) {
      onChange({ kind: 'custom', from: r.from, to: r.to });
    }
  }

  function onOpenChange(next: boolean) {
    if (next && value.kind === 'custom') {
      setDateRange({ from: value.from, to: value.to });
    } else if (!next) {
      setDateRange(undefined);
    }
    setOpen(next);
  }

  return (
    <div
      role="tablist"
      className="flex w-full justify-between md:flex-none md:w-fit items-center gap-1 overflow-x-auto rounded-full bg-muted p-1 text-xs font-medium"
    >
      {PRESETS.map((k) => {
        const active = value.kind === 'preset' && value.key === k;
        return (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange({ kind: 'preset', key: k })}
            className={
              'relative flex h-8 shrink-0 items-center justify-center rounded-full px-3 transition-colors duration-200 ' +
              (active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            {active && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-card shadow-sm dark:bg-accent dark:ring-1 dark:ring-border"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }}
              />
            )}
            <span className="relative z-10">{PRESET_LABELS[k]}</span>
          </button>
        );
      })}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="tab"
            aria-selected={customActive}
            className={
              'relative flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 transition-colors duration-200 ' +
              (customActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            {customActive && (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-full bg-card shadow-sm dark:bg-accent dark:ring-1 dark:ring-border"
                transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }}
              />
            )}
            <CalendarRange className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10 whitespace-nowrap">{customLabel}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            numberOfMonths={1}
            defaultMonth={dateRange?.from ?? new Date()}
            selected={dateRange}
            onSelect={onCalendarSelect}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
