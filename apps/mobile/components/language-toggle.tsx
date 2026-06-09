import { Pressable } from 'react-native';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <Pressable
      hitSlop={8}
      onPress={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
      className="h-9 min-w-9 items-center justify-center rounded-full border border-border bg-card px-2.5 active:opacity-80"
    >
      <Text className="text-xs font-semibold uppercase">{locale}</Text>
    </Pressable>
  );
}
