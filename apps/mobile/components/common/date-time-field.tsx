import * as React from 'react';
import { Platform, Pressable } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { CalendarDays, Clock } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { formatDate } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import { useColorScheme } from '~/lib/use-color-scheme';

type Props = {
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
};

export function DateTimeField({ mode, value, onChange }: Props) {
  const { locale } = useI18n();
  const { colors, colorScheme } = useColorScheme();
  const [show, setShow] = React.useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    // Android fires once and dismisses; iOS keeps the inline picker open.
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'set' && selected) onChange(selected);
  };

  const label =
    mode === 'date' ? formatDate(value, 'EEE, d MMM yyyy', locale) : formatDate(value, 'HH:mm', locale);

  return (
    <>
      <Pressable
        onPress={() => setShow((s) => !s)}
        className="h-12 flex-row items-center gap-2 rounded-md border border-input bg-background px-3 active:opacity-80"
      >
        <Icon as={mode === 'date' ? CalendarDays : Clock} size={16} className="text-muted-foreground" />
        <Text className="text-base">{label}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value}
          mode={mode}
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant={colorScheme}
          accentColor={colors.primary}
          onChange={handleChange}
        />
      ) : null}
    </>
  );
}
