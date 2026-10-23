export const DEFAULT_TIMEZONE = 'UTC';

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, fmt);
  }
  return fmt;
}

export function isValidTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    formatterFor(value);
    return true;
  } catch {
    return false;
  }
}

export function detectTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && isValidTimeZone(tz) ? tz : null;
  } catch {
    return null;
  }
}

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const out: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year!,
    month: out.month!,
    day: out.day!,
    hour: out.hour! % 24,
    minute: out.minute!,
    second: out.second!,
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedTimeToUtc(
  parts: Pick<ZonedParts, 'year' | 'month' | 'day'> & Partial<ZonedParts>,
  timeZone: string,
): Date {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  const first = offsetMs(new Date(guess), timeZone);
  const candidate = guess - first;
  const second = offsetMs(new Date(candidate), timeZone);
  return new Date(second === first ? candidate : guess - second);
}

/** Calendar date of `date` in `timeZone`, represented as a Date at 00:00 UTC of that day. */
export function civilDate(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day));
}

export function civilDateToUtc(civil: Date, timeZone: string, time = '00:00'): Date {
  const [hour, minute] = time.split(':').map(Number);
  return zonedTimeToUtc(
    {
      year: civil.getUTCFullYear(),
      month: civil.getUTCMonth() + 1,
      day: civil.getUTCDate(),
      hour: hour ?? 0,
      minute: minute ?? 0,
    },
    timeZone,
  );
}

export function rezone(date: Date, fromTimeZone: string, toTimeZone: string): Date {
  return zonedTimeToUtc(zonedParts(date, fromTimeZone), toTimeZone);
}
