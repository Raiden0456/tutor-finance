import { format as dateFnsFormat } from 'date-fns';
import { formatMoney, fromMinorUnits, type Currency } from '@tutor-finance/shared';
import { getDateFnsLocale, type Locale } from '~/lib/i18n';

export function intlLocale(locale: Locale): string {
  return locale === 'ru' ? 'ru-RU' : 'en-US';
}

/** Format a minor-unit integer amount as currency. */
export function money(amountMinor: number, currency: Currency, locale: Locale): string {
  return formatMoney({ amount: amountMinor, currency }, intlLocale(locale));
}

export { fromMinorUnits };

export function formatDate(value: string | Date, fmt: string, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return dateFnsFormat(date, fmt, { locale: getDateFnsLocale(locale) });
}

export function formatDuration(min: number, t: (k: string) => string): string {
  if (min < 60) return `${min} ${t('min')}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ${t('h')}` : `${h} ${t('h')} ${m} ${t('m')}`;
}
