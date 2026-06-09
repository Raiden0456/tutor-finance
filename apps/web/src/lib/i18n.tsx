import type React from 'react';
import { createContext, useContext } from 'react';
import { enUS, ru as dateFnsRu, type Locale as DateFnsLocale } from 'date-fns/locale';
import { RU_DICT } from '@tutor-finance/shared';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {},
  ru: RU_DICT,
};

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

export const I18nContext = createContext<{ locale: Locale; t: TFunction }>({
  locale: defaultLocale,
  t: createTranslator(defaultLocale),
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({
  locale,
  children,
}: {
  locale?: string | null;
  children: React.ReactNode;
}) {
  const normalized = normalizeLocale(locale);
  return (
    <I18nContext.Provider value={{ locale: normalized, t: createTranslator(normalized) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function stripLocale(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'en' || parts[0] === 'ru') {
    return '/' + parts.slice(1).join('/');
  }
  return pathname || '/';
}

export function localizePath(pathname: string, locale: Locale) {
  const clean = stripLocale(pathname);
  if (locale === defaultLocale) return clean === '' ? '/' : clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}
