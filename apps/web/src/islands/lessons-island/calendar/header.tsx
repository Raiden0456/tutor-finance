import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Archive, CalendarRange, ChevronDown, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { capitalizeFirst, getDateFnsLocale, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { SelectionMode } from '../shared';

export function CalendarHeader({
  rangeStart,
  selectionMode,
  monthExpanded,
  loading,
  showArchive,
  onToggleMonth,
  onToggleMode,
  onToggleArchive,
  onLog,
  disabledLog,
}: {
  rangeStart: Date;
  selectionMode: SelectionMode;
  monthExpanded: boolean;
  loading: boolean;
  showArchive: boolean;
  onToggleMonth: () => void;
  onToggleMode: () => void;
  onToggleArchive: () => void;
  onLog: () => void;
  disabledLog: boolean;
}) {
  const { locale, t } = useI18n();
  const dateLocale = getDateFnsLocale(locale);

  return (
    <div className="flex items-center justify-between gap-2 pt-3 pb-2">
      {/* Left: month label + range span */}
      <button
        onClick={onToggleMonth}
        className="flex min-w-0 items-center gap-1.5 transition-opacity active:opacity-60"
        aria-expanded={monthExpanded}
      >
        <span className="text-base font-semibold tracking-tight">
          {capitalizeFirst(format(rangeStart, 'LLLL yyyy', { locale: dateLocale }))}
        </span>
        <motion.span
          animate={{ rotate: monthExpanded ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </button>

      {/* Right: mode toggle + archive + log */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onToggleMode}
          title={selectionMode === 'range' ? t('Single day mode') : t('Range mode')}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
            selectionMode === 'range'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <CalendarRange className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleArchive}
          title={showArchive ? t('Back to schedule') : t('View archive')}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
            showArchive
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Archive className="h-4 w-4" />
        </button>
        <Button size="sm" disabled={disabledLog || showArchive} onClick={onLog}>
          <Plus className="h-4 w-4" />
          {t('Log')}
        </Button>
      </div>
    </div>
  );
}
