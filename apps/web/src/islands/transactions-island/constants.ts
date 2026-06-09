import type { Frequency } from '@/lib/types';
import type { TFunction } from '@/lib/i18n';

export const INCOME_CATEGORIES = ['lesson', 'consultation', 'refund', 'other'] as const;

/**
 * Human label for a transaction category. The dictionary only has
 * `category.*` keys for non-English locales, so fall back to the bare
 * category name instead of leaking the raw key (e.g. "category.software").
 * Mirrors apps/mobile/lib/catalog.ts.
 */
export function categoryLabel(category: string, t: TFunction): string {
  const translated = t(`category.${category}`);
  return translated === `category.${category}` ? category : translated;
}
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

export const FREQUENCIES: Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

export const CATEGORY_PALETTE = [
  'var(--tf-indigo)',
  'var(--tf-teal)',
  'var(--tf-coral)',
  'var(--tf-jade)',
  'var(--tf-pollen)',
];
