import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { RangeTabs, resolveRange, type RangeState } from '@/components/range-tabs';
import { Button } from '@/components/ui/button';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { FinanceStat } from '@/components/finance-stat';
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
import { ChevronLeftIcon, ChevronRightIcon, Plus } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import {
  fromMinorUnits,
  parseMajorToMinor,
  SUPPORTED_CURRENCIES,
  type Currency,
  type WeekStartsOn,
} from '@tutor-finance/shared';
import type { Tx, Recurring, Summary, StudentRef, DailyFinanceStats } from '@/lib/types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_PALETTE } from './constants';
import { TabSwitcher } from './tab-switcher';
import { TxCard } from './tx-card';
import { IncomeExpenseBarChart, CategoryPieChart } from './charts';
import { RecurringAddButton } from './recurring/add-button';
import { RecurringList } from './recurring/list';
import { ComparisonView } from './comparison';

const PAGE_SIZE = 15;

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push('ellipsis');

  pages.push(totalPages);
  return pages;
}

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

function formatRangeLabel(range: RangeState, locale: string, t: (key: string) => string) {
  if (range.kind === 'preset') return t(range.key);
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return `${fmt.format(range.from)} – ${fmt.format(range.to)}`;
}

export function TransactionsIsland(props: Props) {
  return (
    <I18nProvider locale={props.locale}>
      <TransactionsIslandContent {...props} />
    </I18nProvider>
  );
}

