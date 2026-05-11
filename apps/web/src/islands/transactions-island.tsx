import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { fromMinorUnits, SUPPORTED_CURRENCIES, toMinorUnits, type Currency } from '@tutor-finance/shared';

interface Tx {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: Currency;
  occurredAt: string;
  category: string;
  studentId?: string | null;
  description?: string | null;
  convertedAmount?: number | null;
}

interface Props {
  initial: Tx[];
  primaryCurrency: Currency;
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const CATEGORY_PALETTE = [
  'var(--rp-iris)',
  'var(--rp-foam)',
  'var(--rp-rose)',
  'var(--rp-pine)',
  'var(--rp-gold)',
];

export function TransactionsIsland({ initial, primaryCurrency }: Props) {
  const [open, setOpen] = useState(false);

  const { topCategories, series, chartConfig } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of initial) {
      if (t.type !== 'expense') continue;
      const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      totals.set(t.category, (totals.get(t.category) ?? 0) + v);
    }
    const top = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    const dayMap = new Map<string, Record<string, number>>();
    for (const t of initial) {
      if (t.type !== 'expense') continue;
      const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      if (!v) continue;
      const cat = top.includes(t.category) ? t.category : 'other';
      const k = new Date(t.occurredAt).toISOString().slice(0, 10);
      const row = dayMap.get(k) ?? {};
      row[cat] = (row[cat] ?? 0) + v;
      dayMap.set(k, row);
    }

    const sortedDays = Array.from(dayMap.keys()).sort();
    const seriesData = sortedDays.map((k) => {
      const row = dayMap.get(k)!;
      const point: Record<string, string | number> = {
        date: dateFmt.format(new Date(k)),
      };
      for (const cat of top) {
        point[cat] = Math.round(fromMinorUnits(row[cat] ?? 0, primaryCurrency) * 100) / 100;
      }
      return point;
    });

    const cfg: ChartConfig = {};
    top.forEach((cat, i) => {
      cfg[cat] = {
        label: cat,
        color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]!,
      };
    });

    return { topCategories: top, series: seriesData, chartConfig: cfg };
  }, [initial, primaryCurrency]);

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const currency = String(data.get('currency') ?? 'USD') as Currency;
    const amountMajor = Number(data.get('amount') ?? 0);
    const input = {
      type: String(data.get('type')),
      amount: toMinorUnits(amountMajor, currency),
      currency,
      occurredAt: new Date(String(data.get('occurredAt'))).toISOString(),
      category: String(data.get('category') ?? 'misc'),
      description: String(data.get('description') ?? '').trim() || undefined,
    };
    await api.post('/transactions', input);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Transactions</h1>
          <p className="text-xs text-muted-foreground">
            {initial.length === 0 ? 'No entries yet' : `${initial.length} entries`}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New transaction</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreate(e.currentTarget);
              }}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <DialogBody className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" defaultValue="expense">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="occurredAt">Date</Label>
                    <Input
                      id="occurredAt"
                      name="occurredAt"
                      type="datetime-local"
                      required
                      defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select name="currency" defaultValue={primaryCurrency}>
                      <SelectTrigger>
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" required placeholder="supplies / software / refund …" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button type="submit" className="w-full sm:w-auto">
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {topCategories.length > 0 && series.length > 0 ? (
        <CategoryAreaChart
          categories={topCategories}
          data={series}
          config={chartConfig}
          currency={primaryCurrency}
        />
      ) : null}

      {initial.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
          No transactions yet.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {initial.map((t) => (
            <TxCard key={t.id} tx={t} primaryCurrency={primaryCurrency} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TxCard({ tx, primaryCurrency }: { tx: Tx; primaryCurrency: Currency }) {
  const isIncome = tx.type === 'income';
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
  const accent = isIncome ? 'text-income' : 'text-expense';
  const accentBg = isIncome ? 'bg-income/12' : 'bg-expense/12';
  const accentBorder = isIncome ? 'border-l-income' : 'border-l-expense';
  return (
    <li
      className={
        'rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm ' + accentBorder
      }
    >
      <div className="flex items-start gap-3">
        <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' + accentBg}>
          <Icon className={'h-5 w-5 ' + accent} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0 truncate text-sm font-medium capitalize">{tx.category}</div>
            <div className={'text-base font-semibold tabular-nums ' + accent}>
              {isIncome ? '+' : '−'}
              {fmtMoney(tx.amount, tx.currency)}
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate">{tx.description || dateFmt.format(new Date(tx.occurredAt))}</span>
            {typeof tx.convertedAmount === 'number' && tx.currency !== primaryCurrency ? (
              <span className="shrink-0 tabular-nums">
                ≈ {fmtMoney(tx.convertedAmount, primaryCurrency)}
              </span>
            ) : (
              <span className="shrink-0">{dateFmt.format(new Date(tx.occurredAt))}</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function CategoryAreaChart({
  categories,
  data,
  config,
  currency,
}: {
  categories: string[];
  data: Record<string, string | number>[];
  config: ChartConfig;
  currency: Currency;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Expenses by category</CardTitle>
        <CardDescription className="text-xs">
          Daily totals · top {categories.length} categories ({currency})
        </CardDescription>
      </CardHeader>
      <CardContent className="px-1 pb-3">
        <ChartContainer config={config} className="aspect-auto h-56 w-full">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              {categories.map((cat) => (
                <linearGradient id={`fill-${cat}`} key={cat} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`var(--color-${cat})`} stopOpacity={0.6} />
                  <stop offset="100%" stopColor={`var(--color-${cat})`} stopOpacity={0.05} />
                </linearGradient>
              ))}
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
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(v) => Number(v).toFixed(2)}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />} />
            {categories.map((cat) => (
              <Area
                key={cat}
                type="natural"
                dataKey={cat}
                stackId="expense"
                stroke={`var(--color-${cat})`}
                strokeWidth={1.5}
                fill={`url(#fill-${cat})`}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

