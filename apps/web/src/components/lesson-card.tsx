import { useState } from 'react';
import { api } from '@/lib/api';
import { cn, statusLabel, statusStyles } from '@/lib/utils';
import { fmtMoney } from '@/lib/format';
import { toMinorUnits } from '@tutor-finance/shared';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ban, Banknote, CheckCircle2, Clock, MoreHorizontal, UserX } from 'lucide-react';
import type { Lesson } from '@/lib/types';

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

function needsPayment(status: Lesson['status']) {
  return status === 'due' || status === 'partially_paid' || status === 'completed';
}

export interface LessonCardProps {
  lesson: Lesson;
  studentName: string;
  /** Optional callback fired after a status change (after the local animation completes). */
  onChanged?: () => void;
}

export function LessonCard({ lesson: initialLesson, studentName, onChanged }: LessonCardProps) {
  const [lesson, setLesson] = useState(initialLesson);
  const [scheduledVisible, setScheduledVisible] = useState(
    () => initialLesson.status === 'scheduled',
  );
  const [scheduledCollapsed, setScheduledCollapsed] = useState(false);
  const [dueVisible, setDueVisible] = useState(() => needsPayment(initialLesson.status));
  const [dueCollapsed, setDueCollapsed] = useState(false);

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
    // Collapse the actions section first, then signal the parent.
    // This prevents a height jump while the outer section is also animating out.
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
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-border bg-card p-4 shadow-sm duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-medium">{studentName}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeFmt.format(new Date(lesson.startsAt))}</span>
            <span>·</span>
            <span>{lesson.durationMin} min</span>
          </div>
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
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
            statusStyles[lesson.status] ?? 'bg-muted text-muted-foreground',
          )}
        >
          {statusLabel[lesson.status]}
        </span>
      </div>

      {/* Upcoming lesson actions — animated collapse when status leaves 'scheduled' */}
      {scheduledVisible && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-[400ms] ease-in-out',
            scheduledCollapsed ? 'max-h-0 opacity-0' : 'max-h-[80px] opacity-100',
          )}
        >
          <div className="mt-3 border-t border-border pt-3">
            <ScheduledActions lesson={lesson} onStatusChange={onScheduledChange} />
          </div>
        </div>
      )}

      {/* Payment actions — animated collapse when paid/cancelled/no_show */}
      {dueVisible && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-500 ease-in-out',
            dueCollapsed ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100',
          )}
        >
          <div className="mt-3 border-t border-border pt-3">
            <DuePaymentActions lesson={lesson} onComplete={onPaymentComplete} />
          </div>
        </div>
      )}
    </div>
  );
}

function DuePaymentActions({
  lesson,
  onComplete,
}: {
  lesson: Lesson;
  onComplete: (status: Lesson['status'], paidAmount?: number | null) => void;
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

function ScheduledActions({
  lesson,
  onStatusChange,
}: {
  lesson: Lesson;
  onStatusChange: (status: Lesson['status']) => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'success'>('idle');
  const [labelVisible, setLabelVisible] = useState(true);
  const [labelSuccess, setLabelSuccess] = useState(false);

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

  return (
    <div className="flex">
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
  );
}
