import * as React from 'react';
import { Pressable, View } from 'react-native';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import {
  Plus,
  Pencil,
  Trash2,
  Pause,
  Play,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import { fromMinorUnits } from '@tutor-finance/shared';
import { Screen } from '~/components/common/screen';
import { RangeTabs, RANGE_DAYS, type RangeKey } from '~/components/common/range-tabs';
import { SelectField } from '~/components/common/select-field';
import { FinanceStat } from '~/components/dashboard/finance-stat';
import { IncomeExpenseChart } from '~/components/charts/income-expense-chart';
import { CategoryPieChart, type PieDatum } from '~/components/charts/category-pie-chart';
import { TransactionForm } from '~/components/forms/transaction-form';
import { RecurringForm } from '~/components/forms/recurring-form';
import { EmptyState } from '~/components/common/empty-state';
import { Fab } from '~/components/common/fab';
import { Segmented } from '~/components/common/segmented';
import { TabFade } from '~/components/common/tab-fade';
import { StaggerItem } from '~/components/common/stagger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useI18n, type TFunction } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import { categoryLabel, currencyOptions } from '~/lib/catalog';
import { formatDate, money, moneyMajor } from '~/lib/format';
import { useColorScheme } from '~/lib/use-color-scheme';
import type { Currency, DailyFinanceStats, Recurring, Student, Summary, Tx } from '~/lib/types';

export default function TransactionsScreen() {
  const { t } = useI18n();
  const [tab, setTab] = React.useState<'overview' | 'recurring' | 'comparison'>('overview');
  const [range, setRange] = React.useState<RangeKey>('30d');
  const [txFormOpen, setTxFormOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Tx | null>(null);

  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [],
  );

  const openNew = () => {
    setEditingTx(null);
    setTxFormOpen(true);
  };

  return (
    <View className="flex-1">
      <Screen title={t('Transactions')}>
        <View className="gap-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'overview', label: t('Overview') },
              { value: 'recurring', label: t('Recurring') },
              { value: 'comparison', label: t('Comparison') },
            ]}
          />
          <TabFade tabKey={tab}>
            {tab === 'overview' ? (
              <OverviewTab
                range={range}
                setRange={setRange}
                students={students.data ?? []}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setTxFormOpen(true);
                }}
              />
            ) : tab === 'recurring' ? (
              <RecurringTab />
            ) : (
              <ComparisonTab />
            )}
          </TabFade>
        </View>
      </Screen>

      {tab === 'overview' ? <Fab onPress={openNew} /> : null}
      <TransactionForm
        open={txFormOpen}
        onOpenChange={setTxFormOpen}
        transaction={editingTx}
        students={students.data ?? []}
        onSaved={() => setTab('overview')}
      />
    </View>
  );
}

const PIE_COLORS = (c: ReturnType<typeof useColorScheme>['colors']) => [
  c.indigo,
  c.teal,
  c.coral,
  c.pollen,
  c.jade,
  c.mutedForeground,
];

