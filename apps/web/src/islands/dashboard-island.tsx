import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  RangeTabs,
  resolveRange,
  rangeLabel,
  inferRange,
  type RangeState,
} from '@/components/range-tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { fromMinorUnits, SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import { statusLabel, statusStyles } from '@/lib/utils';
import type { RecentLesson, Summary, DailyTx } from '@/lib/types';

interface Props {
  summary: Summary;
  recentLessons: RecentLesson[];
  studentNames: Record<string, string>;
  dailyTransactions: DailyTx[];
}

const dayFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

function buildSeries(
  txs: DailyTx[],
  from: Date,
  to: Date,
  currency: Currency,
): { date: string; net: number }[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);

  const dailyNet = new Map<string, { income: number; expense: number }>();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dailyNet.set(d.toISOString().slice(0, 10), { income: 0, expense: 0 });
  }
  for (const t of txs) {
    const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
    if (v === 0) continue;
    const k = new Date(t.occurredAt).toISOString().slice(0, 10);
    const cur = dailyNet.get(k);
    if (!cur) continue;
    if (t.type === 'income') cur.income += v;
    else cur.expense += v;
  }

  let cumulative = 0;
  return Array.from(dailyNet.entries()).map(([k, v]) => {
    cumulative += v.income - v.expense;
    return {
      date: dayFmt.format(new Date(k)),
      net: Math.round(fromMinorUnits(cumulative, currency) * 100) / 100,
    };
  });
}

export function DashboardIsland({
  summary: initialSummary,
  recentLessons: initialRecentLessons,
  studentNames,
  dailyTransactions: initialTx,
}: Props) {
  const [range, setRange] = useState<RangeState>(() =>
    inferRange(initialSummary.from, initialSummary.to),
  );
  const [currency, setCurrency] = useState<Currency>(initialSummary.targetCurrency);

  const [summary, setSummary] = useState(initialSummary);
  const [dailyTx, setDailyTx] = useState(initialTx);
  const [recentLessons, setRecentLessons] = useState(initialRecentLessons);
  const [loading, setLoading] = useState(false);

  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    let cancelled = false;
    const { from, to } = resolveRange(range);
    setLoading(true);
    Promise.all([
      api.get<Summary>('/dashboard/summary', {
        query: { from: from.toISOString(), to: to.toISOString(), target: currency },
      }),
      api.get<DailyTx[]>('/transactions', {
        query: {
          from: from.toISOString(),
          to: to.toISOString(),
          limit: 1000,
          target: currency,
        },
      }),
      api.get<RecentLesson[]>('/lessons', { query: { limit: 5 } }),
    ])
      .then(([s, t, l]) => {
        if (cancelled) return;
        setSummary(s);
        setDailyTx(t);
        setRecentLessons(l);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, currency]);

  const series = useMemo(() => {
    const { from, to } = resolveRange(range);
    return buildSeries(dailyTx, from, to, currency);
  }, [dailyTx, range, currency]);

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div>
          <h1 className="hidden text-xl font-semibold tracking-tight md:block">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            {rangeLabel(range)} · {currency}
          </p>
        </div>
        <div className="flex flex-col-reverse md:flex-row items-start gap-2">
          <RangeTabs value={range} onChange={setRange} />
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="h-9 w-[88px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div
        className={
          'space-y-5 transition-opacity duration-150 ' + (loading ? 'opacity-60' : 'opacity-100')
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Income"
            value={fmtMoney(summary.incomeInTargetCurrency, summary.targetCurrency)}
            tone="income"
          />
          <Stat
            label="Expense"
            value={fmtMoney(summary.expenseInTargetCurrency, summary.targetCurrency)}
            tone="expense"
          />
          <Stat
            label="Net"
            value={fmtMoney(summary.netInTargetCurrency, summary.targetCurrency)}
            tone="net"
            className="col-span-2 sm:col-span-1"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cumulative net P/L</CardTitle>
            <CardDescription className="text-xs">
              {rangeLabel(range)} · running balance ({summary.targetCurrency})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ net: { label: 'Net', color: 'var(--tf-teal)' } } satisfies ChartConfig}
              className="aspect-auto h-56 w-full"
            >
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-net)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-net)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis axisLine={false} tickLine={false} width={40} />
                <ChartTooltip
                  cursor={{ stroke: 'var(--border)' }}
                  content={
                    <ChartTooltipContent indicator="line" formatter={(v) => Number(v).toFixed(2)} />
                  }
                />
                <Area
                  type="natural"
                  dataKey="net"
                  stroke="var(--color-net)"
                  strokeWidth={2}
                  fill="url(#netFill)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent lessons</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLessons.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">No lessons yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentLessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-2 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {studentNames[l.studentId] ?? l.studentId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dateFmt.format(new Date(l.startsAt))} · {l.durationMin} min
                      </div>
                    </div>
                    <span
                      className={
                        'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                        (statusStyles[l.status] ?? 'bg-muted text-muted-foreground')
                      }
                    >
                      {statusLabel[l.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone: 'income' | 'expense' | 'net';
  className?: string;
}) {
  const colour =
    tone === 'income' ? 'text-income' : tone === 'expense' ? 'text-expense' : 'text-net';
  return (
    <div className={'rounded-2xl border border-border bg-card p-4 shadow-sm ' + (className ?? '')}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={'mt-1 text-xl font-semibold tabular-nums ' + colour}>{value}</div>
    </div>
  );
}
