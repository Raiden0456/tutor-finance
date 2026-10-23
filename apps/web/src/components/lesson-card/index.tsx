import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, BookOpen, Clock, RefreshCw, Video } from 'lucide-react';
import { displayStatus, isNotPastDay, primaryAction } from '@tutor-finance/shared';
import { Collapse } from '@/components/ui/collapse';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { Lesson } from '@/lib/types';
import { errorMessage } from '@/hooks/use-mutation';
import { useLessonActions } from '@/hooks/use-lesson-actions';
import { isSameLocalDay } from '@/utils/lesson';
import { LessonActionsMenu } from './actions-menu';
import { LessonPrimaryButton } from './primary-action-button';
import { LessonStatusBadge, lessonNote } from './status-badge';

export { LessonStatusBadge, lessonNote } from './status-badge';
export { LessonActionsMenu } from './actions-menu';
export { LessonPrimaryButton } from './primary-action-button';

export interface LessonCardProps {
  lesson: Lesson;
  studentName: string;
  overlapping?: boolean;
  isArchived?: boolean;
  compact?: boolean;
  onChanged?: () => void | Promise<unknown>;
  onArchived?: () => void | Promise<unknown>;
  onDeleted?: () => void | Promise<unknown>;
}

export function LessonCard({
  lesson: initialLesson,
  studentName,
  overlapping,
  isArchived,
  compact,
  onChanged,
  onArchived,
  onDeleted,
}: LessonCardProps) {
  const { locale, t } = useI18n();
  const [lesson, setLesson] = useState(initialLesson);

  useEffect(() => setLesson(initialLesson), [initialLesson]);

  const notify = useCallback(
    (callback?: () => void | Promise<unknown>) => {
      if (!callback) return;
      Promise.resolve()
        .then(callback)
        .catch((error: unknown) => toast.error(errorMessage(error, t)));
    },
    [t],
  );

  const handleUpdated = useCallback(
    (updated: Lesson) => {
      setLesson(updated);
      notify(onChanged);
    },
    [notify, onChanged],
  );

  const actions = useLessonActions(lesson.id, handleUpdated);
  const action = isArchived ? null : primaryAction(lesson);
  const lastAction = useRef(action);
  if (action) lastAction.current = action;
  const startsAt = new Date(lesson.startsAt);
  const timeLabel = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    startsAt,
  );
  const dateLabel = isSameLocalDay(startsAt, new Date())
    ? null
    : new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(
        startsAt,
      );
  const note = lessonNote(lesson, t);
  const showJoin =
    !!lesson.meetingLink && displayStatus(lesson) !== 'cancelled' && isNotPastDay(lesson.startsAt);

  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-2 rounded-2xl border bg-card shadow-sm transition-colors duration-300',
        compact ? 'p-3' : 'p-4',
        overlapping ? 'border-amber-500/50 bg-amber-500/[0.03]' : 'border-border',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-medium">{studentName}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            {overlapping && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
            <Clock className="h-3.5 w-3.5" />
            {dateLabel && <span>{dateLabel} ·</span>}
            <span>{timeLabel}</span>
            <span>·</span>
            <span>
              {lesson.durationMin} {t('min')}
            </span>
            {lesson.recurringLessonId && <RefreshCw className="h-3 w-3 text-primary/60" />}
          </div>
          {note && (
            <div
              className={cn(
                'mt-1 text-xs transition-colors duration-200',
                note.accent ? 'text-tf-coral' : 'text-muted-foreground',
              )}
            >
              {note.text}
            </div>
          )}
          {!compact && lesson.notes && (
            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lesson.notes}</div>
          )}
          {!compact && lesson.homework && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{lesson.homework}</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <LessonStatusBadge lesson={lesson} />
          {showJoin && (
            <a
              href={lesson.meetingLink!}
              target="_blank"
              rel="noopener noreferrer"
              title={t('Join meeting')}
              aria-label={t('Join meeting')}
              className="animate-in fade-in zoom-in-95 flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors duration-200 hover:bg-primary/10"
            >
              <Video className="h-4 w-4" />
            </a>
          )}
          <LessonActionsMenu
            lesson={lesson}
            actions={actions}
            isArchived={isArchived}
            onArchived={() => notify(onArchived)}
            onDeleted={() => notify(onDeleted)}
          />
        </div>
      </div>

      <Collapse open={!!action}>
        <div className={compact ? 'pt-2.5' : 'pt-3'}>
          {lastAction.current && (
            <LessonPrimaryButton action={lastAction.current} actions={actions} />
          )}
        </div>
      </Collapse>
    </div>
  );
}
