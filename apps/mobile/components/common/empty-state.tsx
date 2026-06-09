import * as React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="items-center justify-center gap-3 px-6 py-12">
      {icon ? (
        <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Icon as={icon} size={26} className="text-muted-foreground" />
        </View>
      ) : null}
      <Text className="text-center text-base font-semibold">{title}</Text>
      {description ? (
        <Text className="text-center text-sm text-muted-foreground">{description}</Text>
      ) : null}
      {action ? <View className="mt-1">{action}</View> : null}
    </View>
  );
}
