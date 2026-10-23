import { View } from 'react-native';
import { endOfDay, startOfDay, subDays } from 'date-fns';
import { RANGE_DAYS, type RangeKey } from '~/components/common/range-tabs';
import { ErrorState } from '~/components/common/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import { useApiQuery } from '~/lib/use-query';
import type { Currency, Summary } from '~/lib/types';
import { cn } from '~/lib/utils';

function delta(cur: number, prev: number) {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return Math.round(((cur - prev) / Math.abs(prev)) * 100);
}

export function ComparisonCard({
  range,
  currency,
  current,
  version,
}: {
  range: RangeKey;
  currency: Currency;
  current: Summary | null;
  version: number;
}) {
  const { t, locale } = useI18n();
  const days = RANGE_DAYS[range];
  const now = new Date();
  const from = subDays(startOfDay(now), days * 2 - 1).toISOString();
  const to = subDays(endOfDay(now), days).toISOString();

  const previous = useApiQuery(
    () => api.get<Summary>('dashboard/summary', { query: { from, to, target: currency } }),
    [from, to, currency, version],
  );

  const rows =
    current && previous.data
      ? [
          {
            label: t('Income'),
            cur: current.incomeInTargetCurrency,
            prev: previous.data.incomeInTargetCurrency,
          },
          {
            label: t('Expense'),
            cur: current.expenseInTargetCurrency,
            prev: previous.data.expenseInTargetCurrency,
          },
          {
            label: t('Net'),
            cur: current.netInTargetCurrency,
            prev: previous.data.netInTargetCurrency,
          },
        ]
      : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('Current vs Previous')}</CardTitle>
      </CardHeader>
      <CardContent className="gap-3">
        {previous.error && !previous.data ? (
          <ErrorState
            message={previous.error}
            onRetry={previous.refetch}
            retrying={previous.loading}
          />
        ) : rows.length === 0 ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          rows.map((r) => {
            const d = delta(r.cur, r.prev);
            return (
              <View key={r.label} className="gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">{r.label}</Text>
                  <Text
                    className={cn('text-xs font-medium', d >= 0 ? 'text-income' : 'text-expense')}
                  >
                    {d >= 0 ? '+' : ''}
                    {d}% {t('vs')} {t('Previous')}
                  </Text>
                </View>
                <View className="flex-row items-baseline justify-between">
                  <Text className="text-lg font-bold">{money(r.cur, currency, locale)}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {money(r.prev, currency, locale)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
