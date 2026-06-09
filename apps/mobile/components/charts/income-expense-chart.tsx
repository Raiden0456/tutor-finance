import { View } from 'react-native';
import { CartesianChart, BarGroup } from 'victory-native';
import { Text } from '~/components/ui/text';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useI18n } from '~/lib/i18n';

export type IncomeExpensePoint = { label: string; income: number; expense: number };

export function IncomeExpenseChart({ data }: { data: IncomeExpensePoint[] }) {
  const { colors } = useColorScheme();
  const { t } = useI18n();

  if (data.length === 0) return null;

  return (
    <View className="gap-3">
      <View style={{ height: 200 }}>
        <CartesianChart
          data={data}
          xKey="label"
          yKeys={['income', 'expense']}
          domainPadding={{ left: 24, right: 24, top: 12 }}
        >
          {({ points, chartBounds }) => (
            <BarGroup
              chartBounds={chartBounds}
              betweenGroupPadding={0.4}
              withinGroupPadding={0.15}
              roundedCorners={{ topLeft: 4, topRight: 4 }}
            >
              <BarGroup.Bar points={points.income} color={colors.income} />
              <BarGroup.Bar points={points.expense} color={colors.expense} />
            </BarGroup>
          )}
        </CartesianChart>
      </View>
      <View className="flex-row justify-center gap-4">
        <Legend color={colors.income} label={t('Income')} />
        <Legend color={colors.expense} label={t('Expense')} />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