function OverviewTab({
  range,
  setRange,
  students,
  onEdit,
}: {
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  students: Student[];
  onEdit: (tx: Tx) => void;
}) {
  const { t, locale } = useI18n();
  const { primaryCurrency, weekStartsOn } = useSettings();
  const { colors } = useColorScheme();
  const [currency, setCurrency] = React.useState<Currency | null>(null);
  const targetCurrency = currency ?? primaryCurrency;

  const now = new Date();
  const from = subDays(startOfDay(now), RANGE_DAYS[range] - 1).toISOString();
  const to = endOfDay(now).toISOString();

  const summary = useApiQuery(
    () => api.get<Summary>('dashboard/summary', { query: { from, to, target: targetCurrency } }),
    [from, to, targetCurrency],
  );
  const daily = useApiQuery(
    () =>
      api.get<DailyFinanceStats[]>('dashboard/daily-stats', {
        query: { from, to, target: targetCurrency },
      }),
    [from, to, targetCurrency],
  );
  const txs = useApiQuery(
    () =>
      api.get<Tx[]>('transactions', { query: { from, to, target: targetCurrency, limit: 200 } }),
    [from, to, targetCurrency],
  );

  const nameOf = (id?: string | null) =>
    id ? (students.find((s) => s.id === id)?.name ?? '') : '';

  const incomeT = summary.data?.incomeInTargetCurrency ?? 0;
  const expenseT = summary.data?.expenseInTargetCurrency ?? 0;
  const netT = incomeT - expenseT;

  const pieData = React.useMemo<PieDatum[]>(() => {
    const palette = PIE_COLORS(colors);
    const byCat = new Map<string, number>();
    for (const tx of txs.data ?? []) {
      if (tx.type !== 'expense') continue;
      byCat.set(tx.category, (byCat.get(tx.category) ?? 0) + (tx.convertedAmount ?? 0));
    }
    return [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, value], i) => ({
        label: categoryLabel(cat, t),
        value: fromMinorUnits(value, targetCurrency),
        color: palette[i % palette.length]!,
      }));
  }, [txs.data, colors, t, targetCurrency]);

  const loading = summary.loading || daily.loading || txs.loading;

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <RangeTabs value={range} onValueChange={setRange} />
        </View>
        <View className="w-28">
          <SelectField
            value={targetCurrency}
            onValueChange={(v) => setCurrency(v as Currency)}
            options={currencyOptions()}
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <FinanceStat
          label={t('Planned')}
          tone="planned"
          value={
            summary.data
              ? money(summary.data.plannedIncomeInTargetCurrency, targetCurrency, locale)
              : '—'
          }
        />
        <FinanceStat
          label={t('Income')}
          tone="income"
          value={summary.data ? money(incomeT, targetCurrency, locale) : '—'}
        />
      </View>
      <View className="flex-row gap-3">
        <FinanceStat
          label={t('Expenses')}
          tone="expense"
          value={summary.data ? money(expenseT, targetCurrency, locale) : '—'}
        />
        <FinanceStat
          label={t('Net')}
          tone={netT >= 0 ? 'income' : 'expense'}
          value={summary.data ? money(netT, targetCurrency, locale) : '—'}
        />
      </View>

      {(daily.data ?? []).length > 0 ? (
        <Card>
          <CardContent className="pt-4">
            <IncomeExpenseChart
              dailyStats={daily.data ?? []}
              currency={targetCurrency}
              weekStartsOn={weekStartsOn}
            />
          </CardContent>
        </Card>
      ) : null}

      {pieData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Expenses by category')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart
              data={pieData}
              formatValue={(n) => moneyMajor(n, targetCurrency, locale)}
            />
          </CardContent>
        </Card>
      ) : null}

      <View className="gap-2">
        {loading && (txs.data ?? []).length === 0 ? (
          <Skeleton className="h-40 w-full" />
        ) : (txs.data ?? []).length === 0 ? (
          <EmptyState title={t('No transactions in this period.')} />
        ) : (
          (txs.data ?? []).map((tx, i) => (
            <StaggerItem key={tx.id} index={i}>
              <TransactionRow
                tx={tx}
                studentName={nameOf(tx.studentId)}
                onPress={() => onEdit(tx)}
                t={t}
                locale={locale}
              />
            </StaggerItem>
          ))
        )}
      </View>
    </View>
  );
}

