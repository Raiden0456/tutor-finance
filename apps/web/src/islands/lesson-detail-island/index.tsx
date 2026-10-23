import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  detectMeetingProvider,
  parseMajorToMinor,
  primaryAction,
  type Currency,
} from '@tutor-finance/shared';
import { fmtMajor, fmtMoney } from '@/lib/format';
import { I18nProvider, localizePath, type Locale, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Lesson, Student } from '@/lib/types';
import { useLessonActions } from '@/hooks/use-lesson-actions';
import { toLocalDateTimeValue } from '@/utils/lesson';
import { api } from '@/lib/api';
import { LessonAssistantActions, useDataChanged } from '@/features/assistant';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/form/money-input';
import {
  LessonActionsMenu,
  LessonPrimaryButton,
  LessonStatusBadge,
  lessonNote,
} from '@/components/lesson-card';

interface Props {
  lesson: Lesson;
  student: Student;
  locale?: Locale;
}

export function LessonDetailIsland({ locale = 'en', ...props }: Props) {
  return (
    <I18nProvider locale={locale}>
      <LessonDetailContent {...props} />
    </I18nProvider>
  );
}

function priceAmountOf(lesson: Lesson): string {
  return lesson.priceOverride
    ? fmtMajor(lesson.priceOverride.amount, lesson.priceOverride.currency)
    : '';
}

function LessonDetailContent({ lesson: initialLesson, student }: Omit<Props, 'locale'>) {
  const { locale, t } = useI18n();
  const [lesson, setLesson] = useState(initialLesson);
  const actions = useLessonActions(lesson.id, setLesson);
  const lessonsPath = localizePath('/lessons', locale);

  const [startsAtValue, setStartsAtValue] = useState(() =>
    toLocalDateTimeValue(initialLesson.startsAt),
  );
  const [durationMin, setDurationMin] = useState(String(initialLesson.durationMin));
  const [priceAmount, setPriceAmount] = useState(() => priceAmountOf(initialLesson));
  const [priceCurrency, setPriceCurrency] = useState<Currency>(
    initialLesson.priceOverride?.currency ??
      initialLesson.effectivePrice?.currency ??
      student.defaultCurrency,
  );
  const [meetingLink, setMeetingLink] = useState(initialLesson.meetingLink ?? '');
  const [notes, setNotes] = useState(initialLesson.notes ?? '');
  const [homework, setHomework] = useState(initialLesson.homework ?? '');

  useEffect(() => {
    setStartsAtValue(toLocalDateTimeValue(lesson.startsAt));
    setDurationMin(String(lesson.durationMin));
    setPriceAmount(priceAmountOf(lesson));
    setMeetingLink(lesson.meetingLink ?? '');
    setNotes(lesson.notes ?? '');
    setHomework(lesson.homework ?? '');
  }, [lesson]);

  const dirty = useMemo(
    () =>
      startsAtValue !== toLocalDateTimeValue(lesson.startsAt) ||
      durationMin !== String(lesson.durationMin) ||
      notes !== (lesson.notes ?? '') ||
      homework !== (lesson.homework ?? '') ||
      meetingLink !== (lesson.meetingLink ?? '') ||
      priceAmount !== priceAmountOf(lesson) ||
      (!!lesson.priceOverride && priceCurrency !== lesson.priceOverride.currency),
    [startsAtValue, durationMin, notes, homework, meetingLink, priceAmount, priceCurrency, lesson],
  );

  useDataChanged(() => {
    if (dirty) return;
    api
      .get<Lesson>(`/lessons/${lesson.id}`)
      .then(setLesson)
      .catch(() => undefined);
  });

  async function handleSave() {
    const minor = priceAmount.trim() ? parseMajorToMinor(priceAmount, priceCurrency) : null;
    if (minor !== null && minor <= 0) return;
    await actions.update({
      startsAt: new Date(startsAtValue).toISOString(),
      durationMin: Number(durationMin),
      notes: notes.trim() || null,
      homework: homework.trim() || null,
      meetingLink: meetingLink.trim() || null,
      priceOverride: minor === null ? null : { amount: minor, currency: priceCurrency },
    });
  }

  const action = lesson.archivedAt ? null : primaryAction(lesson);
  const lastAction = useRef(action);
  if (action) lastAction.current = action;
  const note = lessonNote(lesson, t);
  const provider = meetingLink.trim() ? detectMeetingProvider(meetingLink.trim()) : null;

  return (
    <div className="page-enter space-y-5">
      <a
        href={lessonsPath}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('Lessons')}
      </a>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <a
          href={`${localizePath(`/students/${student.id}`, locale)}?from=${encodeURIComponent(
            localizePath(`/lessons/${lesson.id}`, locale),
          )}`}
          className="group flex items-center gap-3"
        >
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('Student')}
            </div>
            <div className="mt-0.5 truncate text-base font-semibold">{student.name}</div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </a>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <LessonStatusBadge lesson={lesson} />
            {note && (
              <div
                className={cn(
                  'mt-1.5 text-xs transition-colors duration-200',
                  note.accent ? 'text-tf-coral' : 'text-muted-foreground',
                )}
              >
                {note.text}
              </div>
            )}
          </div>
          <LessonActionsMenu
            lesson={lesson}
            actions={actions}
            variant="page"
            isArchived={!!lesson.archivedAt}
            onArchived={() => (window.location.href = lessonsPath)}
            onDeleted={() => (window.location.href = lessonsPath)}
          />
        </div>
        <Collapse open={!!action}>
          <div className="pt-3">
            {lastAction.current && (
              <LessonPrimaryButton action={lastAction.current} actions={actions} />
            )}
          </div>
        </Collapse>
      </div>

      <LessonAssistantActions
        startsAt={lesson.startsAt}
        studentId={student.id}
        studentName={student.name}
      />

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        <FieldRow label={t('Date & time')} htmlFor="lesson-starts-at">
          <Input
            id="lesson-starts-at"
            type="datetime-local"
            value={startsAtValue}
            onChange={(e) => setStartsAtValue(e.target.value)}
          />
        </FieldRow>
        <FieldRow label={t('Duration (min)')} htmlFor="lesson-duration">
          <Input
            id="lesson-duration"
            type="number"
            min="1"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </FieldRow>
        <FieldRow label={t('Price override')}>
          <MoneyInput
            amount={priceAmount}
            currency={priceCurrency}
            onAmountChange={setPriceAmount}
            onCurrencyChange={setPriceCurrency}
            placeholder={t('Leave blank to use hourly rate')}
          />
          {lesson.effectivePrice && (
            <p className="text-xs text-muted-foreground">
              {t('Effective price')}:{' '}
              {fmtMoney(lesson.effectivePrice.amount, lesson.effectivePrice.currency)}
            </p>
          )}
        </FieldRow>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        <FieldRow
          label={provider ? `${t('Meeting link')} · ${provider}` : t('Meeting link')}
          htmlFor="lesson-link"
        >
          <Input
            id="lesson-link"
            type="url"
            placeholder="https://…"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
        </FieldRow>
        <FieldRow label={t('Notes')} htmlFor="lesson-notes">
          <Textarea
            id="lesson-notes"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('Add a note…')}
            className="resize-none"
          />
        </FieldRow>
        <FieldRow label={t('Homework')} htmlFor="lesson-homework">
          <Textarea
            id="lesson-homework"
            rows={4}
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            placeholder={t('Add homework…')}
            className="resize-none"
          />
        </FieldRow>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button onClick={handleSave} disabled={actions.pending} className="w-full">
              {actions.pending && <Spinner />}
              {actions.pending ? t('Saving…') : t('Save changes')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 px-4 py-3">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
