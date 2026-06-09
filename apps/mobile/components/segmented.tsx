import { View } from 'react-native';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <View className={cn('flex-row rounded-lg bg-muted p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Button
            key={o.value}
            size="sm"
            variant="ghost"
            onPress={() => onChange(o.value)}
            className={cn('flex-1', active && 'bg-card')}
          >
            <Text className={cn('text-sm', active ? 'text-foreground' : 'text-muted-foreground')}>
              {o.label}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}