function TransactionRow({
  tx,
  studentName,
  onPress,
  t,
  locale,
}: {
  tx: Tx;
  studentName: string;
  onPress: () => void;
  t: TFunction;
  locale: 'en' | 'ru';
}) {
  const income = tx.type === 'income';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:opacity-80"
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-full ${income ? 'bg-income/15' : 'bg-expense/15'}`}
      >
        <Icon
          as={income ? ArrowUpRight : ArrowDownRight}
          size={18}
          className={income ? 'text-income' : 'text-expense'}
        />
      </View>
      <View className="flex-1">
        <Text className="font-medium" numberOfLines={1}>
          {categoryLabel(tx.category, t)}
          {studentName ? ` · ${studentName}` : ''}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {formatDate(tx.occurredAt, 'd MMM yyyy', locale)}
        </Text>
      </View>
      <Text className={`font-semibold ${income ? 'text-income' : 'text-expense'}`}>
        {income ? '+' : '−'}
        {money(tx.amount, tx.currency, locale)}
      </Text>
    </Pressable>
  );
}

function RecurringTab() {
  const { t, locale } = useI18n();
  const recurring = useApiQuery(() => api.get<Recurring[]>('recurring'), []);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Recurring | null>(null);
  const [toDelete, setToDelete] = React.useState<Recurring | null>(null);

  const togglePause = async (r: Recurring) => {
    await api.patch(`recurring/${r.id}`, { isActive: !r.isActive });
    void recurring.refetch();
  };
  const remove = async () => {
    if (!toDelete) return;
    await api.delete(`recurring/${toDelete.id}`);
    setToDelete(null);
    void recurring.refetch();
  };

  return (
    <View className="gap-3">
      <Button
        variant="outline"
        onPress={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Icon as={Plus} size={16} />
        <Text>{t('Add recurring expense')}</Text>
      </Button>

      {recurring.loading && (recurring.data ?? []).length === 0 ? (
        <Skeleton className="h-32 w-full" />
      ) : (recurring.data ?? []).length === 0 ? (
        <EmptyState
          title={t('No recurring expenses')}
          description={t('No recurring expenses yet. Add one to automate regular costs.')}
        />
      ) : (
        (recurring.data ?? []).map((r) => (
          <View
            key={r.id}
            className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <View className="flex-1">
              <Text className="font-medium">{categoryLabel(r.category, t)}</Text>
              <Text className="text-xs text-muted-foreground">
                {t(r.frequency)} · {money(r.amount, r.currency, locale)}
                {r.isActive ? '' : ` · ${t('Paused')}`}
              </Text>
            </View>
            <Button size="icon" variant="ghost" onPress={() => togglePause(r)}>
              <Icon as={r.isActive ? Pause : Play} size={18} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onPress={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              <Icon as={Pencil} size={18} />
            </Button>
            <Button size="icon" variant="ghost" onPress={() => setToDelete(r)}>
              <Icon as={Trash2} size={18} className="text-destructive" />
            </Button>
          </View>
        ))
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recurring={editing}
        onSaved={() => recurring.refetch()}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete transaction?')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={remove}>
              <Text>{t('Delete')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

function ComparisonTab() {
  const { t, locale } = useI18n();
  const { primaryCurrency } = useSettings();
  const [range, setRange] = React.useState<RangeKey>('30d');

  const now = new Date();
  const days = RANGE_DAYS[range];
  const curFrom = subDays(startOfDay(now), days - 1).toISOString();
  const curTo = endOfDay(now).toISOString();
  const prevFrom = subDays(startOfDay(now), days * 2 - 1).toISOString();
  const prevTo = subDays(endOfDay(now), days).toISOString();

  const current = useApiQuery(
    () =>
      api.get<Summary>('dashboard/summary', {
        query: { from: curFrom, to: curTo, target: primaryCurrency },
      }),
    [curFrom, curTo, primaryCurrency],
  );
  const previous = useApiQuery(
    () =>
      api.get<Summary>('dashboard/summary', {
        query: { from: prevFrom, to: prevTo, target: primaryCurrency },
      }),
    [prevFrom, prevTo, primaryCurrency],
  );

  const delta = (cur: number, prev: number) => {
    if (prev === 0) return cur === 0 ? 0 : 100;
    return Math.round(((cur - prev) / Math.abs(prev)) * 100);
  };

  const rows: { label: string; cur: number; prev: number }[] =
    current.data && previous.data
      ? [
          {
            label: t('Income'),
            cur: current.data.incomeInTargetCurrency,
            prev: previous.data.incomeInTargetCurrency,
          },
          {
            label: t('Expense'),
            cur: current.data.expenseInTargetCurrency,
            prev: previous.data.expenseInTargetCurrency,
          },
          {
            label: t('Net'),
            cur: current.data.netInTargetCurrency,
            prev: previous.data.netInTargetCurrency,
          },
        ]
      : [];

  return (
    <View className="gap-4">
      <RangeTabs value={range} onValueChange={setRange} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Current vs Previous')}</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          {current.loading || previous.loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            rows.map((r) => {
              const d = delta(r.cur, r.prev);
              return (
                <View key={r.label} className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">{r.label}</Text>
                    <Text
                      className={`text-xs font-medium ${d >= 0 ? 'text-income' : 'text-expense'}`}
                    >
                      {d >= 0 ? '+' : ''}
                      {d}% {t('vs')} {t('Previous')}
                    </Text>
                  </View>
                  <View className="flex-row items-baseline justify-between">
                    <Text className="text-lg font-bold">
                      {money(r.cur, primaryCurrency, locale)}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {money(r.prev, primaryCurrency, locale)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </CardContent>
      </Card>
    </View>
  );
}
