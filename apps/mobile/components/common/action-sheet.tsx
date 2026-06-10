import { Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { FormSheet } from '~/components/common/form-sheet';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

export type ActionItem = {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  onPress: () => void;
};

/** Bottom-sheet list of actions (the mobile form of an overflow/dropdown menu). */
export function ActionSheet({
  open,
  onOpenChange,
  title,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  items: ActionItem[];
}) {
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={title}>
      <View className="gap-1 pt-1">
        {items.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => {
              onOpenChange(false);
              // Wait for the closing sheet's native Modal to unmount (exit anim
              // is 200ms) before the action opens another Modal/dialog — Android
              // won't reliably show overlapping native modals.
              setTimeout(item.onPress, 250);
            }}
            className="flex-row items-center gap-3 rounded-lg px-3 py-3 active:bg-accent"
          >
            {item.icon ? (
              <Icon
                as={item.icon}
                size={18}
                className={cn(item.destructive ? 'text-destructive' : 'text-muted-foreground')}
              />
            ) : null}
            <Text className={cn('text-base', item.destructive && 'text-destructive')}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </FormSheet>
  );
}
