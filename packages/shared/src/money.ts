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

export function parseMajorToMinor(value: string, currency: Currency): number {
  const decimals = CURRENCY_DECIMALS[currency];
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error('Money amount is required');
  }
  if (trimmed.startsWith('-')) {
    throw new Error('Money amount cannot be negative');
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error('Invalid money amount');
  }

  const majorPart = match[1]!;
  const fractionalPart = match[2] ?? '';
  if (fractionalPart.length > decimals) {
    throw new Error(`Money amount cannot have more than ${decimals} decimal places`);
  }

  const factor = BigInt(10 ** decimals);
  const majorMinor = BigInt(majorPart) * factor;
  const fractionalMinor = fractionalPart ? BigInt(fractionalPart.padEnd(decimals, '0')) : 0n;
  const minor = majorMinor + fractionalMinor;

  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Money amount exceeds the maximum safe integer');
  }

  return Number(minor);
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
export function convertMoney(money: Money, target: Currency, rates: Record<string, number>): Money {
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
