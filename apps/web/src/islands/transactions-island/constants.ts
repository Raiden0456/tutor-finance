import type { Frequency } from '@/lib/types';

export const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export const INCOME_CATEGORIES = ['lesson', 'consultation', 'refund', 'other'] as const;
export const EXPENSE_CATEGORIES = [
  'rent', 'software', 'supplies', 'utilities',
  'transport', 'food', 'marketing', 'equipment', 'other',
] as const;

export const FREQ_LABELS: Record<Frequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export const CATEGORY_PALETTE = [
  'var(--tf-indigo)',
  'var(--tf-teal)',
  'var(--tf-coral)',
  'var(--tf-jade)',
  'var(--tf-pollen)',
];
