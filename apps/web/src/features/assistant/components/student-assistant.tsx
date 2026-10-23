import { MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { openAssistant } from '../utils/events';
import { STUDENT_PROMPTS } from '../utils/prompts';
import { PromptChips } from './prompt-chips';

export function StudentAssistant({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const { t } = useI18n();
  return (
    <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="flex-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('Assistant')}
        </h3>
        <Button size="sm" variant="ghost" onClick={() => openAssistant({ studentId, studentName })}>
          <MessageSquare className="h-4 w-4" />
          {t('Open chat')}
        </Button>
      </div>
      <PromptChips
        prompts={STUDENT_PROMPTS}
        onPick={(prompt) => openAssistant({ studentId, studentName, prompt })}
      />
    </section>
  );
}
