import { View } from 'react-native';
import { useFont } from '@shopify/react-native-skia';
import { Onest_600SemiBold } from '@expo-google-fonts/onest';
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
  const labelFont = useFont(Onest_600SemiBold, 11);
  if (data.length === 0) return null;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View className="gap-3">
      <View style={{ height: 200 }}>
        {/* Solid pie with % labels on big-enough slices — mirrors the web chart. */}
        <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
          <Pie.Chart>
            {({ slice }) => {
              const pct = total > 0 ? slice.value / total : 0;
              return (
                <Pie.Slice>
                  {pct > 0.05 ? (
                    <Pie.Label font={labelFont} color="white" text={`${Math.round(pct * 100)}%`} />
                  ) : null}
                </Pie.Slice>
              );
            }}
          </Pie.Chart>
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
