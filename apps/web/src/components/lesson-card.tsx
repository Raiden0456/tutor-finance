import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn, statusLabel, statusStyles } from '@/lib/utils';
import { fmtMajor, fmtMoney } from '@/lib/format';
import { localizePath, useI18n } from '@/lib/i18n';
import { SUPPORTED_CURRENCIES, parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertTriangle,
  Archive,
  Ban,
  Banknote,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  MoreHorizontal,
  PencilLine,
  Trash2,
  UserX,
  Video,
} from 'lucide-react';
import { detectMeetingProvider } from '@/lib/meeting';
import type { Lesson } from '@/lib/types';

function createTimeFmt(locale: string) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
}

export function needsPayment(status: Lesson['status']) {
  return status === 'due' || status === 'partially_paid' || status === 'completed';
}

/** Returns true if the lesson is today or in the future (not a past calendar day). */
export function isNotPastDay(startsAt: string): boolean {
  const d = new Date(startsAt);
  const today = new Date();
  if (d.getFullYear() !== today.getFullYear()) return d.getFullYear() > today.getFullYear();
  if (d.getMonth() !== today.getMonth()) return d.getMonth() > today.getMonth();
  return d.getDate() >= today.getDate();
}

export interface LessonCardProps {
  lesson: Lesson;
  studentName: string;
  overlapping?: boolean;
  isArchived?: boolean;
  onChanged?: () => void;
  onArchived?: () => void;
  onDeleted?: () => void;
}

export function LessonCard({
  lesson: initialLesson,
  studentName,
  overlapping,
  isArchived,
  onChanged,
  onArchived,
  onDeleted,
}: LessonCardProps) {
  const { locale, t } = useI18n();
  const timeFmt = createTimeFmt(locale);
  const [lesson, setLesson] = useState(initialLesson);
  const [scheduledVisible, setScheduledVisible] = useState(
    () => initialLesson.status === 'scheduled',
  );
  const [scheduledCollapsed, setScheduledCollapsed] = useState(false);
  const [dueVisible, setDueVisible] = useState(() => needsPayment(initialLesson.status));
  const [dueCollapsed, setDueCollapsed] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);

  function onPaymentComplete(newStatus: Lesson['status'], newPaidAmount?: number | null) {
    setLesson((prev) => ({
      ...prev,
      status: newStatus,
      paidAmount: newPaidAmount !== undefined ? newPaidAmount : prev.paidAmount,
    }));
    if (!needsPayment(newStatus)) {
      setDueCollapsed(true);
      setTimeout(() => {
        setDueVisible(false);
        onChanged?.();
      }, 520);
    } else {
      onChanged?.();
    }
  }

  function onScheduledChange(newStatus: Lesson['status']) {
    setLesson((prev) => ({ ...prev, status: newStatus }));
    if (newStatus === 'scheduled') return;
    setScheduledCollapsed(true);
    setTimeout(() => {
      setScheduledVisible(false);
      if (needsPayment(newStatus)) {
        setDueVisible(true);
        setDueCollapsed(false);
      }
      onChanged?.();
    }, 420);
  }

  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card p-4 shadow-sm duration-300',
        overlapping ? 'border-amber-500/50 bg-amber-500/[0.03]' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-medium">{studentName}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {overlapping && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            <Clock className="h-3.5 w-3.5" />
            <span>{timeFmt.format(new Date(lesson.startsAt))}</span>
            <span>·</span>
            <span>
              {lesson.durationMin} {t('min')}
            </span>
          </div>
          {lesson.effectivePrice && lesson.status !== 'partially_paid' && (
            <div className="mt-1 text-xs text-muted-foreground">
              {fmtMoney(lesson.effectivePrice.amount, lesson.effectivePrice.currency)}
            </div>
          )}
          {lesson.status === 'partially_paid' &&
            lesson.paidAmount !== null &&
            lesson.effectivePrice && (
              <div className="mt-1 text-xs text-tf-coral">
                {t('Paid {paid} of {total}', {
                  paid: fmtMoney(lesson.paidAmount, lesson.effectivePrice.currency),
                  total: fmtMoney(lesson.effectivePrice.amount, lesson.effectivePrice.currency),
                })}
              </div>
            )}
          {lesson.notes ? (
            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lesson.notes}</div>
          ) : null}
          {lesson.homework ? (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{lesson.homework}</span>
            </div>
          ) : null}
          {lesson.meetingLink ? (
            <a
              href={lesson.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-primary transition-opacity hover:opacity-70"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {detectMeetingProvider(lesson.meetingLink) ?? lesson.meetingLink}
              </span>
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 items-start gap-1.5">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-medium',
              statusStyles[lesson.status] ?? 'bg-muted text-muted-foreground',
            )}
          >
            {t(statusLabel[lesson.status])}
          </span>
          <LessonCardMenu
            lesson={lesson}
            isArchived={isArchived}
            onArchived={onArchived}
            onDeleted={onDeleted}
          />
        </div>
      </div>

      {/* Upcoming lesson actions */}
      {scheduledVisible && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-[400ms] ease-in-out',
            scheduledCollapsed ? 'max-h-0 opacity-0' : 'max-h-[80px] opacity-100',
          )}
        >
          <div className="mt-3 border-t border-border pt-3">
            <ScheduledActions
              lesson={lesson}
              onStatusChange={onScheduledChange}
              onRescheduled={onChanged}
              onEditDetailsClick={() => setEditDetailsOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Payment actions */}
      {dueVisible && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-500 ease-in-out',
            dueCollapsed ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100',
          )}
        >
          <div className="mt-3 border-t border-border pt-3">
            <DuePaymentActions
              lesson={lesson}
              onComplete={onPaymentComplete}
              onEditDetailsClick={() => setEditDetailsOpen(true)}
            />
          </div>
        </div>
      )}

      <EditDetailsModal
        open={editDetailsOpen}
        onOpenChange={setEditDetailsOpen}
        lesson={lesson}
        onSaved={(updates) => {
          setLesson(updates);
          onChanged?.();
        }}
      />
    </div>
  );
}

