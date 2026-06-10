import * as React from 'react';
import { enUS, ru as dateFnsRu, type Locale as DateFnsLocale } from 'date-fns/locale';
import { storage, STORAGE_KEYS } from '~/lib/storage';
import { RU_DICT } from '@tutor-finance/shared';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = { en: {}, ru: RU_DICT };

export function normalizeLocale(locale: string | undefined | null): Locale {
  return locale === 'ru' ? 'ru' : defaultLocale;
}

export function getDateFnsLocale(locale: string | undefined | null): DateFnsLocale {
  return normalizeLocale(locale) === 'ru' ? dateFnsRu : enUS;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function createTranslator(locale: string | undefined | null) {
  const normalized = normalizeLocale(locale);
  return (key: string, params?: Record<string, string | number>) => {
    let value = dictionaries[normalized][key] ?? key;
    if (params) {
      for (const [param, replacement] of Object.entries(params)) {
        value = value.replaceAll(`{${param}}`, String(replacement));
      }
    }
    return value;
  };
}

export type TFunction = ReturnType<typeof createTranslator>;

type I18nContextValue = {
  locale: Locale;
  t: TFunction;
  setLocale: (locale: Locale) => void;
};

const I18nContext = React.createContext<I18nContextValue>({
  locale: defaultLocale,
  t: createTranslator(defaultLocale),
  setLocale: () => {},
});

export function useI18n() {
  return React.useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(defaultLocale);

  React.useEffect(() => {
    void storage.get(STORAGE_KEYS.locale).then((stored) => {
      if (stored) setLocaleState(normalizeLocale(stored));
    });
  }, []);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    void storage.set(STORAGE_KEYS.locale, next);
  }, []);

  const value = React.useMemo<I18nContextValue>(
    () => ({ locale, t: createTranslator(locale), setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
