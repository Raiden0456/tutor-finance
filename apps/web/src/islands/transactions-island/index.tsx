import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { GitCompareArrows, Plus } from 'lucide-react';
import {
  fromMinorUnits,
  SUPPORTED_CURRENCIES,
  type Currency,
  type WeekStartsOn,
} from '@tutor-finance/shared';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { I18nProvider, useI18n } from '@/lib/i18n';
import type { DailyFinanceStats, Recurring, StudentRef, Summary, Tx } from '@/lib/types';
import { errorMessage } from '@/hooks/use-mutation';
import { RangeTabs, resolveRange, type RangeState } from '@/components/range-tabs';
import { FinanceStat } from '@/components/finance-stat';
import { PageHeader } from '@/components/layout/page-header';
import { useDataChanged } from '@/features/assistant';
import { Button } from '@/components/ui/button';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import { Toggle } from '@/components/ui/toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_PALETTE, categoryLabel } from './constants';
import { TabSwitcher } from '@/components/tab-switcher';
import { IncomeExpenseBarChart, CategoryPieChart } from './charts';
import { PeriodComparison } from './comparison';
import { RecurringList } from './recurring/list';
import { RecurringCreateDialog } from './recurring/create-dialog';
import { TransactionList } from './transactions/list';
import { TransactionFormDialog, type TransactionPayload } from './transactions/form-dialog';

type FinanceTab = 'transactions' | 'recurring';

interface Props {
  initial: Tx[];
  primaryCurrency: Currency;
  initialRecurring: Recurring[];
  initialSummary: Summary;
  initialDailyStats: DailyFinanceStats[];
  students: StudentRef[];
  weekStartsOn: WeekStartsOn;
  locale?: string | null;
}

export function TransactionsIsland(props: Props) {
  return (
    <I18nProvider locale={props.locale}>
      <TransactionsContent {...props} />
    </I18nProvider>
  );
}

