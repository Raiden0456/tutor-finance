import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { Currency, Summary } from '~/lib/types';
import { cn } from '~/lib/utils';

export function MonthSummary({
  summary,
  currency,
}: {
  summary: Summary | null;
  currency: Currency;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const net = summary?.netInTargetCurrency ?? 0;
  const items = [
    { label: t('Income'), value: summary?.incomeInTargetCurrency, className: 'text-income' },
    { label: t('Expenses'), value: summary?.expenseInTargetCurrency, className: 'text-expense' },
    {
      label: t('Net'),
      value: summary?.netInTargetCurrency,
      className: net >= 0 ? 'text-income' : 'text-expense',
    },
  ];

  return (
    <Pressable
      onPress={() => router.push('/transactions')}
      className="gap-3 rounded-2xl border border-border bg-card p-4 active:opacity-80"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold">{t('This month')}</Text>
        <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
      </View>
      <View className="flex-row gap-3">
        {items.map((item) => (
          <View key={item.label} className="flex-1">
            <Text className="text-xs text-muted-foreground">{item.label}</Text>
            <Text
              className={cn('mt-0.5 text-base font-bold', item.className)}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {item.value != null ? money(item.value, currency, locale) : '—'}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
