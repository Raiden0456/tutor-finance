import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn, statusLabel, statusStyles } from '@/lib/utils';
import { fmtMajor, fmtMoney } from '@/lib/format';
import { SUPPORTED_CURRENCIES, toMinorUnits, type Currency } from '@tutor-finance/shared';
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

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

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

export function LessonCard({ lesson: initialLesson, studentName, overlapping, isArchived, onChanged, onArchived, onDeleted }: LessonCardProps) {
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
    <div className={cn(
      'animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card p-4 shadow-sm duration-300',
      overlapping ? 'border-amber-500/50 bg-amber-500/[0.03]' : 'border-border',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-medium">{studentName}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {overlapping && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            <Clock className="h-3.5 w-3.5" />
            <span>{timeFmt.format(new Date(lesson.startsAt))}</span>
            <span>·</span>
            <span>{lesson.durationMin} min</span>
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
                Paid {fmtMoney(lesson.paidAmount, lesson.effectivePrice.currency)} of{' '}
                {fmtMoney(lesson.effectivePrice.amount, lesson.effectivePrice.currency)}
              </div>
            )}
          {lesson.notes ? (
            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lesson.notes}</div>
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
            {statusLabel[lesson.status]}
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
        onSaved={(updates) =>
          setLesson((prev) => ({
            ...prev,
            notes: updates.notes !== undefined ? updates.notes : prev.notes,
            meetingLink: updates.meetingLink !== undefined ? updates.meetingLink : prev.meetingLink,
            effectivePrice: updates.effectivePrice ?? prev.effectivePrice,
          }))
        }
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
            <a href={`/lessons/${lesson.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View details
            </a>
          </DropdownMenuItem>
          {!isArchived && (
            <DropdownMenuItem onClick={handleArchive} disabled={busy}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setConfirmDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResponsiveModal open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete lesson?</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody>
            <p className="text-sm text-muted-foreground">
              This permanently deletes the lesson
              {isPaid ? ' and its income transaction' : ''}.
              This action cannot be undone.
            </p>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
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

  function handlePaidClick() {
    if (phase !== 'idle') return;
    setPhase('success');
    api.patch(`/lessons/${lesson.id}`, { status: 'paid' }).catch(() => {});
    setLabelVisible(false);
    setTimeout(() => {
      setLabelSuccess(true);
      setLabelVisible(true);
    }, 150);
    setTimeout(() => onComplete('paid'), 750);
  }

  function changeStatus(status: Lesson['status']) {
    onComplete(status);
    api.patch(`/lessons/${lesson.id}`, { status }).catch(() => {});
  }

  function submitPartial() {
    const major = parseFloat(partialInput);
    if (isNaN(major) || major <= 0) return;
    const amount = toMinorUnits(major, effectiveCurrency);
    setPartialOpen(false);
    setPartialInput('');
    onComplete('partially_paid', amount);
    api
      .patch(`/lessons/${lesson.id}`, { status: 'partially_paid', paidAmount: amount })
      .catch(() => {});
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
                Paid
              </>
            ) : (
              <>
                <Banknote className="h-4 w-4" />
                {isPartial ? 'Pay Remaining' : 'Mark as Paid'}
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
                  Partial Payment
                </DropdownMenuItem>
                {canEditDetails && (
                  <DropdownMenuItem onClick={onEditDetailsClick}>
                    <PencilLine className="mr-2 h-4 w-4" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => changeStatus('no_show')}>
                  <UserX className="mr-2 h-4 w-4" />
                  No-show
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => changeStatus('cancelled')}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Cancel lesson
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ResponsiveModal open={partialOpen} onOpenChange={setPartialOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Partial Payment</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody className="grid gap-4">
            {fullFormatted && (
              <p className="text-sm text-muted-foreground">
                Full lesson price:{' '}
                <span className="font-medium text-foreground">{fullFormatted}</span>
              </p>
            )}
            <div className="grid gap-2">
              <Label>Amount received ({effectiveCurrency})</Label>
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
              Cancel
            </Button>
            <Button onClick={submitPartial} disabled={!partialInput}>
              Save
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

  function handleCompletedClick() {
    if (phase !== 'idle') return;
    setPhase('success');
    api.patch(`/lessons/${lesson.id}`, { status: 'completed' }).catch(() => {});
    setLabelVisible(false);
    setTimeout(() => {
      setLabelSuccess(true);
      setLabelVisible(true);
    }, 150);
    setTimeout(() => onStatusChange('completed'), 750);
  }

  function changeStatus(status: Lesson['status']) {
    onStatusChange(status);
    api.patch(`/lessons/${lesson.id}`, { status }).catch(() => {});
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
                Completed
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Completed
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
            title="Join meeting"
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
                Reschedule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEditDetailsClick}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeStatus('no_show')}>
                <UserX className="mr-2 h-4 w-4" />
                No-show
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => changeStatus('cancelled')}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel lesson
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ResponsiveModal open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Reschedule lesson</ResponsiveModalTitle>
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
                <Label htmlFor="reschedule-startsAt">New date &amp; time</Label>
                <Input
                  id="reschedule-startsAt"
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultDateTime}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reschedule-duration">Duration (min)</Label>
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
                Cancel
              </Button>
              <Button type="submit">Save</Button>
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
  onSaved: (updates: {
    effectivePrice?: { amount: number; currency: Currency };
    notes?: string | null;
    meetingLink?: string | null;
  }) => void;
}) {
  const [notes, setNotes] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');

  useEffect(() => {
    if (open) {
      setNotes(lesson.notes ?? '');
      setMeetingLink(lesson.meetingLink ?? '');
      setAmount(
        lesson.effectivePrice
          ? fmtMajor(lesson.effectivePrice.amount, lesson.effectivePrice.currency)
          : '',
      );
      setCurrency((lesson.effectivePrice?.currency as Currency | undefined) ?? 'USD');
    }
  }, [open]);

  async function handleSave() {
    const patch: Record<string, unknown> = {
      notes: notes.trim() || null,
      meetingLink: meetingLink.trim() || null,
    };

    let newPrice: { amount: number; currency: Currency } | undefined;
    const major = parseFloat(amount);
    if (!isNaN(major) && major > 0) {
      const minorAmount = toMinorUnits(major, currency);
      patch.priceOverride = { amount: minorAmount, currency };
      newPrice = { amount: minorAmount, currency };
    }

    onOpenChange(false);
    onSaved({
      notes: patch.notes as string | null,
      meetingLink: patch.meetingLink as string | null,
      effectivePrice: newPrice,
    });
    api.patch(`/lessons/${lesson.id}`, patch).catch(() => {});
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Edit Details</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <ResponsiveModalBody className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <textarea
              id="edit-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note…"
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-link">Meeting link</Label>
            <Input
              id="edit-link"
              type="url"
              placeholder="https://…"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Price override</Label>
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
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
