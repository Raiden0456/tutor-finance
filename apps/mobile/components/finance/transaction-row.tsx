import { Pressable, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { categoryLabel } from '~/lib/catalog';
import { formatDate, money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { Tx } from '~/lib/types';
import { cn } from '~/lib/utils';

export function TransactionRow({
  tx,
  studentName,
  onPress,
}: {
  tx: Tx;
  studentName: string;
  onPress: () => void;
}) {
  const { t, locale } = useI18n();
  const income = tx.type === 'income';
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:opacity-80"
    >
      <View
        className={cn(
          'h-9 w-9 items-center justify-center rounded-full',
          income ? 'bg-income/15' : 'bg-expense/15',
        )}
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
      <Text className={cn('font-semibold', income ? 'text-income' : 'text-expense')}>
        {income ? '+' : '−'}
        {money(tx.amount, tx.currency, locale)}
      </Text>
    </Pressable>
  );
}
