import { useState } from 'react';
import { motion } from 'motion/react';
import { Pencil, Pause, Play, Repeat, Trash2 } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import type { Recurring } from '@/lib/types';
import { FREQ_LABELS, dateFmt } from '../constants';

export function RecurringCard({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Recurring;
  onToggle: (r: Recurring) => void;
  onEdit: (r: Recurring) => void;
  onDelete: (id: string) => void;
}) {
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
            (item.isActive ? 'bg-expense/12' : 'bg-muted')
          }
        >
          <Repeat
            className={'h-5 w-5 ' + (item.isActive ? 'text-expense' : 'text-muted-foreground')}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-medium capitalize">{item.category}</span>
            <span className="text-base font-semibold tabular-nums text-expense">
              -{fmtMoney(item.amount, item.currency)}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
              {FREQ_LABELS[item.frequency]}
            </span>
            <span>Next: {dateFmt.format(new Date(item.nextDueAt))}</span>
            {!item.isActive && <span className="text-muted-foreground/60">Paused</span>}
          </div>
          {item.description && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onToggle(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={item.isActive ? 'Pause' : 'Resume'}
          >
            {item.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Edit"
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
              Confirm
            </button>
          ) : (
            <button
              key="delete"
              type="button"
              onClick={() => setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
              className="animate-in fade-in zoom-in-95 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-destructive/15 hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.li>
  );
}
