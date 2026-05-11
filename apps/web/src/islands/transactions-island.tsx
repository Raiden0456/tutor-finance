import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import {
  RangeTabs,
  resolveRange,
  rangeLabel,
  type RangeState,
} from '@/components/range-tabs';
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
import { Plus, ArrowDownRight, ArrowUpRight, Pencil, Trash2, Pause, Play, Repeat } from 'lucide-react';
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

type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Recurring {
  id: string;
  amount: number;
  currency: Currency;
  category: string;
  description: string | null;
  frequency: Frequency;
  startDate: string;
  nextDueAt: string;
  isActive: boolean;
}

interface Props {
  initial: Tx[];
  primaryCurrency: Currency;
  initialRecurring: Recurring[];
}


const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const FREQ_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const CATEGORY_PALETTE = [
  'var(--rp-iris)',
  'var(--rp-foam)',
  'var(--rp-rose)',
  'var(--rp-pine)',
  'var(--rp-gold)',
];

export function TransactionsIsland({ initial, primaryCurrency, initialRecurring }: Props) {
  const [tab, setTab] = useState<'transactions' | 'recurring'>('transactions');
  const [range, setRange] = useState<RangeState>({ kind: 'preset', key: '30d' });
  const [txList, setTxList] = useState<Tx[]>(initial);
  const [loading, setLoading] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [recurring, setRecurring] = useState<Recurring[]>(initialRecurring);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    let cancelled = false;
    const { from, to } = resolveRange(range);
    setLoading(true);
    api
      .get<Tx[]>('/transactions', {
        query: {
          limit: 1000,
          target: primaryCurrency,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      })
      .then((data) => { if (!cancelled) setTxList(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, primaryCurrency]);

  const { topCategories, series, chartConfig } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of txList) {
      if (t.type !== 'expense') continue;
      const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      totals.set(t.category, (totals.get(t.category) ?? 0) + v);
    }
    const top = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    const dayMap = new Map<string, Record<string, number>>();
    for (const t of txList) {
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
      const point: Record<string, string | number> = { date: dateFmt.format(new Date(k)) };
      for (const cat of top) {
        point[cat] = Math.round(fromMinorUnits(row[cat] ?? 0, primaryCurrency) * 100) / 100;
      }
      return point;
    });

    const cfg: ChartConfig = {};
    top.forEach((cat, i) => {
      cfg[cat] = { label: cat, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]! };
    });

    return { topCategories: top, series: seriesData, chartConfig: cfg };
  }, [txList, primaryCurrency]);

  const totalExpense = useMemo(() => {
    let expense = 0;
    for (const t of txList) {
      if (t.type === 'expense') {
        expense += typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      }
    }
    return expense;
  }, [txList]);

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const currency = String(data.get('currency') ?? 'USD') as Currency;
    const amountMajor = Number(data.get('amount') ?? 0);
    await api.post('/transactions', {
      type: String(data.get('type')),
      amount: toMinorUnits(amountMajor, currency),
      currency,
      occurredAt: new Date(String(data.get('occurredAt'))).toISOString(),
      category: String(data.get('category') ?? 'misc'),
      description: String(data.get('description') ?? '').trim() || undefined,
    });
    setTxOpen(false);
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Transactions</h1>
            <p className="text-xs text-muted-foreground">
              {tab === 'transactions'
                ? `${rangeLabel(range)} · ${txList.length} entries`
                : recurring.length === 0
                  ? 'No recurring expenses'
                  : `${recurring.length} rules`}
            </p>
          </div>
          {tab === 'transactions' ? (
            <Dialog open={txOpen} onOpenChange={setTxOpen}>
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
                  onSubmit={(e) => { e.preventDefault(); onCreate(e.currentTarget); }}
                  className="flex min-h-0 flex-1 flex-col gap-4"
                >
                  <DialogBody className="grid gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select name="type" defaultValue="expense">
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
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
                    <Button type="submit" className="w-full sm:w-auto">Create</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <RecurringAddButton
              primaryCurrency={primaryCurrency}
              onCreated={(r) => setRecurring((prev) => [...prev, r])}
            />
          )}
        </div>

        {tab === 'transactions' && (
          <RangeTabs value={range} onChange={setRange} />
        )}

        <TabSwitcher value={tab} onChange={setTab} />
      </header>

      {tab === 'transactions' ? (
        <div
          className={'space-y-5 transition-opacity duration-150 ' + (loading ? 'opacity-60' : 'opacity-100')}
        >
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total expenses</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-expense">
              {fmtMoney(totalExpense, primaryCurrency)}
            </div>
          </div>

          {topCategories.length > 0 && series.length > 0 ? (
            <CategoryAreaChart
              categories={topCategories}
              data={series}
              config={chartConfig}
              currency={primaryCurrency}
            />
          ) : null}

          {txList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
              No transactions in this period.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {txList.map((t) => (
                <TxCard key={t.id} tx={t} primaryCurrency={primaryCurrency} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <RecurringList items={recurring} primaryCurrency={primaryCurrency} onChange={setRecurring} />
      )}
    </div>
  );
}


function TabSwitcher({
  value,
  onChange,
}: {
  value: 'transactions' | 'recurring';
  onChange: (v: 'transactions' | 'recurring') => void;
}) {
  return (
    <div
      role="tablist"
      className="flex items-center gap-1 rounded-full bg-muted p-1 text-xs font-medium"
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
              'flex h-8 flex-1 items-center justify-center rounded-full px-3 transition-colors ' +
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

function RecurringAddButton({
  primaryCurrency,
  onCreated,
}: {
  primaryCurrency: Currency;
  onCreated: (r: Recurring) => void;
}) {
  const [open, setOpen] = useState(false);

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const currency = String(data.get('currency') ?? primaryCurrency) as Currency;
    const amountMajor = Number(data.get('amount') ?? 0);
    const result = await api.post<Recurring>('/recurring', {
      amount: toMinorUnits(amountMajor, currency),
      currency,
      category: String(data.get('category') ?? 'misc'),
      description: String(data.get('description') ?? '').trim() || undefined,
      frequency: String(data.get('frequency')),
      startDate: String(data.get('startDate') || new Date().toISOString().slice(0, 10)),
    });
    onCreated(result);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> Add</Button>
      </DialogTrigger>
      <RecurringFormDialog
        title="New recurring expense"
        primaryCurrency={primaryCurrency}
        onSubmit={onCreate}
        onClose={() => setOpen(false)}
      />
    </Dialog>
  );
}

function RecurringFormDialog({
  title,
  primaryCurrency,
  defaults,
  onSubmit,
  onClose: _onClose,
}: {
  title: string;
  primaryCurrency: Currency;
  defaults?: Partial<Recurring>;
  onSubmit: (form: HTMLFormElement) => Promise<void>;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(e.currentTarget);
    } finally {
      setSubmitting(false);
    }
  }

  const defaultCurrency = defaults?.currency ?? primaryCurrency;
  const defaultAmount =
    defaults?.amount != null
      ? String(fromMinorUnits(defaults.amount, defaults.currency ?? primaryCurrency))
      : '';
  const defaultStart = defaults?.startDate
    ? new Date(defaults.startDate).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
        <DialogBody className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input
                id="rec-amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={defaultAmount}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-currency">Currency</Label>
              <Select name="currency" defaultValue={defaultCurrency}>
                <SelectTrigger id="rec-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rec-category">Category</Label>
            <Input
              id="rec-category"
              name="category"
              required
              placeholder="rent / software / utilities …"
              defaultValue={defaults?.category ?? ''}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rec-description">Description</Label>
            <Input id="rec-description" name="description" defaultValue={defaults?.description ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rec-frequency">Frequency</Label>
              <Select name="frequency" defaultValue={defaults?.frequency ?? 'monthly'}>
                <SelectTrigger id="rec-frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-start">Start date</Label>
              <Input id="rec-start" name="startDate" type="date" required defaultValue={defaultStart} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function RecurringList({
  items,
  primaryCurrency,
  onChange,
}: {
  items: Recurring[];
  primaryCurrency: Currency;
  onChange: (items: Recurring[]) => void;
}) {
  const [editing, setEditing] = useState<Recurring | null>(null);

  async function handleToggle(item: Recurring) {
    const updated = await api.patch<Recurring>(`/recurring/${item.id}`, { isActive: !item.isActive });
    onChange(items.map((r) => (r.id === item.id ? updated : r)));
  }

  async function handleDelete(id: string) {
    await api.delete(`/recurring/${id}`);
    onChange(items.filter((r) => r.id !== id));
  }

  async function handleEdit(form: HTMLFormElement, id: string) {
    const data = new FormData(form);
    const currency = String(data.get('currency') ?? primaryCurrency) as Currency;
    const amountMajor = Number(data.get('amount') ?? 0);
    const updated = await api.patch<Recurring>(`/recurring/${id}`, {
      amount: toMinorUnits(amountMajor, currency),
      currency,
      category: String(data.get('category') ?? 'misc'),
      description: String(data.get('description') ?? '').trim() || undefined,
      frequency: String(data.get('frequency')),
    });
    onChange(items.map((r) => (r.id === id ? updated : r)));
    setEditing(null);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
        No recurring expenses yet. Add one to automate regular costs.
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <RecurringCard
            key={r.id}
            item={r}
            onToggle={handleToggle}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        ))}
      </ul>
      {editing && (
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <RecurringFormDialog
            title="Edit recurring expense"
            primaryCurrency={primaryCurrency}
            defaults={editing}
            onSubmit={(form) => handleEdit(form, editing.id)}
            onClose={() => setEditing(null)}
          />
        </Dialog>
      )}
    </>
  );
}

function RecurringCard({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Recurring;
  onToggle: (r: Recurring) => void;
  onEdit: (r: Recurring) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <li
      className={
        'rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity ' +
        (item.isActive ? 'opacity-100' : 'opacity-60')
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' +
            (item.isActive ? 'bg-expense/12' : 'bg-muted')
          }
        >
          <Repeat className={'h-5 w-5 ' + (item.isActive ? 'text-expense' : 'text-muted-foreground')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium capitalize">{item.category}</span>
            <span className="text-base font-semibold tabular-nums text-expense">
              -{fmtMoney(item.amount, item.currency)}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
              {FREQ_LABELS[item.frequency]}
            </span>
            <span>Next: {dateFmt.format(new Date(item.nextDueAt))}</span>
            {!item.isActive && <span className="text-muted-foreground/60">Paused</span>}
          </div>
          {item.description && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onToggle(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={item.isActive ? 'Pause' : 'Resume'}
          >
            {item.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="flex h-8 items-center gap-1 rounded-full bg-destructive/15 px-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
            >
              Confirm
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function TxCard({ tx, primaryCurrency }: { tx: Tx; primaryCurrency: Currency }) {
  const isIncome = tx.type === 'income';
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
  const accent = isIncome ? 'text-income' : 'text-expense';
  const accentBg = isIncome ? 'bg-income/12' : 'bg-expense/12';
  const accentBorder = isIncome ? 'border-l-income' : 'border-l-expense';
  return (
    <li className={'rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm ' + accentBorder}>
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
            <span className="truncate">
              {tx.description || dateFmt.format(new Date(tx.occurredAt))}
            </span>
            {typeof tx.convertedAmount === 'number' && tx.currency !== primaryCurrency ? (
              <span className="shrink-0 tabular-nums">≈ {fmtMoney(tx.convertedAmount, primaryCurrency)}</span>
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
              content={<ChartTooltipContent indicator="dot" formatter={(v) => Number(v).toFixed(2)} />}
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
