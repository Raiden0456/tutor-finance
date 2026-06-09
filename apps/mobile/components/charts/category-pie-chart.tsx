import { View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';
import { Text } from '~/components/ui/text';

export type PieDatum = { label: string; value: number; color: string };

export function CategoryPieChart({ data }: { data: PieDatum[] }) {
  if (data.length === 0) return null;

  return (
    <View className="gap-3">
      <View style={{ height: 200 }}>
        <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
          <Pie.Chart innerRadius="62%" />
        </PolarChart>
      </View>
      <View className="flex-row flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d) => (
          <View key={d.label} className="flex-row items-center gap-1.5">
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color }} />
            <Text className="text-xs text-muted-foreground">{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
