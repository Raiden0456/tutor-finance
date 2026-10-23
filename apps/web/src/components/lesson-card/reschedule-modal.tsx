import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { useI18n } from '@/lib/i18n';
import type { Lesson } from '@/lib/types';
import type { LessonActions } from '@/hooks/use-lesson-actions';
import { toLocalDateTimeValue } from '@/utils/lesson';

export function RescheduleModal({
  open,
  onOpenChange,
  lesson,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson: Lesson;
  actions: LessonActions;
}) {
  const { t } = useI18n();

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const ok = await actions.update({
      startsAt: new Date(String(data.get('startsAt'))).toISOString(),
      durationMin: Number(data.get('durationMin')),
    });
    if (ok) onOpenChange(false);
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{t('Reschedule lesson')}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!actions.pending) void submit(e.currentTarget);
          }}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <ResponsiveModalBody className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`reschedule-at-${lesson.id}`}>{t('New date & time')}</Label>
              <Input
                id={`reschedule-at-${lesson.id}`}
                name="startsAt"
                type="datetime-local"
                required
                defaultValue={toLocalDateTimeValue(lesson.startsAt)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`reschedule-duration-${lesson.id}`}>{t('Duration (min)')}</Label>
              <Input
                id={`reschedule-duration-${lesson.id}`}
                name="durationMin"
                type="number"
                min="1"
                required
                defaultValue={lesson.durationMin}
              />
            </div>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={actions.pending}>
              {actions.pending && <Spinner />}
              {t('Save')}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
