import { SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import type { TFunction } from '~/lib/i18n';
import type { FieldOption } from '~/components/common/select-field';

export const EXPENSE_CATEGORIES = [
  'rent',
  'software',
  'supplies',
  'utilities',
  'transport',
  'food',
  'marketing',
  'equipment',
  'other',
] as const;

export const INCOME_CATEGORIES = ['lesson', 'package', 'consultation', 'refund', 'other'] as const;

export function categoryLabel(category: string, t: TFunction): string {
  const translated = t(`category.${category}`);
  return translated === `category.${category}` ? category : translated;
}

export function categoryOptions(keys: readonly string[], t: TFunction): FieldOption[] {
  return keys.map((k) => ({ value: k, label: categoryLabel(k, t) }));
}

export function currencyOptions(): FieldOption[] {
  return SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }));
}

export const ALL_CURRENCIES: readonly Currency[] = SUPPORTED_CURRENCIES;
