import { formatMoney, fromMinorUnits, type Currency } from '@tutor-finance/shared';

export function fmtMoney(amount: number, currency: Currency, locale = 'en-US') {
  return formatMoney({ amount, currency }, locale);
}

export function fmtMajor(amount: number, currency: Currency) {
  return fromMinorUnits(amount, currency).toFixed(2);
}

export function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString();
}

export function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString();
}
