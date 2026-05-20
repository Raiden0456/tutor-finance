import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Pause, Pencil, Play, RefreshCw, Trash2 } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import type { RecurringLesson } from '@/lib/types';
import { capitalizeFirst, getDateFnsLocale, useI18n } from '@/lib/i18n';

// Jan 5 2025 = Sunday (index 0), so index d => Jan 5+d 2025
const REF_SUNDAY = new Date(2025, 0, 5);

export function ScheduleCard({
  item,
  studentName,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: RecurringLesson;
  studentName: string;
  onToggle: (r: RecurringLesson) => void;
  onEdit: (r: RecurringLesson) => void;
  onDelete: (id: string) => void;
}) {
  const { locale, t } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={
        'overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-opacity ' +
        (item.isActive ? 'opacity-100' : 'opacity-60')
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' +
            (item.isActive ? 'bg-primary/10' : 'bg-muted')
          }
        >
          <RefreshCw
            className={'h-5 w-5 ' + (item.isActive ? 'text-primary' : 'text-muted-foreground')}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium">{studentName}</span>
            {item.priceOverride && (
              <span className="text-base font-semibold tabular-nums text-income">
                {fmtMoney(item.priceOverride.amount, item.priceOverride.currency)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>
              {[...item.daysOfWeek]
              .sort((a, b) => a - b)
              .map((d) => capitalizeFirst(format(new Date(REF_SUNDAY.getTime() + d * 86400000), 'EEE', { locale: dateLocale })))
              .join(', ')} · {item.startTime}
            </span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
              {item.frequency === 'biweekly' ? t('Biweekly') : t('Weekly')}
            </span>
            <span>{item.durationMin} {t('min')}</span>
            {!item.isActive && (
              <span className="text-muted-foreground/60">{t('Paused')}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onToggle(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={item.isActive ? t('Pause') : t('Resume')}
          >
            {item.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={t('Edit')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          {confirmDelete ? (
            <button
              key="confirm"
              type="button"
              onClick={() => onDelete(item.id)}
              className="animate-in fade-in zoom-in-95 flex h-8 items-center gap-1 rounded-full bg-destructive/15 px-2 text-xs font-medium text-destructive transition-colors duration-150 hover:bg-destructive hover:text-destructive-foreground"
            >
              {t('Confirm')}
            </button>
          ) : (
            <button
              key="delete"
              type="button"
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
              className="animate-in fade-in zoom-in-95 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
              aria-label={t('Delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
}
