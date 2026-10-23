import { Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function PromptChips({
  prompts,
  onPick,
  disabled,
  className,
}: {
  prompts: string[];
  onPick: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(t(prompt))}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3 text-primary" />
          {t(prompt)}
        </button>
      ))}
    </div>
  );
}
