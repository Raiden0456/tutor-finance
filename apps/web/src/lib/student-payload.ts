import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import type { PricingMode } from './types';

const OPTIONAL_FIELDS = [
  'email',
  'phone',
  'notes',
  'meetingLink',
  'telegramLink',
  'whatsappLink',
] as const;

export function buildStudentPayload(form: HTMLFormElement): Record<string, unknown> {
  const data = new FormData(form);
  const text = (key: string) => String(data.get(key) ?? '').trim();
  const pricingMode = (text('pricingMode') || 'hourly') as PricingMode;
  const payload: Record<string, unknown> = { name: text('name'), pricingMode };

  for (const key of OPTIONAL_FIELDS) payload[key] = text(key) || null;

  if (pricingMode === 'hourly') {
    const currency = (text('currency') || 'USD') as Currency;
    payload.hourlyRate = { amount: parseMajorToMinor(text('rate'), currency), currency };
    payload.ratePeriodMin = Number(data.get('ratePeriodMin') ?? 60);
    payload.defaultCurrency = currency;
  } else {
    const currency = (text('packageCurrency') || 'USD') as Currency;
    payload.package = {
      lessonCount: Number(data.get('packageLessonCount') ?? 0),
      price: { amount: parseMajorToMinor(text('packagePrice'), currency), currency },
    };
    payload.defaultCurrency = currency;
  }

  return payload;
}
