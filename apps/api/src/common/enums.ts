import { registerEnumType } from '@nestjs/graphql';
import { SUPPORTED_CURRENCIES } from '@tutor-finance/shared';

const CurrencyValues = SUPPORTED_CURRENCIES.reduce<Record<string, string>>((acc, c) => {
  acc[c] = c;
  return acc;
}, {});

export { CurrencyValues as Currency };

registerEnumType(CurrencyValues, {
  name: 'Currency',
  description: 'ISO-4217 fiat or pinned-stablecoin currency code.',
});

export enum LessonStatus {
  scheduled = 'scheduled',
  completed = 'completed',
  cancelled = 'cancelled',
  no_show = 'no_show',
}
registerEnumType(LessonStatus, { name: 'LessonStatus' });

export enum TransactionType {
  income = 'income',
  expense = 'expense',
}
registerEnumType(TransactionType, { name: 'TransactionType' });

export enum Theme {
  light = 'light',
  dark = 'dark',
  system = 'system',
}
registerEnumType(Theme, { name: 'Theme' });

export enum Locale {
  en = 'en',
  ru = 'ru',
}
registerEnumType(Locale, { name: 'Locale' });
