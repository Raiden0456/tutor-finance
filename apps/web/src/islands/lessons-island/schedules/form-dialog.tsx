import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
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
import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import type { LessonFrequency, RecurringLesson, LessonStudent } from '@/lib/types';
import type { WeekStartsOn } from '@tutor-finance/shared';
import { getDateFnsLocale, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useMutation } from '@/hooks/use-mutation';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/form/money-input';
import { MoreFields } from '@/components/form/more-fields';
import { fmtMajor } from '@/lib/format';

const REF_SUNDAY = new Date(2025, 0, 5);

function timeToMinutes(time: string): number | null {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h! * 60 + m!;
}

function timeRangesOverlap(aStart: number, aDuration: number, bStart: number, bDuration: number) {
  const aEnd = aStart + aDuration;
  const bEnd = bStart + bDuration;
  return aStart < bEnd && bStart < aEnd;
}

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
  schedules = [],
  weekStartsOn = 1,
  onSubmit,
}: {
  title: string;
  students: LessonStudent[];
  defaults?: RecurringLesson;
  schedules?: RecurringLesson[];
  weekStartsOn?: WeekStartsOn;
  onSubmit: (payload: ScheduleFormPayload) => Promise<void>;
}) {
  const { locale, t } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const { run, pending: submitting } = useMutation();
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(defaults?.daysOfWeek ?? [1]);
  const isEdit = !!defaults;
  const [selectedStudentId, setSelectedStudentId] = useState(
    defaults?.studentId ?? students[0]?.id ?? '',
  );
  const [meetingLink, setMeetingLink] = useState(
    defaults?.meetingLink ?? students[0]?.meetingLink ?? '',
  );
  const [priceAmount, setPriceAmount] = useState(
    defaults?.priceOverride
      ? fmtMajor(defaults.priceOverride.amount, defaults.priceOverride.currency)
      : '',
  );
  const [priceCurrency, setPriceCurrency] = useState<Currency>(
    defaults?.priceOverride?.currency ?? students[0]?.defaultCurrency ?? 'USD',
  );

  function selectStudent(studentId: string) {
    const student = students.find((s) => s.id === studentId);
    setSelectedStudentId(studentId);
    if (isEdit) return;
    setMeetingLink(student?.meetingLink ?? '');
    setDurationMin(student?.ratePeriodMin ?? 60);
    setPriceCurrency(student?.defaultCurrency ?? 'USD');
  }

  function toggleDay(idx: number) {
    setDaysOfWeek((prev) =>
      prev.includes(idx)
        ? prev.length > 1
          ? prev.filter((d) => d !== idx)
          : prev
        : [...prev, idx],
    );
  }
  const [frequency, setFrequency] = useState<LessonFrequency>(defaults?.frequency ?? 'weekly');
  const [startTime, setStartTime] = useState(defaults?.startTime ?? '09:00');
  const [durationMin, setDurationMin] = useState(
    defaults?.durationMin ?? students[0]?.ratePeriodMin ?? 60,
  );

  const overlappingSchedules = useMemo(() => {
    const start = timeToMinutes(startTime);
    if (start == null || durationMin <= 0) return [];

    return schedules.filter((schedule) => {
      if (schedule.id === defaults?.id) return false;
      if (!schedule.daysOfWeek.some((day) => daysOfWeek.includes(day))) return false;

      const scheduleStart = timeToMinutes(schedule.startTime);
      if (scheduleStart == null) return false;

      return timeRangesOverlap(start, durationMin, scheduleStart, schedule.durationMin);
    });
  }, [defaults?.id, daysOfWeek, durationMin, schedules, startTime]);

  async function handleSubmit(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    if (submitting) return;
    const data = new FormData(e.currentTarget);
    await run(async () => {
      const studentId = selectedStudentId;
      const startTime = String(data.get('startTime') ?? '');
      const durationMin = parseInt(String(data.get('durationMin') ?? '60'), 10);
      const startDate = String(data.get('startDate') ?? '').trim() || undefined;
      const endDateRaw = String(data.get('endDate') ?? '').trim();
      const endDate: string | null | undefined = endDateRaw
        ? endDateRaw
        : isEdit
          ? null
          : undefined;
      const meetingLinkValue = meetingLink.trim() || undefined;
      const notes = String(data.get('notes') ?? '').trim() || undefined;

      const priceOverride: ScheduleFormPayload['priceOverride'] = priceAmount.trim()
        ? { amount: parseMajorToMinor(priceAmount, priceCurrency), currency: priceCurrency }
        : defaults?.priceOverride
          ? null
          : undefined;

      await onSubmit({
        studentId,
        daysOfWeek,
        startTime,
        durationMin,
        frequency,
        startDate,
        endDate,
        priceOverride,
        meetingLink: meetingLinkValue,
        notes,
      });
    });
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
              value={selectedStudentId}
              onValueChange={selectStudent}
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
                  {format(new Date(REF_SUNDAY.getTime() + dow * 86400000), 'EEEEE', {
                    locale: dateLocale,
                  }).toUpperCase()}
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
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
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
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {overlappingSchedules.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {t('Overlaps with {name} at {time}', {
                      name:
                        students.find((s) => s.id === overlappingSchedules[0]?.studentId)?.name ??
                        t('another lesson'),
                      time: overlappingSchedules[0]?.startTime ?? startTime,
                    })}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          <MoreFields>
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

            <div className="grid gap-2">
              <Label htmlFor="sch-end">{t('End date')}</Label>
              <Input
                id="sch-end"
                name="endDate"
                type="date"
                defaultValue={
                  defaults?.endDate ? new Date(defaults.endDate).toISOString().slice(0, 10) : ''
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>{t('Price override')}</Label>
              <MoneyInput
                amount={priceAmount}
                currency={priceCurrency}
                onAmountChange={setPriceAmount}
                onCurrencyChange={setPriceCurrency}
                placeholder={t('Leave blank to use hourly rate')}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sch-link">{t('Meeting link')}</Label>
              <Input
                id="sch-link"
                name="meetingLink"
                type="url"
                placeholder="https://"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sch-notes">{t('Notes')}</Label>
              <Textarea
                id="sch-notes"
                name="notes"
                rows={2}
                className="resize-none"
                defaultValue={defaults?.notes ?? ''}
              />
            </div>
          </MoreFields>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting && <Spinner />}
            {submitting ? t('Saving…') : t('Save')}
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModalContent>
  );
}
