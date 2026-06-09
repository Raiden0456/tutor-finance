import { View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';
import { Text } from '~/components/ui/text';

export type PieDatum = { label: string; value: number; color: string };

export function CategoryPieChart({
  data,
  formatValue = (n) => String(Math.round(n)),
}: {
  data: PieDatum[];
  formatValue?: (n: number) => string;
}) {
  if (data.length === 0) return null;

  return (
    <View className="gap-3">
      <View style={{ height: 200 }}>
        <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
          <Pie.Chart innerRadius="62%" />
        </PolarChart>
      </View>
      <View className="gap-1.5">
        {data.map((d) => (
          <View key={d.label} className="flex-row items-center gap-2">
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color }} />
            <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={1}>
              {d.label}
            </Text>
            <Text className="text-xs font-semibold text-foreground">{formatValue(d.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