function LessonCardMenu({
  lesson,
  isArchived,
  onArchived,
  onDeleted,
}: {
  lesson: Lesson;
  isArchived?: boolean;
  onArchived?: () => void;
  onDeleted?: () => void;
}) {
  const { locale, t } = useI18n();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleArchive() {
    setBusy(true);
    try {
      await api.post(`/lessons/${lesson.id}/archive`);
      onArchived?.();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await api.delete(`/lessons/${lesson.id}`);
      onDeleted?.();
      setConfirmDeleteOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const isPaid = lesson.status === 'paid' || lesson.status === 'partially_paid';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-accent hover:text-muted-foreground"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={localizePath(`/lessons/${lesson.id}`, locale)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t('View details')}
            </a>
          </DropdownMenuItem>
          {!isArchived && (
            <DropdownMenuItem onClick={handleArchive} disabled={busy}>
              <Archive className="mr-2 h-4 w-4" />
              {t('Archive')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setConfirmDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResponsiveModal open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Delete lesson?')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody>
            <p className="text-sm text-muted-foreground">
              {t('This permanently deletes the lesson')}
              {isPaid ? ` ${t('and its income transaction')}` : ''}.{' '}
              {t('This action cannot be undone.')}
            </p>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('Delete')}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}

export function DuePaymentActions({
  lesson,
  onComplete,
  onEditDetailsClick,
}: {
  lesson: Lesson;
  onComplete: (status: Lesson['status'], paidAmount?: number | null) => void;
  onEditDetailsClick: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'idle' | 'success'>('idle');
  const [labelVisible, setLabelVisible] = useState(true);
  const [labelSuccess, setLabelSuccess] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialInput, setPartialInput] = useState('');

  const effectiveCurrency = lesson.effectivePrice?.currency ?? 'USD';
  const isPartial = lesson.status === 'partially_paid';
  const fullFormatted = lesson.effectivePrice
    ? fmtMoney(lesson.effectivePrice.amount, lesson.effectivePrice.currency)
    : null;
  const canEditDetails = isNotPastDay(lesson.startsAt);

  async function handlePaidClick() {
    if (phase !== 'idle') return;
    try {
      await api.patch(`/lessons/${lesson.id}`, { status: 'paid' });
      setPhase('success');
      setLabelVisible(false);
      setTimeout(() => {
        setLabelSuccess(true);
        setLabelVisible(true);
      }, 150);
      setTimeout(() => onComplete('paid'), 750);
    } catch (error) {
      console.error('Failed to mark lesson as paid', error);
    }
  }

  async function changeStatus(status: Lesson['status']) {
    try {
      await api.patch(`/lessons/${lesson.id}`, { status });
      onComplete(status);
    } catch (error) {
      console.error('Failed to change lesson status', error);
    }
  }

  async function submitPartial() {
    let amount: number;
    try {
      amount = parseMajorToMinor(partialInput, effectiveCurrency);
      if (amount <= 0) return;
      await api.patch(`/lessons/${lesson.id}`, { status: 'partially_paid', paidAmount: amount });
      setPartialOpen(false);
      setPartialInput('');
      onComplete('partially_paid', amount);
    } catch (error) {
      console.error('Failed to save partial payment', error);
    }
  }

  return (
    <>
      <div className="flex">
        <button
          type="button"
          onClick={handlePaidClick}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-tf-jade py-2.5 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.96]"
        >
          <span
            className={cn(
              'flex items-center gap-2 transition-opacity duration-150',
              labelVisible ? 'opacity-100' : 'opacity-0',
            )}
          >
            {labelSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('Paid')}
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                {isPartial ? t('Pay Remaining') : t('Mark as Paid')}
              </>
            )}
          </span>
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            phase === 'success' ? 'max-w-0 opacity-0' : 'max-w-[3rem] opacity-100',
          )}
        >
          <div className="pl-2">
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
                <DropdownMenuItem onClick={() => setPartialOpen(true)}>
                  <Banknote className="mr-2 h-4 w-4" />
                  {t('Partial Payment')}
                </DropdownMenuItem>
                {canEditDetails && (
                  <DropdownMenuItem onClick={onEditDetailsClick}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    {t('Edit Details')}
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
        </div>
      </div>

      <ResponsiveModal open={partialOpen} onOpenChange={setPartialOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Partial Payment')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody className="grid gap-4">
            {fullFormatted && (
              <p className="text-sm text-muted-foreground">
                {t('Full lesson price:')}{' '}
                <span className="font-medium text-foreground">{fullFormatted}</span>
              </p>
            )}
            <div className="grid gap-2">
              <Label>{t('Amount received ({currency})', { currency: effectiveCurrency })}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={partialInput}
                onChange={(e) => setPartialInput(e.target.value)}
                autoFocus
              />
            </div>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setPartialOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={submitPartial} disabled={!partialInput}>
              {t('Save')}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}

export function ScheduledActions({
  lesson,
  onStatusChange,
  onRescheduled,
  onEditDetailsClick,
}: {
  lesson: Lesson;
  onStatusChange: (status: Lesson['status']) => void;
  onRescheduled?: () => void;
  onEditDetailsClick: () => void;
}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'idle' | 'success'>('idle');
  const [labelVisible, setLabelVisible] = useState(true);
  const [labelSuccess, setLabelSuccess] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const showJoin = !!lesson.meetingLink && isNotPastDay(lesson.startsAt);

  const defaultDateTime = new Date(
    new Date(lesson.startsAt).getTime() - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);

  async function handleCompletedClick() {
    if (phase !== 'idle') return;
    try {
      await api.patch(`/lessons/${lesson.id}`, { status: 'completed' });
      setPhase('success');
      setLabelVisible(false);
      setTimeout(() => {
        setLabelSuccess(true);
        setLabelVisible(true);
      }, 150);
      setTimeout(() => onStatusChange('completed'), 750);
    } catch (error) {
      console.error('Failed to mark lesson as completed', error);
    }
  }

  async function changeStatus(status: Lesson['status']) {
    try {
      await api.patch(`/lessons/${lesson.id}`, { status });
      onStatusChange(status);
    } catch (error) {
      console.error('Failed to change lesson status', error);
    }
  }

  async function handleReschedule(form: HTMLFormElement) {
    const data = new FormData(form);
    const startsAt = new Date(String(data.get('startsAt'))).toISOString();
    const durationMin = Number(data.get('durationMin'));
    await api.patch(`/lessons/${lesson.id}`, { startsAt, durationMin });
    setRescheduleOpen(false);
    onRescheduled?.();
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCompletedClick}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-tf-jade py-2.5 text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.96]"
        >
          <span
            className={cn(
              'flex items-center gap-2 transition-opacity duration-150',
              labelVisible ? 'opacity-100' : 'opacity-0',
            )}
          >
            {labelSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('Completed')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('Mark as Completed')}
              </>
            )}
          </span>
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            showJoin && phase !== 'success' ? 'max-w-[3rem] opacity-100' : 'max-w-0 opacity-0',
          )}
        >
          <a
            href={lesson.meetingLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
            title={t('Join meeting')}
          >
            <Video className="h-4 w-4" />
          </a>
        </div>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            phase === 'success' ? 'max-w-0 opacity-0' : 'max-w-[3rem] opacity-100',
          )}
        >
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
              <DropdownMenuItem onClick={() => setRescheduleOpen(true)}>
                <CalendarClock className="mr-2 h-4 w-4" />
                {t('Reschedule')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEditDetailsClick}>
                <PencilLine className="mr-2 h-4 w-4" />
                {t('Edit Details')}
              </DropdownMenuItem>
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
      </div>

      <ResponsiveModal open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Reschedule lesson')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleReschedule(e.currentTarget);
            }}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <ResponsiveModalBody className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reschedule-startsAt">{t('New date & time')}</Label>
                <Input
                  id="reschedule-startsAt"
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultDateTime}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reschedule-duration">{t('Duration (min)')}</Label>
                <Input
                  id="reschedule-duration"
                  name="durationMin"
                  type="number"
                  min="1"
                  required
                  defaultValue={lesson.durationMin}
                />
              </div>
            </ResponsiveModalBody>
            <ResponsiveModalFooter>
              <Button variant="outline" type="button" onClick={() => setRescheduleOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit">{t('Save')}</Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}

export function EditDetailsModal({
  open,
  onOpenChange,
  lesson,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  onSaved: (lesson: Lesson) => void;
}) {
  const { t } = useI18n();
  const [notes, setNotes] = useState('');
  const [homework, setHomework] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    if (open) {
      setNotes(lesson.notes ?? '');
      setHomework(lesson.homework ?? '');
      setMeetingLink(lesson.meetingLink ?? '');
      setAmount(
        lesson.priceOverride
          ? fmtMajor(lesson.priceOverride.amount, lesson.priceOverride.currency)
          : '',
      );
      setCurrency(
        (lesson.priceOverride?.currency as Currency | undefined) ??
          (lesson.effectivePrice?.currency as Currency | undefined) ??
          'USD',
      );
    }
  }, [open]);

  async function handleSave() {
    const patch: Record<string, unknown> = {
      notes: notes.trim() || null,
      homework: homework.trim() || null,
      meetingLink: meetingLink.trim() || null,
    };

    try {
      if (!amount.trim()) {
        patch.priceOverride = null;
      } else {
        const minorAmount = parseMajorToMinor(amount, currency);
        if (minorAmount <= 0) return;
        patch.priceOverride = { amount: minorAmount, currency };
      }

      const updated = await api.patch<Lesson>(`/lessons/${lesson.id}`, patch);
      onSaved(updated);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save lesson details', error);
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{t('Edit Details')}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-notes">{t('Notes')}</Label>
            <textarea
              id="edit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('Add a note…')}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-homework">{t('Homework')}</Label>
            <textarea
              id="edit-homework"
              rows={3}
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder={t('Add homework…')}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-link">{t('Meeting link')}</Label>
            <Input
              id="edit-link"
              type="url"
              placeholder="https://…"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t('Price override')}</Label>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="w-24">
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
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave}>{t('Save')}</Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
