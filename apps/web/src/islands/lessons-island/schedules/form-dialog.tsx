import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { fromMinorUnits, SUPPORTED_CURRENCIES, type Currency } from '@tutor-finance/shared';
import type { LessonFrequency, RecurringLesson, StudentRef } from '@/lib/types';
import type { WeekStartsOn } from '@tutor-finance/shared';
import { getDateFnsLocale, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Jan 5 2025 = Sunday (index 0)
const REF_SUNDAY = new Date(2025, 0, 5);

export interface ScheduleFormPayload {
  studentId: string;
  daysOfWeek: number[];
  startTime: string;
  durationMin: number;
  frequency: LessonFrequency;
  startDate?: string;
  endDate?: string | null;
  priceOverride?: { amount: number; currency: Currency } | null;
  meetingLink?: string;
  notes?: string;
}

export function ScheduleFormDialog({
  title,
  students,
  defaults,
  weekStartsOn = 1,
  onSubmit,
}: {
  title: string;
  students: StudentRef[];
  defaults?: RecurringLesson;
  weekStartsOn?: WeekStartsOn;
  onSubmit: (payload: ScheduleFormPayload) => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [submitting, setSubmitting] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(defaults?.daysOfWeek ?? [1]);
  const isEdit = !!defaults;

  function toggleDay(idx: number) {
    setDaysOfWeek((prev) =>
      prev.includes(idx) ? (prev.length > 1 ? prev.filter((d) => d !== idx) : prev) : [...prev, idx],
    );
  }
  const [frequency, setFrequency] = useState<LessonFrequency>(defaults?.frequency ?? 'weekly');
  const [showPrice, setShowPrice] = useState(!!defaults?.priceOverride);

  const defaultPriceCurrency = defaults?.priceOverride?.currency ?? 'USD';
  const defaultPriceAmount =
    defaults?.priceOverride != null
      ? String(fromMinorUnits(defaults.priceOverride.amount, defaults.priceOverride.currency))
      : '';

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const studentId = String(data.get('studentId') ?? '');
    const startTime = String(data.get('startTime') ?? '');
    const durationMin = parseInt(String(data.get('durationMin') ?? '60'), 10);
    const startDate = String(data.get('startDate') ?? '').trim() || undefined;
    const endDateRaw = String(data.get('endDate') ?? '').trim();
    // On edit, send null to clear; on create, omit
    const endDate: string | null | undefined = endDateRaw
      ? endDateRaw
      : isEdit
        ? null
        : undefined;
    const meetingLink = String(data.get('meetingLink') ?? '').trim() || undefined;
    const notes = String(data.get('notes') ?? '').trim() || undefined;

    let priceOverride: ScheduleFormPayload['priceOverride'] = undefined;
    if (showPrice) {
      const currency = String(data.get('priceCurrency') ?? 'USD') as Currency;
      const rawAmount = String(data.get('priceAmount') ?? '').trim();
      if (rawAmount) {
        const { parseMajorToMinor } = await import('@tutor-finance/shared');
        priceOverride = { amount: parseMajorToMinor(rawAmount, currency), currency };
      } else {
        priceOverride = null;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit({
        studentId,
        daysOfWeek,
        startTime,
        durationMin,
        frequency,
        startDate,
        endDate,
        priceOverride,
        meetingLink,
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveModalContent className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
      </ResponsiveModalHeader>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
        <ResponsiveModalBody className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sch-student">{t('Student')}</Label>
            <Select
              name="studentId"
              defaultValue={defaults?.studentId ?? students[0]?.id ?? ''}
              disabled={isEdit}
            >
              <SelectTrigger id="sch-student">
                <SelectValue placeholder={t('Select student')} />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('Days of week')}</Label>
            <div className="flex gap-1">
              {Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7).map((dow) => (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleDay(dow)}
                  className={cn(
                    'flex flex-1 items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-all duration-150',
                    daysOfWeek.includes(dow)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {format(new Date(REF_SUNDAY.getTime() + dow * 86400000), 'EEEEE', { locale: dateLocale }).toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="sch-time">{t('Start time')}</Label>
              <Input
                id="sch-time"
                name="startTime"
                type="time"
                required
                defaultValue={defaults?.startTime ?? '09:00'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sch-duration">{t('Duration (min)')}</Label>
              <Input
                id="sch-duration"
                name="durationMin"
                type="number"
                min="1"
                required
                defaultValue={String(defaults?.durationMin ?? 60)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t('Frequency')}</Label>
            <div className="flex gap-1">
              {(['weekly', 'biweekly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
                    frequency === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {f === 'weekly' ? t('Weekly') : t('Biweekly')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="sch-start">{t('Start date')}</Label>
              <Input
                id="sch-start"
                name="startDate"
                type="date"
                disabled={isEdit}
                defaultValue={
                  defaults?.startDate
                    ? new Date(defaults.startDate).toISOString().slice(0, 10)
                    : new Date().toISOString().slice(0, 10)
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sch-end">{t('End date')}</Label>
              <Input
                id="sch-end"
                name="endDate"
                type="date"
                defaultValue={
                  defaults?.endDate
                    ? new Date(defaults.endDate).toISOString().slice(0, 10)
                    : ''
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>{t('Price override')}</Label>
              <button
                type="button"
                onClick={() => setShowPrice((x) => !x)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPrice ? t('Remove') : t('Add')}
              </button>
            </div>
            {showPrice && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  name="priceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  defaultValue={defaultPriceAmount}
                />
                <Select name="priceCurrency" defaultValue={defaultPriceCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sch-link">{t('Meeting link')}</Label>
            <Input
              id="sch-link"
              name="meetingLink"
              type="url"
              placeholder="https://"
              defaultValue={defaults?.meetingLink ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sch-notes">{t('Notes')}</Label>
            <Input id="sch-notes" name="notes" defaultValue={defaults?.notes ?? ''} />
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? `${t('Saving')}…` : t('Save')}
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModalContent>
  );
}
