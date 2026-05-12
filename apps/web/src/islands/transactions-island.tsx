import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis } from 'recharts';
import { api } from '@/lib/api';
import { RangeTabs, resolveRange, rangeLabel, type RangeState } from '@/components/range-tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Trash2,
  Pause,
  Play,
  Repeat,
} from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import {
  fromMinorUnits,
  SUPPORTED_CURRENCIES,
  toMinorUnits,
  type Currency,
} from '@tutor-finance/shared';
import type { Tx, Frequency, Recurring, Summary } from '@/lib/types';

interface Props {
  initial: Tx[];
  primaryCurrency: Currency;
  initialRecurring: Recurring[];
  initialSummary: Summary;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

const FREQ_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const CATEGORY_PALETTE = [
  'var(--tf-indigo)',
  'var(--tf-teal)',
  'var(--tf-coral)',
  'var(--tf-jade)',
  'var(--tf-pollen)',
];

export function TransactionsIsland({
  initial,
  primaryCurrency,
  initialRecurring,
  initialSummary,
}: Props) {
  const [tab, setTab] = useState<'transactions' | 'recurring'>('transactions');
  const [range, setRange] = useState<RangeState>({ kind: 'preset', key: '30d' });
  const [currency, setCurrency] = useState<Currency>(primaryCurrency);
  const [txList, setTxList] = useState<Tx[]>(initial);
  const [summary, setSummary] = useState<Summary>(initialSummary);
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
    Promise.all([
      api.get<Tx[]>('/transactions', {
        query: { limit: 1000, target: currency, from: from.toISOString(), to: to.toISOString() },
      }),
      api.get<Summary>('/dashboard/summary', {
        query: { from: from.toISOString(), to: to.toISOString(), target: currency },
      }),
    ])
      .then(([txs, sum]) => {
        if (!cancelled) {
          setTxList(txs);
          setSummary(sum);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, currency]);

  const { pieData, incomeExpenseSeries } = useMemo(() => {
    const totals = new Map<string, number>();
    const ieMap = new Map<string, { income: number; expense: number }>();

    for (const t of txList) {
      const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      if (!v) continue;
      const k = new Date(t.occurredAt).toISOString().slice(0, 10);

      const ieRow = ieMap.get(k) ?? { income: 0, expense: 0 };
      if (t.type === 'income') ieRow.income += v;
      else ieRow.expense += v;
      ieMap.set(k, ieRow);

      if (t.type === 'expense') {
        totals.set(t.category, (totals.get(t.category) ?? 0) + v);
      }
    }

    const pie = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt], i) => ({
        name: cat,
        amount: Math.round(fromMinorUnits(amt, currency) * 100) / 100,
        fill: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]!,
      }));

    const ie = Array.from(ieMap.keys())
      .sort()
      .map((k) => {
        const row = ieMap.get(k)!;
        return {
          date: dateFmt.format(new Date(k)),
          income: Math.round(fromMinorUnits(row.income, currency) * 100) / 100,
          expense: Math.round(fromMinorUnits(row.expense, currency) * 100) / 100,
        };
      });

