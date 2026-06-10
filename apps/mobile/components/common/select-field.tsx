import * as React from 'react';
import { ActionSheetIOS, Platform, Pressable } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { ActionSheet } from '~/components/common/action-sheet';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { useColorScheme } from '~/lib/use-color-scheme';
import { useI18n } from '~/lib/i18n';
import { cn } from '~/lib/utils';

export type FieldOption = { label: string; value: string };

/**
 * Select built on native presentation instead of a JS dropdown:
 * - iOS: ActionSheetIOS (system action sheet, RN core) — presented by the OS,
 *   so it always lands above any open Modal/sheet.
 * - Android: option list in our ActionSheet (a native RN Modal) — modals stack,
 *   so it also always lands above the form sheet.
 * The old @rn-primitives/select dropdown rendered through a JS portal in the
 * ROOT window and ended up underneath the native-Modal form sheet.
 */
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
}: {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  options: FieldOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const { colorScheme } = useColorScheme();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  const openPicker = () => {
    if (disabled) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options.map((o) => o.label), t('Cancel')],
          cancelButtonIndex: options.length,
          title: placeholder,
          userInterfaceStyle: colorScheme === 'dark' ? 'dark' : 'light',
        },
        (index) => {
          const picked = options[index];
          if (picked) onValueChange(picked.value);
        },
      );
    } else {
      setSheetOpen(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        className={cn(
          'dark:bg-input/30 border-input bg-background h-10 w-full min-w-0 flex-row items-center gap-2 rounded-md border px-3 py-1 shadow-sm shadow-black/5 active:opacity-80',
          disabled && 'opacity-50',
          className,
        )}
      >
        <Text
          numberOfLines={1}
          className={cn('flex-1 text-base leading-5', !selected && 'text-muted-foreground/50')}
        >
          {selected?.label ?? placeholder ?? ''}
        </Text>
        <Icon as={ChevronDown} size={16} className="text-muted-foreground" />
      </Pressable>

      {Platform.OS !== 'ios' ? (
        <ActionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={placeholder}
          items={options.map((o) => ({
            label: o.label,
            icon: o.value === selected?.value ? Check : undefined,
            onPress: () => onValueChange(o.value),
          }))}
        />
      ) : null}
    </>
  );
}
