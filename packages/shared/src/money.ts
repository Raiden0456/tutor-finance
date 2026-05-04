import { CURRENCY_DECIMALS, type Currency } from './currency.js';

export interface Money {
  amount: number;
  currency: Currency;
}

const STABLECOINS: ReadonlySet<Currency> = new Set<Currency>(['USDT', 'USDC']);

export function toMinorUnits(major: number, currency: Currency): number {
  const factor = 10 ** CURRENCY_DECIMALS[currency];
  return Math.round(major * factor);
}

export function fromMinorUnits(minor: number, currency: Currency): number {
  const factor = 10 ** CURRENCY_DECIMALS[currency];
  return minor / factor;
}

export function formatMoney(money: Money, locale = 'en-US'): string {
  const value = fromMinorUnits(money.amount, money.currency);
  if (STABLECOINS.has(money.currency)) {
    return `${value.toFixed(CURRENCY_DECIMALS[money.currency])} ${money.currency}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: money.currency,
      maximumFractionDigits: CURRENCY_DECIMALS[money.currency],
    }).format(value);
  } catch {
    return `${value.toFixed(CURRENCY_DECIMALS[money.currency])} ${money.currency}`;
  }
}

// rates: map "<from>_<to>" -> multiplier (e.g. {"USD_EUR": 0.92}).
// USDT/USDC are pinned 1:1 to USD.
export function convertMoney(
  money: Money,
  target: Currency,
  rates: Record<string, number>,
): Money {
  if (money.currency === target) return money;
  const from = STABLECOINS.has(money.currency) ? 'USD' : money.currency;
  const to = STABLECOINS.has(target) ? 'USD' : target;
  if (from === to) {
    return { amount: money.amount, currency: target };
  }
  const rate = rates[`${from}_${to}`];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Missing FX rate for ${from} -> ${to}`);
  }
  const major = fromMinorUnits(money.amount, money.currency);
  const converted = major * rate;
  return { amount: toMinorUnits(converted, target), currency: target };
}
