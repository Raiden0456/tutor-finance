import { BookOpen, NotebookPen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { openAssistant } from '../utils/events';

export function LessonAssistantActions({
  startsAt,
  studentId,
  studentName,
}: {
  startsAt: string;
  studentId: string;
  studentName: string;
}) {
  const { t, locale } = useI18n();
  const when = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(startsAt));

  const ask = (prompt: string) => openAssistant({ studentId, studentName, prompt });

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        onClick={() => ask(t('Prepare a lesson plan for the lesson on {when}.', { when }))}
      >
        <NotebookPen className="h-4 w-4 text-primary" />
        {t('Lesson plan')}
      </Button>
      <Button
        variant="outline"
        onClick={() => ask(t('Suggest homework ideas for the lesson on {when}.', { when }))}
      >
        <BookOpen className="h-4 w-4 text-primary" />
        {t('Homework ideas')}
      </Button>
    </div>
  );
}
