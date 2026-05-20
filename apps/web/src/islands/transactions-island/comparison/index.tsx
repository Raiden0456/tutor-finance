import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, CalendarRange } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { fromMinorUnits, type Currency, type WeekStartsOn } from '@tutor-finance/shared';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Summary } from '@/lib/types';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapse } from '@/components/ui/collapse';
import {
  RangeTabs,
  resolveRange,
  startOfDay,
  endOfDay,
  type RangeState,
} from '@/components/range-tabs';
import { TabSwitcher } from '../tab-switcher';

type CompMode = 'growth' | 'dual';

function periodLabel(from: Date, to: Date, locale: string) {
  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return `${dateFmt.format(from)} – ${dateFmt.format(to)}`;
}

function computeGrowthPeriods(range: RangeState, locale: string) {
  const { from: currFrom, to: currTo } = resolveRange(range);
  const days = Math.round((currTo.getTime() - currFrom.getTime()) / 86_400_000);
  const prevTo = new Date(currFrom);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return {
    curr: { from: currFrom, to: currTo, label: periodLabel(currFrom, currTo, locale) },
    prev: {
      from: startOfDay(prevFrom),
      to: endOfDay(prevTo),
      label: periodLabel(prevFrom, prevTo, locale),
    },
  };
}

function getDelta(curr: number, prev: number): { pct: number | null; dir: 'up' | 'down' | 'flat' } {
  if (prev === 0 && curr === 0) return { pct: null, dir: 'flat' };
  if (prev === 0) return { pct: null, dir: curr > 0 ? 'up' : 'down' };
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  return { pct, dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' };
}

function DeltaBadge({
  curr,
  prev,
  inverse = false,
  newLabel,
}: {
  curr: number;
  prev: number;
  inverse?: boolean;
  newLabel: string;
}) {
  const { pct, dir } = getDelta(curr, prev);
  const displayDir = inverse ? (dir === 'up' ? 'down' : dir === 'down' ? 'up' : 'flat') : dir;
  if (dir === 'flat' && pct === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  const color =
    displayDir === 'up'
      ? 'text-income'
      : displayDir === 'down'
        ? 'text-expense'
        : 'text-muted-foreground';
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {pct !== null ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : newLabel}
    </span>
  );
}

function RangePicker({
  value,
  onChange,
  placeholder,
  weekStartsOn,
}: {
  value: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
  placeholder: string;
  weekStartsOn: WeekStartsOn;
}) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value);
  const isSet = !!(value?.from && value?.to);
  const label = isSet ? periodLabel(value!.from!, value!.to!, locale) : placeholder;

  function onOpenChange(next: boolean) {
    if (next) {
      setDraft(value);
    } else {
      setDraft(undefined);
    }
    setOpen(next);
  }

  function onCalendarSelect(r: DateRange | undefined) {
    setDraft(r);
    if (r?.from && r.to) {
      onChange(r);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={
            'flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ' +
            (isSet
              ? 'border-border bg-card text-foreground shadow-sm'
              : 'border-dashed border-border text-muted-foreground hover:text-foreground')
          }
        >
          <CalendarRange className="h-3.5 w-3.5 shrink-0" />
          <span className="whitespace-nowrap">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={draft}
          defaultMonth={draft?.from ?? new Date()}
          weekStartsOn={weekStartsOn}
          onSelect={onCalendarSelect}
          disabled={{ after: new Date() }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function ComparisonView({
  currency,
  weekStartsOn,
}: {
  currency: Currency;
  weekStartsOn: WeekStartsOn;
}) {
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<CompMode>('growth');
  const [growthRange, setGrowthRange] = useState<RangeState>({ kind: 'preset', key: '30d' });
  const [dualA, setDualA] = useState<DateRange | undefined>(() => {
    const r = resolveRange({ kind: 'preset', key: '30d' });
    return { from: r.from, to: r.to };
  });
  const [dualB, setDualB] = useState<DateRange | undefined>(() => {
    const r = resolveRange({ kind: 'preset', key: '30d' });
    const prevTo = new Date(r.from);
    prevTo.setDate(prevTo.getDate() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 29);
    return { from: startOfDay(prevFrom), to: endOfDay(prevTo) };
  });
  const [summaryA, setSummaryA] = useState<Summary | null>(null);
  const [summaryB, setSummaryB] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const periods = useMemo(() => {
    if (mode === 'growth') {
      return computeGrowthPeriods(growthRange, locale);
    }
    if (dualA?.from && dualA?.to && dualB?.from && dualB?.to) {
      return {
        curr: {
          from: startOfDay(dualA.from),
          to: endOfDay(dualA.to),
          label: periodLabel(dualA.from, dualA.to, locale),
        },
        prev: {
          from: startOfDay(dualB.from),
          to: endOfDay(dualB.to),
          label: periodLabel(dualB.from, dualB.to, locale),
        },
      };
    }
    return null;
  }, [mode, growthRange, dualA, dualB, locale]);

  useEffect(() => {
    if (!periods) {
      setSummaryA(null);
      setSummaryB(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<Summary>('/dashboard/summary', {
        query: {
          from: periods.curr.from.toISOString(),
          to: periods.curr.to.toISOString(),
          target: currency,
        },
      }),
      api.get<Summary>('/dashboard/summary', {
        query: {
          from: periods.prev.from.toISOString(),
          to: periods.prev.to.toISOString(),
          target: currency,
        },
      }),
    ])
      .then(([a, b]) => {
        if (!cancelled) {
          setSummaryA(a);
          setSummaryB(b);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periods, currency]);

  const chartData =
    summaryA && summaryB
      ? [
          {
            metric: t('Income'),
            a: Math.round(fromMinorUnits(summaryA.incomeInTargetCurrency, currency) * 100) / 100,
            b: Math.round(fromMinorUnits(summaryB.incomeInTargetCurrency, currency) * 100) / 100,
          },
          {
            metric: t('Expenses'),
            a: Math.round(fromMinorUnits(summaryA.expenseInTargetCurrency, currency) * 100) / 100,
            b: Math.round(fromMinorUnits(summaryB.expenseInTargetCurrency, currency) * 100) / 100,
          },
          {
            metric: t('Net'),
            a: Math.round(fromMinorUnits(summaryA.netInTargetCurrency, currency) * 100) / 100,
            b: Math.round(fromMinorUnits(summaryB.netInTargetCurrency, currency) * 100) / 100,
          },
        ]
      : [];

  const compChartConfig: ChartConfig = {
    a: { label: mode === 'growth' ? t('Current') : t('Period A'), color: 'var(--tf-jade)' },
    b: { label: mode === 'growth' ? t('Previous') : t('Period B'), color: 'var(--tf-teal)' },
  };

  const metrics =
    summaryA && summaryB
      ? [
          {
            label: t('Income'),
            a: summaryA.incomeInTargetCurrency,
            b: summaryB.incomeInTargetCurrency,
            color: 'text-income' as const,
            inverse: false,
          },
          {
            label: t('Expenses'),
            a: summaryA.expenseInTargetCurrency,
            b: summaryB.expenseInTargetCurrency,
            color: 'text-expense' as const,
            inverse: true,
          },
          {
            label: t('Net'),
            a: summaryA.netInTargetCurrency,
            b: summaryB.netInTargetCurrency,
            color: (summaryA.netInTargetCurrency >= 0 ? 'text-income' : 'text-expense') as
              | 'text-income'
              | 'text-expense',
            inverse: false,
          },
        ]
      : [];

  return (
    <div className={'space-y-5 transition-opacity duration-150 ' + (loading ? 'opacity-60' : '')}>
      {/* Mode switcher */}
      <TabSwitcher<CompMode>
        value={mode}
        onChange={setMode}
        groupId="comparison-mode"
        tabs={[
          { key: 'growth', label: t('Growth') },
          { key: 'dual', label: t('Compare Periods') },
        ]}
      />

      {/* Period controls */}
      {mode === 'growth' ? (
        <div className="space-y-2">
          <RangeTabs
            value={growthRange}
            onChange={setGrowthRange}
            groupId="comparison-growth"
            weekStartsOn={weekStartsOn}
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--tf-jade)' }}
              />
              {t('Current')}: {periods?.curr.label}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--tf-teal)' }}
              />
              {t('Previous')}: {periods?.prev.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--tf-jade)' }}
              />
              A
            </span>
            <RangePicker
              value={dualA}
              onChange={setDualA}
              placeholder={t('Pick Period A')}
              weekStartsOn={weekStartsOn}
            />
          </div>
          <span className="text-xs text-muted-foreground">{t('vs')}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--tf-teal)' }}
              />
              B
            </span>
            <RangePicker
              value={dualB}
              onChange={setDualB}
              placeholder={t('Pick Period B')}
              weekStartsOn={weekStartsOn}
            />
          </div>
        </div>
      )}

      {/* Comparison metric cards */}
      {metrics.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map(({ label, a, b, color, inverse }) => (
            <div
              key={label}
              className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {label}
              </div>
              <div className={`text-xl font-semibold tabular-nums ${color}`}>
                {fmtMoney(a, currency)}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{fmtMoney(b, currency)}</span>
                <DeltaBadge curr={a} prev={b} inverse={inverse} newLabel={t('New')} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        !loading &&
        mode === 'dual' && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            {t('Select both periods to compare.')}
          </div>
        )
      )}

      {/* Grouped bar chart */}
      <Collapse open={chartData.length > 0}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('Period Comparison')}</CardTitle>
            <CardDescription className="text-xs">
              {mode === 'growth' ? t('Current vs Previous') : t('Period A vs Period B')} ({currency}
              )
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={compChartConfig} className="aspect-auto h-48 w-full">
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="metric" axisLine={false} tickLine={false} tickMargin={8} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="dashed"
                      formatter={(v) => Number(v).toFixed(2)}
                    />
                  }
                />
                <Bar dataKey="a" fill="var(--color-a)" radius={4} />
                <Bar dataKey="b" fill="var(--color-b)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </Collapse>
    </div>
  );
}