    return { pieData: pie, incomeExpenseSeries: ie };
  }, [txList, currency]);

  const { totalExpense, totalIncome } = useMemo(() => {
    let expense = 0;
    let income = 0;
    for (const t of txList) {
      const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      if (t.type === 'expense') expense += v;
      else income += v;
    }
    return { totalExpense: expense, totalIncome: income };
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
    <div className="page-enter space-y-5">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="hidden text-xl font-semibold tracking-tight md:block">Transactions</h1>
            <p className="text-xs text-muted-foreground">
              {tab === 'transactions'
                ? `${rangeLabel(range)} · ${txList.length} entries`
                : recurring.length === 0
                  ? 'No recurring expenses'
                  : `${recurring.length} rules`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === 'transactions' && (
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
            )}
            {tab === 'transactions' ? (
              <ResponsiveModal open={txOpen} onOpenChange={setTxOpen}>
                <ResponsiveModalTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </ResponsiveModalTrigger>
                <ResponsiveModalContent className="max-w-md">
                  <ResponsiveModalHeader>
                    <ResponsiveModalTitle>New transaction</ResponsiveModalTitle>
                  </ResponsiveModalHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onCreate(e.currentTarget);
                    }}
                    className="flex min-h-0 flex-1 flex-col gap-4"
                  >
                    <ResponsiveModalBody className="grid gap-4">
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
                            defaultValue={new Date(
                              Date.now() - new Date().getTimezoneOffset() * 60000,
                            )
                              .toISOString()
                              .slice(0, 16)}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="amount">Amount</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                          />
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
                        <Input
                          id="category"
                          name="category"
                          required
                          placeholder="supplies / software / refund …"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" />
                      </div>
                    </ResponsiveModalBody>
                    <ResponsiveModalFooter>
                      <Button type="submit" className="w-full sm:w-auto">
                        Create
                      </Button>
                    </ResponsiveModalFooter>
                  </form>
                </ResponsiveModalContent>
              </ResponsiveModal>
            ) : (
              <RecurringAddButton
                primaryCurrency={primaryCurrency}
                onCreated={(r) => setRecurring((prev) => [...prev, r])}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <TabSwitcher value={tab} onChange={setTab} />
          <Collapse open={tab === 'transactions'} className="md:flex-1">
            <RangeTabs value={range} onChange={setRange} />
          </Collapse>
        </div>
      </header>

      <FadeSwap motionKey={tab}>
        {tab === 'transactions' ? (
          <div
            className={
              'space-y-5 transition-opacity duration-150 ' +
              (loading ? 'opacity-60' : 'opacity-100')
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <TxStat
                label="Planned"
                value={fmtMoney(summary.plannedIncomeInTargetCurrency, currency)}
                tone="planned"
              />
              <TxStat label="Income" value={fmtMoney(totalIncome, currency)} tone="income" />
              <TxStat label="Expenses" value={fmtMoney(totalExpense, currency)} tone="expense" />
              <TxStat
                label="Net"
                value={fmtMoney(totalIncome - totalExpense, currency)}
                tone={totalIncome >= totalExpense ? 'income' : 'expense'}
              />
            </div>

            <Collapse open={incomeExpenseSeries.length > 0}>
              <IncomeExpenseBarChart data={incomeExpenseSeries} currency={currency} />
            </Collapse>

            <Collapse open={pieData.length > 0}>
              <CategoryPieChart data={pieData} currency={currency} />
            </Collapse>

            <FadeSwap motionKey={txList.length === 0 ? 'empty' : 'list'}>
              {txList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
                  No transactions in this period.
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {txList.map((t) => (
                    <TxCard key={t.id} tx={t} primaryCurrency={currency} />
                  ))}
                </ul>
              )}
            </FadeSwap>
          </div>
        ) : (
          <RecurringList
            items={recurring}
            primaryCurrency={primaryCurrency}
            onChange={setRecurring}
          />
        )}
      </FadeSwap>
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
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </ResponsiveModalTrigger>
      <RecurringFormDialog
        title="New recurring expense"
        primaryCurrency={primaryCurrency}
        onSubmit={onCreate}
        onClose={() => setOpen(false)}
      />
    </ResponsiveModal>
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
    <ResponsiveModalContent className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
      </ResponsiveModalHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
        <ResponsiveModalBody className="grid gap-4">
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
                <SelectTrigger id="rec-currency">
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
            <Input
              id="rec-description"
              name="description"
              defaultValue={defaults?.description ?? ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rec-frequency">Frequency</Label>
              <Select name="frequency" defaultValue={defaults?.frequency ?? 'monthly'}>
                <SelectTrigger id="rec-frequency">
                  <SelectValue />
                </SelectTrigger>
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
              <Input
                id="rec-start"
                name="startDate"
                type="date"
                required
                defaultValue={defaultStart}
              />
            </div>
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            Save
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModalContent>
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
    const updated = await api.patch<Recurring>(`/recurring/${item.id}`, {
      isActive: !item.isActive,
    });
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

  return (
    <FadeSwap motionKey={items.length === 0 ? 'empty' : 'list'}>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
          No recurring expenses yet. Add one to automate regular costs.
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {items.map((r) => (
                <RecurringCard
                  key={r.id}
                  item={r}
                  onToggle={handleToggle}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </ul>
          {editing && (
            <ResponsiveModal open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
              <RecurringFormDialog
                title="Edit recurring expense"
                primaryCurrency={primaryCurrency}
                defaults={editing}
                onSubmit={(form) => handleEdit(form, editing.id)}
                onClose={() => setEditing(null)}
              />
            </ResponsiveModal>
          )}
        </>
      )}
    </FadeSwap>
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
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={
        'overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity ' +
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
          <Repeat
            className={'h-5 w-5 ' + (item.isActive ? 'text-expense' : 'text-muted-foreground')}
          />
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
              key="confirm"
              type="button"
              onClick={() => onDelete(item.id)}
              className="animate-in fade-in zoom-in-95 flex h-8 items-center gap-1 rounded-full bg-destructive/15 px-2 text-xs font-medium text-destructive transition-colors duration-150 hover:bg-destructive hover:text-destructive-foreground"
            >
              Confirm
            </button>
          ) : (
            <button
              key="delete"
              type="button"
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
              className="animate-in fade-in zoom-in-95 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.li>
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
        <div
          className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' + accentBg}
        >
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

function TxStat({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: string;
  tone: 'planned' | 'income' | 'expense';
  className?: string;
}) {
  const colour =
    tone === 'income' ? 'text-income' : tone === 'planned' ? 'text-tf-indigo' : 'text-expense';
  return (
    <div className={'rounded-2xl border border-border bg-card p-4 shadow-sm ' + (className ?? '')}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={'mt-1 text-xl font-semibold tabular-nums ' + colour}>{value}</div>
    </div>
  );
}

const ieBarConfig = {
  income: { label: 'Income', color: 'var(--tf-jade)' },
  expense: { label: 'Expenses', color: 'var(--tf-coral)' },
} satisfies ChartConfig;

function IncomeExpenseBarChart({
  data,
  currency,
}: {
  data: { date: string; income: number; expense: number }[];
  currency: Currency;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Income vs Expenses</CardTitle>
        <CardDescription className="text-xs">Daily totals ({currency})</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={ieBarConfig} className="aspect-auto h-56 w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent indicator="dashed" formatter={(v) => Number(v).toFixed(2)} />
              }
            />
            <Bar dataKey="income" fill="var(--color-income)" radius={4} />
            <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const pieCfg: ChartConfig = {
  amount: { label: 'Expenses' },
};

function CategoryPieChart({
  data,
  currency,
}: {
  data: { name: string; amount: number; fill: string }[];
  currency: Currency;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">Expenses by category</CardTitle>
        <CardDescription className="text-xs">
          Top {data.length} categories ({currency})
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={pieCfg}
          className="mx-auto aspect-square max-h-[220px] [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="name"
                  hideLabel
                  formatter={(v) => Number(v).toFixed(2)}
                />
              }
            />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              label={({ percent }) =>
                (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
              }
              labelLine={false}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardContent className="pt-0 pb-4">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: item.fill }}
              />
              <span className="capitalize text-muted-foreground">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
