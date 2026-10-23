import { useEffect, useMemo, useState } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { Currency } from '@tutor-finance/shared';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Summary } from '@/lib/types';
import { endOfDay, resolveRange, startOfDay, type RangeState } from '@/components/range-tabs';

function previousPeriod(range: RangeState) {
  const { from, to } = resolveRange(range);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: startOfDay(prevFrom), to: endOfDay(prevTo) };
}

function DeltaBadge({ curr, prev, inverse }: { curr: number; prev: number; inverse?: boolean }) {
  const { t } = useI18n();
  if (prev === 0 && curr === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = prev === 0 ? null : ((curr - prev) / Math.abs(prev)) * 100;
  const dir =
    pct === null ? (curr > 0 ? 'up' : 'down') : pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat';
  const good = inverse ? dir === 'down' : dir === 'up';
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-xs font-medium',
        dir === 'flat' ? 'text-muted-foreground' : good ? 'text-income' : 'text-expense',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {pct !== null ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%` : t('New')}
    </span>
  );
}

export function PeriodComparison({
  range,
  currency,
  current,
}: {
  range: RangeState;
  currency: Currency;
  current: Summary;
}) {
  const { locale, t } = useI18n();
  const [previous, setPrevious] = useState<Summary | null>(null);
  const period = useMemo(() => previousPeriod(range), [range]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Summary>('/dashboard/summary', {
        query: { from: period.from.toISOString(), to: period.to.toISOString(), target: currency },
      })
      .then((summary) => !cancelled && setPrevious(summary))
      .catch(() => !cancelled && setPrevious(null));
    return () => {
      cancelled = true;
    };
  }, [period, currency]);

  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const metrics = [
    {
      label: t('Income'),
      curr: current.incomeInTargetCurrency,
      prev: previous?.incomeInTargetCurrency ?? 0,
      tone: 'text-income',
    },
    {
      label: t('Expenses'),
      curr: current.expenseInTargetCurrency,
      prev: previous?.expenseInTargetCurrency ?? 0,
      tone: 'text-expense',
      inverse: true,
    },
    {
      label: t('Net'),
      curr: current.netInTargetCurrency,
      prev: previous?.netInTargetCurrency ?? 0,
      tone: current.netInTargetCurrency >= 0 ? 'text-income' : 'text-expense',
    },
  ];

  return (
    <div className="space-y-2">
      <p className="px-0.5 text-xs text-muted-foreground">
        {t('Previous')}: {dateFmt.format(period.from)} – {dateFmt.format(period.to)}
      </p>
      <div
        className={cn(
          'grid grid-cols-1 gap-3 transition-opacity duration-200 sm:grid-cols-3',
          previous ? 'opacity-100' : 'opacity-60',
        )}
      >
        {metrics.map(({ label, curr, prev, tone, inverse }) => (
          <div
            key={label}
            className="space-y-1 rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <div className={cn('text-xl font-semibold tabular-nums', tone)}>
              {fmtMoney(curr, currency)}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{fmtMoney(prev, currency)}</span>
              <DeltaBadge curr={curr} prev={prev} inverse={inverse} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
