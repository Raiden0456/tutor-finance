import { Segmented } from '~/components/common/segmented';
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
    <Segmented<RangeKey>
      value={value}
      onChange={onValueChange}
      options={(['7d', '30d', '90d'] as RangeKey[]).map((key) => ({ value: key, label: t(key) }))}
    />
  );
}
