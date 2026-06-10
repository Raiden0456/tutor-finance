import { View } from 'react-native';
import { GraduationCap } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

export function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  return (
    <View className="flex-row items-center gap-3">
      <View className={cn('items-center justify-center rounded-2xl bg-primary', box)}>
        <Icon as={GraduationCap} size={size === 'lg' ? 30 : 24} className="text-primary-foreground" />
      </View>
      <Text className={cn('font-bold', size === 'lg' ? 'text-3xl' : 'text-2xl')}>
        Uchetka
      </Text>
    </View>
  );
}