function TransactionsIslandContent({
  initial,
  primaryCurrency,
  initialRecurring,
  initialSummary,
  initialDailyStats,
  students,
  weekStartsOn,
}: Props) {
  const { locale, t } = useI18n();
  const [tab, setTab] = useState<'transactions' | 'recurring' | 'analytics'>('transactions');
  const [range, setRange] = useState<RangeState>({ kind: 'preset', key: '30d' });
  const [currency, setCurrency] = useState<Currency>(primaryCurrency);
  const [txList, setTxList] = useState<Tx[]>(initial);
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [dailyStats, setDailyStats] = useState<DailyFinanceStats[]>(initialDailyStats);
  const [loading, setLoading] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [recurring, setRecurring] = useState<Recurring[]>(initialRecurring);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [page, setPage] = useState(1);
  const isFirst = useRef(true);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const totalPages = Math.max(1, Math.ceil(txList.length / PAGE_SIZE));
  const pageItems = useMemo(() => getPaginationItems(page, totalPages), [page, totalPages]);
  const paginatedTxList = useMemo(
    () => txList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [page, txList],
  );

  useEffect(() => {
    setPage(1);
  }, [range, currency]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

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
      api.get<DailyFinanceStats[]>('/dashboard/daily-stats', {
        query: { from: from.toISOString(), to: to.toISOString(), target: currency },
      }),
    ])
      .then(([txs, sum, daily]) => {
        if (!cancelled) {
          setTxList(txs);
          setSummary(sum);
          setDailyStats(daily);
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

    for (const t of txList) {
      const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      if (!v) continue;

      if (t.type === 'expense') {
        totals.set(t.category, (totals.get(t.category) ?? 0) + v);
      }
    }

    const pie = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt], i) => ({
        name: t(`category.${cat}`),
        amount: Math.round(fromMinorUnits(amt, currency) * 100) / 100,
        fill: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]!,
      }));

    return { pieData: pie, incomeExpenseSeries: dailyStats };
  }, [txList, dailyStats, currency, t]);

  const totalIncome = summary.incomeInTargetCurrency;
  const totalExpense = summary.expenseInTargetCurrency;

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const txCurrency = String(data.get('currency') ?? 'USD') as Currency;
    await api.post('/transactions', {
      type: String(data.get('type')),
      amount: parseMajorToMinor(String(data.get('amount') ?? ''), txCurrency),
      currency: txCurrency,
      occurredAt: new Date(String(data.get('occurredAt'))).toISOString(),
      category: String(data.get('category') ?? 'other'),
      description: String(data.get('description') ?? '').trim() || undefined,
    });

    const { from, to } = resolveRange(range);
    const [txs, sum, daily] = await Promise.all([
      api.get<Tx[]>('/transactions', {
        query: { limit: 1000, target: currency, from: from.toISOString(), to: to.toISOString() },
      }),
      api.get<Summary>('/dashboard/summary', {
        query: { from: from.toISOString(), to: to.toISOString(), target: currency },
      }),
      api.get<DailyFinanceStats[]>('/dashboard/daily-stats', {
        query: { from: from.toISOString(), to: to.toISOString(), target: currency },
      }),
    ]);
    setTxList(txs);
    setSummary(sum);
    setDailyStats(daily);
    setTxType('expense');
    setTxOpen(false);
  }

  return (
    <div className="page-enter space-y-5">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="hidden text-xl font-semibold tracking-tight md:block">
              {t('Transactions')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {tab === 'transactions'
                ? `${formatRangeLabel(range, locale, t)} · ${t('{count} entries', { count: txList.length })}`
                : tab === 'recurring'
                  ? recurring.length === 0
                    ? t('No recurring expenses')
                    : t('{count} rules', { count: recurring.length })
                  : t('Growth & period comparison')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(tab === 'transactions' || tab === 'analytics') && (
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
            {tab === 'analytics' ? null : tab === 'transactions' ? (
              <ResponsiveModal
                open={txOpen}
                onOpenChange={(open) => {
                  setTxOpen(open);
                  if (!open) setTxType('expense');
                }}
              >
                <ResponsiveModalTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4" /> {t('Add')}
                  </Button>
                </ResponsiveModalTrigger>
                <ResponsiveModalContent className="max-w-md">
                  <ResponsiveModalHeader>
                    <ResponsiveModalTitle>{t('New transaction')}</ResponsiveModalTitle>
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
                          <Label htmlFor="type">{t('Type')}</Label>
                          <Select
                            name="type"
                            value={txType}
                            onValueChange={(v) => setTxType(v as 'income' | 'expense')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">{t('Income')}</SelectItem>
                              <SelectItem value="expense">{t('Expense')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="occurredAt">{t('Date')}</Label>
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
                          <Label htmlFor="amount">{t('Amount')}</Label>
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
                          <Label htmlFor="currency">{t('Currency')}</Label>
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
                        <Label htmlFor="category">{t('Category')}</Label>
                        <Select name="category" defaultValue="other" key={txType}>
                          <SelectTrigger id="category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(txType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                              (c) => (
                                <SelectItem key={c} value={c} className="capitalize">
                                  {t(`category.${c}`)}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">{t('Description')}</Label>
                        <Input id="description" name="description" />
                      </div>
                    </ResponsiveModalBody>
                    <ResponsiveModalFooter>
                      <Button type="submit" className="w-full sm:w-auto">
                        {t('Create')}
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
          <TabSwitcher
            value={tab}
            onChange={setTab}
            groupId="tx-main"
            tabs={[
              { key: 'transactions', label: t('Transactions') },
              { key: 'recurring', label: t('Recurring') },
              { key: 'analytics', label: t('Analytics') },
            ]}
          />
          <Collapse open={tab === 'transactions'} className="md:flex-1" duration={0.18}>
            <RangeTabs
              value={range}
              onChange={setRange}
              groupId="tx-list"
              weekStartsOn={weekStartsOn}
            />
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
              <FinanceStat
                label={t('Planned')}
                value={fmtMoney(summary.plannedIncomeInTargetCurrency, currency)}
                tone="planned"
              />
              <FinanceStat
                label={t('Income')}
                value={fmtMoney(totalIncome, currency)}
                tone="income"
              />
              <FinanceStat
                label={t('Expenses')}
                value={fmtMoney(totalExpense, currency)}
                tone="expense"
              />
              <FinanceStat
                label={t('Net')}
                value={fmtMoney(totalIncome - totalExpense, currency)}
                tone={totalIncome >= totalExpense ? 'income' : 'expense'}
              />
            </div>

            <Collapse open={incomeExpenseSeries.length > 0}>
              <IncomeExpenseBarChart
                data={incomeExpenseSeries}
                currency={currency}
                weekStartsOn={weekStartsOn}
              />
            </Collapse>

            <Collapse open={pieData.length > 0}>
              <CategoryPieChart data={pieData} currency={currency} />
            </Collapse>

            <FadeSwap motionKey={txList.length === 0 ? 'empty' : 'list'}>
              {txList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
                  {t('No transactions in this period.')}
                </div>
              ) : (
                <div className="space-y-4">
                  <FadeSwap motionKey={`tx-page-${page}`}>
                    <ul className="flex flex-col gap-2">
                      {paginatedTxList.map((t) => (
                        <TxCard
                          key={t.id}
                          tx={t}
                          primaryCurrency={currency}
                          studentMap={studentMap}
                        />
                      ))}
                    </ul>
                  </FadeSwap>
                  <Collapse open={totalPages > 1}>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            aria-disabled={page === 1}
                            aria-label={t('Go to previous page')}
                            size="default"
                            className={
                              'gap-1 px-2.5 sm:pl-2.5 ' +
                              (page === 1 ? 'pointer-events-none opacity-50' : 'transition-opacity')
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              setPage((current) => Math.max(1, current - 1));
                            }}
                          >
                            <ChevronLeftIcon />
                            <span className="hidden sm:block">{t('Previous')}</span>
                          </PaginationLink>
                        </PaginationItem>
                        {pageItems.map((item, index) => (
                          <PaginationItem key={`${item}-${index}`}>
                            {item === 'ellipsis' ? (
                              <PaginationEllipsis aria-label={t('More pages')} />
                            ) : (
                              <PaginationLink
                                href="#"
                                isActive={item === page}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(item);
                                }}
                              >
                                {item}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            aria-disabled={page === totalPages}
                            aria-label={t('Go to next page')}
                            size="default"
                            className={
                              'gap-1 px-2.5 sm:pr-2.5 ' +
                              (page === totalPages
                                ? 'pointer-events-none opacity-50'
                                : 'transition-opacity')
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              setPage((current) => Math.min(totalPages, current + 1));
                            }}
                          >
                            <span className="hidden sm:block">{t('Next')}</span>
                            <ChevronRightIcon />
                          </PaginationLink>
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </Collapse>
                </div>
              )}
            </FadeSwap>
          </div>
        ) : tab === 'recurring' ? (
          <RecurringList
            items={recurring}
            primaryCurrency={primaryCurrency}
            onChange={setRecurring}
          />
        ) : (
          <ComparisonView currency={currency} weekStartsOn={weekStartsOn} />
        )}
      </FadeSwap>
    </div>
  );
}
