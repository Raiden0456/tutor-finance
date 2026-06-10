import { View } from 'react-native';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

/** Colored-dot section heading with an item count — mirrors the web dashboard. */
export function SectionHeader({ dot, label, count }: { dot: string; label: string; count: number }) {
  const { t } = useI18n();
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View className={cn('h-2 w-2 rounded-full', dot)} />
        <Text className="text-sm font-semibold">{label}</Text>
      </View>
      <Text className="text-xs text-muted-foreground">
        {t(count === 1 ? '{count} item' : '{count} items', { count })}
      </Text>
    </View>
  );
}
