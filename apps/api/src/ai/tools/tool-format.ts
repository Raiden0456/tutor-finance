import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  formatMoney,
  parseMajorToMinor,
  zonedParts,
  zonedTimeToUtc,
  type AiLanguage,
  type Currency,
  type Locale,
} from '@tutor-finance/shared';

export interface ToolContext {
  userId: string;
  timeZone: string;
  locale: Locale;
  aiLanguage: AiLanguage;
  primaryCurrency: Currency;
  threadId?: string;
}

export interface MoneyOut {
  minor: number;
  currency: Currency;
  formatted: string;
}

const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

function intlLocale(ctx: ToolContext): string {
  return ctx.locale === 'ru' ? 'ru-RU' : 'en-US';
}

export function money(ctx: ToolContext, amount: number, currency: Currency): MoneyOut {
  return { minor: amount, currency, formatted: formatMoney({ amount, currency }, intlLocale(ctx)) };
}

export function when(ctx: ToolContext, date: Date | string) {
  const d = new Date(date);
  return {
    iso: d.toISOString(),
    local: new Intl.DateTimeFormat(intlLocale(ctx), {
      timeZone: ctx.timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d),
  };
}

export function dateLabel(ctx: ToolContext, ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat(intlLocale(ctx), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

export function weekdays(ctx: ToolContext, days: number[]): string {
  const fmt = new Intl.DateTimeFormat(intlLocale(ctx), { weekday: 'short', timeZone: 'UTC' });
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => fmt.format(new Date(Date.UTC(2024, 0, 7 + d))))
    .join(', ');
}

export interface Slot {
  start: Date;
  durationMin: number;
}

export function weeklySlots(
  ctx: ToolContext,
  schedule: { daysOfWeek: number[]; startTime: string; durationMin: number; biweekly?: boolean },
  from: Date,
  to: Date,
): Slot[] {
  const [hour, minute] = schedule.startTime.split(':').map(Number);
  const p = zonedParts(from, ctx.timeZone);
  const slots: Slot[] = [];
  for (let i = 0; i < 366; i++) {
    const day = new Date(Date.UTC(p.year, p.month - 1, p.day + i));
    if (!schedule.daysOfWeek.includes(day.getUTCDay())) continue;
    if (schedule.biweekly && Math.floor(i / 7) % 2 === 1) continue;
    const start = zonedTimeToUtc(
      {
        year: day.getUTCFullYear(),
        month: day.getUTCMonth() + 1,
        day: day.getUTCDate(),
        hour: hour!,
        minute: minute!,
      },
      ctx.timeZone,
    );
    if (start >= to) break;
    if (start >= from) slots.push({ start, durationMin: schedule.durationMin });
  }
  return slots;
}

export function localDateKey(ctx: Pick<ToolContext, 'timeZone'>, date: Date = new Date()): string {
  const p = zonedParts(date, ctx.timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function parseDateTime(ctx: ToolContext, value: string, endOfDay = false): Date {
  const trimmed = value.trim();
  const m = LOCAL_DATETIME.exec(trimmed);
  if (m && !HAS_OFFSET.test(trimmed)) {
    const dateOnly = m[4] === undefined;
    return zonedTimeToUtc(
      {
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3]) + (dateOnly && endOfDay ? 1 : 0),
        hour: Number(m[4] ?? 0),
        minute: Number(m[5] ?? 0),
        second: Number(m[6] ?? 0),
      },
      ctx.timeZone,
    );
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException(`Invalid date: ${value}`);
  return parsed;
}

export function parseRange(ctx: ToolContext, from: string, to: string): { from: Date; to: Date } {
  const range = { from: parseDateTime(ctx, from), to: parseDateTime(ctx, to, true) };
  if (range.to <= range.from) throw new BadRequestException('"to" must be after "from"');
  return range;
}

export function localDayRange(ctx: ToolContext, offsetDays = 0, lengthDays = 1) {
  const p = zonedParts(new Date(), ctx.timeZone);
  return {
    from: zonedTimeToUtc({ year: p.year, month: p.month, day: p.day + offsetDays }, ctx.timeZone),
    to: zonedTimeToUtc(
      { year: p.year, month: p.month, day: p.day + offsetDays + lengthDays },
      ctx.timeZone,
    ),
  };
}

export function toMinor(major: number | string, currency: Currency): number {
  try {
    return parseMajorToMinor(String(major), currency);
  } catch (err) {
    throw new BadRequestException((err as Error).message);
  }
}

export function truncate(text: string | null | undefined, max = 280): string | null {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function tr(ctx: ToolContext, en: string, ru: string): string {
  return ctx.locale === 'ru' ? ru : en;
}

export async function validated<T extends object>(cls: new () => T, plain: object): Promise<T> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    throw new BadRequestException(errors.map((e) => e.toString(false, false, '', true)).join(' '));
  }
  return instance;
}
