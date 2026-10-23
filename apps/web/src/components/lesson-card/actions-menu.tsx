import { useState } from 'react';
import {
  Archive,
  Ban,
  Banknote,
  CalendarClock,
  ExternalLink,
  MoreHorizontal,
  PencilLine,
  Trash2,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Spinner } from '@/components/ui/spinner';
import { localizePath, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/lib/types';
import type { LessonActions } from '@/hooks/use-lesson-actions';
import { lessonMenuActions } from '@/utils/lesson';
import { EditDetailsModal } from './edit-details-modal';
import { PartialPaymentModal } from './partial-payment-modal';
import { RescheduleModal } from './reschedule-modal';

type Dialog = 'reschedule' | 'details' | 'partial' | 'delete' | null;

export function LessonActionsMenu({
  lesson,
  actions,
  variant = 'card',
  isArchived,
  onArchived,
  onDeleted,
}: {
  lesson: Lesson;
  actions: LessonActions;
  variant?: 'card' | 'page';
  isArchived?: boolean;
  onArchived?: () => void;
  onDeleted?: () => void;
}) {
  const { locale, t } = useI18n();
  const [dialog, setDialog] = useState<Dialog>(null);
  const available = lessonMenuActions(lesson);
  const onCard = variant === 'card';
  const editable = !isArchived;
  const hasIncome =
    (lesson.status === 'paid' || lesson.status === 'partially_paid') && !lesson.isPackageCovered;

  function closeDialog(open: boolean) {
    if (!open) setDialog(null);
  }

  async function handleArchive() {
    if (await actions.archive()) onArchived?.();
  }

  async function handleDelete() {
    if (await actions.remove()) {
      setDialog(null);
      onDeleted?.();
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('More actions')}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground',
              onCard ? 'h-8 w-8' : 'h-10 w-10 border border-border bg-card',
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          {onCard && (
            <DropdownMenuItem asChild>
              <a href={localizePath(`/lessons/${lesson.id}`, locale)}>
                <ExternalLink className="h-4 w-4" />
                {t('View details')}
              </a>
            </DropdownMenuItem>
          )}
          {editable && onCard && available.reschedule && (
            <DropdownMenuItem onClick={() => setDialog('reschedule')}>
              <CalendarClock className="h-4 w-4" />
              {t('Reschedule')}
            </DropdownMenuItem>
          )}
          {editable && onCard && (
            <DropdownMenuItem onClick={() => setDialog('details')}>
              <PencilLine className="h-4 w-4" />
              {t('Edit Details')}
            </DropdownMenuItem>
          )}
          {editable && available.partialPayment && (
            <DropdownMenuItem onClick={() => setDialog('partial')}>
              <Banknote className="h-4 w-4" />
              {t('Partial Payment')}
            </DropdownMenuItem>
          )}
          {editable && available.noShow && (
            <DropdownMenuItem disabled={actions.pending} onClick={() => actions.markNoShow()}>
              <UserX className="h-4 w-4" />
              {t('No-show')}
            </DropdownMenuItem>
          )}
          {editable && available.cancel && (
            <DropdownMenuItem disabled={actions.pending} onClick={() => actions.cancel()}>
              <Ban className="h-4 w-4" />
              {t('Cancel lesson')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {!isArchived && (
            <DropdownMenuItem disabled={actions.pending} onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              {t('Archive')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem variant="destructive" onClick={() => setDialog('delete')}>
            <Trash2 className="h-4 w-4" />
            {t('Delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RescheduleModal
        open={dialog === 'reschedule'}
        onOpenChange={closeDialog}
        lesson={lesson}
        actions={actions}
      />
      <EditDetailsModal
        open={dialog === 'details'}
        onOpenChange={closeDialog}
        lesson={lesson}
        actions={actions}
      />
      <PartialPaymentModal
        open={dialog === 'partial'}
        onOpenChange={closeDialog}
        lesson={lesson}
        actions={actions}
      />
      <ResponsiveModal open={dialog === 'delete'} onOpenChange={closeDialog}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Delete lesson?')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody>
            <p className="text-sm text-muted-foreground">
              {t('This permanently deletes the lesson')}
              {hasIncome ? ` ${t('and its income transaction')}` : ''}.{' '}
              {t('This action cannot be undone.')}
            </p>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actions.pending}>
              {actions.pending && <Spinner />}
              {t('Delete')}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
}
