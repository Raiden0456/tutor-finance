import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { openAssistant } from '../utils/events';

export function AssistantTrigger({
  label,
  variant,
}: {
  label: string;
  variant: 'sidebar' | 'icon';
}) {
  if (variant === 'icon') {
    return (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={label}
        onClick={() => openAssistant()}
        className="transition-all duration-150 active:scale-90"
      >
        <Sparkles className="h-4 w-4 text-primary" />
      </Button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openAssistant()}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-200',
        'hover:bg-primary/10 hover:text-primary',
      )}
    >
      <Sparkles className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </button>
  );
}
