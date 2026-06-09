import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { fmtMajor, fmtMoney } from '@/lib/format';
import { I18nProvider, localizePath, type Locale, useI18n } from '@/lib/i18n';
import { cn, statusLabel, statusStyles } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';
import { Ban, Banknote, CheckCircle2, ChevronLeft, MoreHorizontal, UserX } from 'lucide-react';
import {
  SUPPORTED_CURRENCIES,
  parseMajorToMinor,
  detectMeetingProvider,
  needsPayment,
  type Currency,
} from '@tutor-finance/shared';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import type { Lesson, Student } from '@/lib/types';

function toLocalDateTimeValue(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

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

function LessonDetailContent({ lesson: initialLesson, student }: Omit<Props, 'locale'>) {
  const { locale, t } = useI18n();
  const [lesson, setLesson] = useState(initialLesson);
  const [saving, setSaving] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);

  const [startsAtValue, setStartsAtValue] = useState(() =>
    toLocalDateTimeValue(initialLesson.startsAt),
  );
  const [durationMin, setDurationMin] = useState(String(initialLesson.durationMin));
  const [priceAmount, setPriceAmount] = useState(() =>
    initialLesson.priceOverride
      ? fmtMajor(initialLesson.priceOverride.amount, initialLesson.priceOverride.currency)
      : '',
  );
  const [priceCurrency, setPriceCurrency] = useState<Currency>(
    (initialLesson.priceOverride?.currency as Currency | undefined) ??
      (initialLesson.effectivePrice?.currency as Currency | undefined) ??
      student.defaultCurrency,
  );
  const [meetingLink, setMeetingLink] = useState(initialLesson.meetingLink ?? '');
  const [notes, setNotes] = useState(initialLesson.notes ?? '');
  const [homework, setHomework] = useState(initialLesson.homework ?? '');

  useEffect(() => {
    setStartsAtValue(toLocalDateTimeValue(lesson.startsAt));
    setDurationMin(String(lesson.durationMin));
    setPriceAmount(
      lesson.priceOverride
        ? fmtMajor(lesson.priceOverride.amount, lesson.priceOverride.currency)
        : '',
    );
    setPriceCurrency(
      (lesson.priceOverride?.currency as Currency | undefined) ??
        (lesson.effectivePrice?.currency as Currency | undefined) ??
        student.defaultCurrency,
    );
    setMeetingLink(lesson.meetingLink ?? '');
    setNotes(lesson.notes ?? '');
    setHomework(lesson.homework ?? '');
  }, [lesson.id]);

  const dirty = useMemo(() => {
    if (startsAtValue !== toLocalDateTimeValue(lesson.startsAt)) return true;
    if (durationMin !== String(lesson.durationMin)) return true;
    if (notes !== (lesson.notes ?? '')) return true;
    if (homework !== (lesson.homework ?? '')) return true;
    if (meetingLink !== (lesson.meetingLink ?? '')) return true;
    const savedAmount = lesson.priceOverride
      ? fmtMajor(lesson.priceOverride.amount, lesson.priceOverride.currency)
      : '';
    if (priceAmount !== savedAmount) return true;
    if (lesson.priceOverride && priceCurrency !== lesson.priceOverride.currency) return true;
    return false;
  }, [
    startsAtValue,
    durationMin,
    notes,
    homework,
    meetingLink,
    priceAmount,
    priceCurrency,
    lesson,
  ]);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        startsAt: new Date(startsAtValue).toISOString(),
        durationMin: Number(durationMin),
        notes: notes.trim() || null,
        homework: homework.trim() || null,
        meetingLink: meetingLink.trim() || null,
      };
      if (!priceAmount.trim()) {
        body.priceOverride = null;
      } else {
        const minorAmount = parseMajorToMinor(priceAmount, priceCurrency);
        if (minorAmount <= 0) return;
        body.priceOverride = {
          amount: minorAmount,
          currency: priceCurrency,
        };
      }
      const updated = await api.patch<Lesson>(`/lessons/${lesson.id}`, body);
      setLesson(updated);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: Lesson['status'], extra?: Record<string, unknown>) {
    const updated = await api.patch<Lesson>(`/lessons/${lesson.id}`, { status, ...extra });
    setLesson(updated);
  }

  const provider = meetingLink.trim() ? detectMeetingProvider(meetingLink.trim()) : null;
  const packageNeedsCompletion = lesson.isPackageCovered && lesson.status === 'due';
  const hasPrimaryAction =
    lesson.status === 'scheduled' ||
    packageNeedsCompletion ||
    (!lesson.isPackageCovered && needsPayment(lesson.status));

  return (
    <div className="page-enter space-y-6">
      {/* Back + status */}
      <div className="flex items-center justify-between">
        <a
          href={localizePath('/lessons', locale)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('Lessons')}
        </a>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[11px] font-medium',
            statusStyles[lesson.status] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {t(statusLabel[lesson.status])}
        </span>
      </div>

      {/* Student */}
      <a
        href={`${localizePath(`/students/${student.id}`, locale)}?from=${encodeURIComponent(
          localizePath(`/lessons/${lesson.id}`, locale),
        )}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('Student')}
          </div>
          <div className="mt-0.5 truncate text-base font-semibold">{student.name}</div>
          {(student.email || student.phone) && (
            <div className="mt-0.5 truncate text-sm text-muted-foreground">
              {student.email || student.phone}
            </div>
          )}
        </div>
        <ChevronLeft className="h-4 w-4 rotate-180 shrink-0 text-muted-foreground" />
      </a>

      {/* Card 1 — Schedule */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
        <FieldRow label={t('Date & time')}>
          <Input
            type="datetime-local"
            value={startsAtValue}
            onChange={(e) => setStartsAtValue(e.target.value)}
          />
        </FieldRow>
        <FieldRow label={t('Duration (min)')}>
          <Input
            type="number"
            min="1"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
          />
        </FieldRow>
      </div>

      {/* Card 2 — Price */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
        <FieldRow label={t('Price override')}>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder={t('Leave blank to use hourly rate')}
            value={priceAmount}
            onChange={(e) => setPriceAmount(e.target.value)}
          />
        </FieldRow>
        <FieldRow label={t('Currency')}>
          <Select value={priceCurrency} onValueChange={(v) => setPriceCurrency(v as Currency)}>
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
        </FieldRow>
        {lesson.effectivePrice && (
          <FieldRow label={t('Effective price')}>
            <div className="text-sm text-muted-foreground">
              {fmtMoney(lesson.effectivePrice.amount, lesson.effectivePrice.currency)}
            </div>
          </FieldRow>
        )}
      </div>

      {/* Card 3 — Meeting & Notes */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border">
        <FieldRow label={provider ? `${t('Meeting link')} · ${provider}` : t('Meeting link')}>
          <Input
            type="url"
            placeholder="https://…"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
        </FieldRow>
        <FieldRow label={t('Notes')}>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('Add a note…')}
            className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </FieldRow>
        <FieldRow label={t('Homework')}>
          <textarea
            rows={4}
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            placeholder={t('Add homework…')}
            className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </FieldRow>
      </div>

      {/* Save */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? t('Saving…') : t('Save changes')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      {hasPrimaryAction && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              lesson.status === 'scheduled' || packageNeedsCompletion
                ? changeStatus('completed')
                : changeStatus('paid')
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-tf-jade py-2.5 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.96]"
          >
            {lesson.status === 'scheduled' || packageNeedsCompletion ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('Mark as Completed')}
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                {lesson.status === 'partially_paid' ? t('Pay Remaining') : t('Mark as Paid')}
              </>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!lesson.isPackageCovered && needsPayment(lesson.status) && (
                <DropdownMenuItem onClick={() => setPartialOpen(true)}>
                  <Banknote className="mr-2 h-4 w-4" />
                  {t('Partial Payment')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => changeStatus('no_show')}>
                <UserX className="mr-2 h-4 w-4" />
                {t('No-show')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeStatus('cancelled')}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="mr-2 h-4 w-4" />
                {t('Cancel lesson')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <PartialModal
        open={partialOpen}
        onOpenChange={setPartialOpen}
        lesson={lesson}
        onSaved={(paidAmount) => {
          setPartialOpen(false);
          changeStatus('partially_paid', { paidAmount });
        }}
      />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 px-4 py-3">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function PartialModal({
  open,
  onOpenChange,
  lesson,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lesson: Lesson;
  onSaved: (amount: number) => void;
}) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const currency = lesson.effectivePrice?.currency ?? 'USD';

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{t('Partial Payment')}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="grid gap-4">
          {lesson.effectivePrice && (
            <p className="text-sm text-muted-foreground">
              {t('Full price:')}{' '}
              <span className="font-medium text-foreground">
                {fmtMoney(lesson.effectivePrice.amount, lesson.effectivePrice.currency)}
              </span>
            </p>
          )}
          <div className="grid gap-2">
            <Label>{t('Amount received ({currency})', { currency })}</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button
            disabled={!input}
            onClick={() => {
              try {
                const amount = parseMajorToMinor(input, currency);
                if (amount > 0) onSaved(amount);
              } catch (error) {
                console.error('Invalid partial payment amount', error);
              }
            }}
          >
            {t('Save')}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
