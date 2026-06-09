import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';

export type RangeKey = '7d' | '30d' | '90d';

export const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 };

export function RangeTabs({
  value,
  onValueChange,
}: {
  value: RangeKey;
  onValueChange: (value: RangeKey) => void;
}) {
  const { t } = useI18n();
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as RangeKey)}>
      <TabsList className="w-full">
        {(['7d', '30d', '90d'] as RangeKey[]).map((key) => (
          <TabsTrigger key={key} value={key} className="flex-1">
            <Text>{t(key)}</Text>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
