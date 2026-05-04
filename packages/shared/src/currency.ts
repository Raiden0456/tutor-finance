export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'RUB',
  'GBP',
  'UAH',
  'KZT',
  'TRY',
  'PLN',
  'USDT',
  'USDC',
] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_DECIMALS: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  RUB: 2,
  GBP: 2,
  UAH: 2,
  KZT: 2,
  TRY: 2,
  PLN: 2,
  USDT: 2,
  USDC: 2,
};

const CURRENCY_SET = new Set<string>(SUPPORTED_CURRENCIES);

export function isSupportedCurrency(value: string): value is Currency {
  return CURRENCY_SET.has(value);
}
