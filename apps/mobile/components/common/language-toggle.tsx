import { Segmented } from '~/components/common/segmented';
import { useI18n, type Locale } from '~/lib/i18n';

/** Compact EN/RU switcher for the screen header — mirrors the web language pill. */
export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <Segmented<Locale>
      value={locale}
      onChange={setLocale}
      variant="primary"
      className="w-[92px]"
      options={[
        { value: 'en', label: 'EN' },
        { value: 'ru', label: 'RU' },
      ]}
    />
  );
}
