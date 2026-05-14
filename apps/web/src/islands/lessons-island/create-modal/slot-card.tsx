import { format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StudentRef } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { SlotDraft } from '../shared';

export function SlotCard({
  slot,
  students,
  isFocused,
  hasOverlap,
  canDelete,
  onFocus,
  onChange,
  onDelete,
}: {
  slot: SlotDraft;
  students: StudentRef[];
  isFocused: boolean;
  hasOverlap: boolean;
  canDelete: boolean;
  onFocus: () => void;
  onChange: (patch: Partial<SlotDraft>) => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onFocus}
      className={cn(
        'rounded-xl border p-2.5 transition-all duration-200',
        isFocused ? 'border-primary/50 bg-primary/[0.03] shadow-sm' : 'border-border/50 bg-muted/20',
        hasOverlap && 'border-amber-500/50 bg-amber-500/[0.05]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Student */}
        <Select
          value={slot.studentId}
          onValueChange={(v) => onChange({ studentId: v })}
        >
          <SelectTrigger className="h-7 w-auto min-w-[100px] flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date chip */}
        <button
          type="button"
          onClick={onFocus}
          className={cn(
            'h-7 rounded-lg px-2.5 text-xs font-medium transition-all duration-150',
            isFocused
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground hover:bg-muted/70',
          )}
        >
          {format(slot.date, 'd MMM EEE')}
        </button>

        {/* Time */}
        <Input
          type="time"
          value={slot.time}
          onChange={(e) => onChange({ time: e.target.value })}
          className="h-7 w-24 text-xs"
        />

        {/* Duration */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="1"
            value={slot.durationMin}
            onChange={(e) => onChange({ durationMin: Number(e.target.value) })}
            className="h-7 w-14 text-xs"
          />
          <span className="text-xs text-muted-foreground">m</span>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
            canDelete
              ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              : 'pointer-events-none opacity-30',
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Overlap indicator */}
      <AnimatePresence>
        {hasOverlap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 pt-2 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Time overlap detected
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