function TransactionsContent({
  initial,
  primaryCurrency,
  initialRecurring,
  initialSummary,
  initialDailyStats,
  students,
  weekStartsOn,
}: Props) {
  const { locale, t } = useI18n();
  const [tab, setTab] = useState<FinanceTab>('transactions');
  const [range, setRange] = useState<RangeState>({ kind: 'preset', key: '30d' });
  const [currency, setCurrency] = useState<Currency>(primaryCurrency);
  const [compare, setCompare] = useState(false);
  const [txList, setTxList] = useState<Tx[]>(initial);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [dailyStats, setDailyStats] = useState<DailyFinanceStats[]>(initialDailyStats);
  const [loading, setLoading] = useState(false);
  const [recurring, setRecurring] = useState<Recurring[]>(initialRecurring);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Tx | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const requestId = useRef(0);
  const isFirst = useRef(true);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    const { from, to } = resolveRange(range);
    const query = { from: from.toISOString(), to: to.toISOString(), target: currency };
    const [txs, sum, daily] = await Promise.all([
      api.get<Tx[]>('/transactions', { query: { ...query, limit: 1000 } }),
      api.get<Summary>('/dashboard/summary', { query }),
      api.get<DailyFinanceStats[]>('/dashboard/daily-stats', { query }),
    ]);
    if (id !== requestId.current) return;
    setTxList(txs);
    setSummary(sum);
    setDailyStats(daily);
  }, [range, currency]);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setLoading(true);
    reload()
      .catch((error) => toast.error(errorMessage(error, t)))
      .finally(() => setLoading(false));
  }, [reload]);

  useDataChanged(() => {
    reload().catch((error) => toast.error(errorMessage(error, t)));
  });

  const pieData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const tx of txList) {
      if (tx.type !== 'expense' || !tx.convertedAmount) continue;
      totals.set(tx.category, (totals.get(tx.category) ?? 0) + tx.convertedAmount);
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt], i) => ({
        name: categoryLabel(cat, t),
        amount: Math.round(fromMinorUnits(amt, currency) * 100) / 100,
        fill: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]!,
      }));
  }, [txList, currency, t]);

  async function saveTransaction({ type, ...patch }: TransactionPayload) {
    if (editingTx) await api.patch(`/transactions/${editingTx.id}`, patch);
    else await api.post('/transactions', { type, ...patch });
    await reload();
  }

  function openCreate() {
    if (tab === 'recurring') {
      setRecurringOpen(true);
      return;
    }
    setEditingTx(null);
    setTxFormOpen(true);
  }

  const rangeLabel =
    range.kind === 'preset'
      ? t(range.key)
      : `${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(range.from)} – ${new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(range.to)}`;

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        title={t('Finance')}
        subtitle={
          tab === 'transactions'
            ? `${rangeLabel} · ${t('{count} entries', { count: txList.length })}`
            : recurring.length === 0
              ? t('No recurring expenses')
              : t('{count} rules', { count: recurring.length })
        }
        actionKey={tab}
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {tab === 'transactions' ? t('Add transaction') : t('Add recurring expense')}
          </Button>
        }
      />

      <TabSwitcher
        value={tab}
        onChange={setTab}
        groupId="finance-main"
        tabs={[
          { key: 'transactions', label: t('Transactions') },
          { key: 'recurring', label: t('Recurring') },
        ]}
      />

      <FadeSwap motionKey={tab}>
        {tab === 'transactions' ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <RangeTabs
                value={range}
                onChange={setRange}
                groupId="finance-range"
                weekStartsOn={weekStartsOn}
              />
              <div className="flex items-center justify-between gap-3 md:flex-1 md:justify-end">
                <Toggle
                  variant="outline"
                  size="sm"
                  pressed={compare}
                  onPressedChange={setCompare}
                  className="rounded-full px-3 text-xs transition-all duration-200 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  {t('Compare with previous period')}
                </Toggle>
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
            </div>

            <div
              className={
                'space-y-5 transition-opacity duration-150 ' +
                (loading ? 'opacity-60' : 'opacity-100')
              }
            >
              <FadeSwap motionKey={compare ? 'compare' : 'totals'}>
                {compare ? (
                  <PeriodComparison range={range} currency={currency} current={summary} />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FinanceStat
                      label={t('Income')}
                      value={fmtMoney(summary.incomeInTargetCurrency, currency)}
                      tone="income"
                    />
                    <FinanceStat
                      label={t('Expenses')}
                      value={fmtMoney(summary.expenseInTargetCurrency, currency)}
                      tone="expense"
                    />
                    <FinanceStat
                      label={t('Net')}
                      value={fmtMoney(summary.netInTargetCurrency, currency)}
                      tone={summary.netInTargetCurrency >= 0 ? 'income' : 'expense'}
                    />
                    <FinanceStat
                      label={t('Planned')}
                      value={fmtMoney(summary.plannedIncomeInTargetCurrency, currency)}
                      tone="planned"
                    />
                  </div>
                )}
              </FadeSwap>

              <Collapse open={dailyStats.length > 0}>
                <IncomeExpenseBarChart
                  data={dailyStats}
                  currency={currency}
                  weekStartsOn={weekStartsOn}
                />
              </Collapse>

              <Collapse open={pieData.length > 0}>
                <CategoryPieChart data={pieData} currency={currency} />
              </Collapse>

              <TransactionList
                key={`${JSON.stringify(range)}-${currency}`}
                items={txList}
                currency={currency}
                studentMap={studentMap}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setTxFormOpen(true);
                }}
                onDeleted={reload}
              />
            </div>
          </div>
        ) : (
          <RecurringList
            items={recurring}
            primaryCurrency={primaryCurrency}
            onChange={setRecurring}
          />
        )}
      </FadeSwap>

      <TransactionFormDialog
        open={txFormOpen}
        onOpenChange={setTxFormOpen}
        editing={editingTx}
        primaryCurrency={primaryCurrency}
        students={students}
        onSubmit={saveTransaction}
      />
      <RecurringCreateDialog
        open={recurringOpen}
        onOpenChange={setRecurringOpen}
        primaryCurrency={primaryCurrency}
        onCreated={(r) => setRecurring((prev) => [...prev, r])}
      />
    </div>
  );
}
