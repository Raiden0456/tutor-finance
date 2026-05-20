import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Archive, Pencil, MoreVertical } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Student } from '@/lib/types';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_TINTS = [
  'var(--tf-indigo)',
  'var(--tf-teal)',
  'var(--tf-coral)',
  'var(--tf-jade)',
  'var(--tf-pollen)',
];

function avatarTint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]!;
}

export function StudentCard({
  student,
  onEdit,
  onArchive,
}: {
  student: Student;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { t } = useI18n();
  const tint = useMemo(() => avatarTint(student.id), [student.id]);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: -12 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <a
          href={`/students/${student.id}`}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-primary-foreground transition-opacity hover:opacity-80"
          style={{ backgroundColor: tint }}
          aria-hidden
        >
          {initials(student.name)}
        </a>
        <a href={`/students/${student.id}`} className="min-w-0 flex-1 group">
          <div className="truncate text-base font-medium group-hover:underline">{student.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {student.email || student.phone || '—'}
          </div>
          {student.notes ? (
            <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">{student.notes}</div>
          ) : null}
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('Open menu')}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> {t('Edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onArchive}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" /> {t('Archive')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {t('Hourly rate')}
        </span>
        <span className="text-lg font-semibold tabular-nums">
          {fmtMoney(student.hourlyRate.amount, student.hourlyRate.currency)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">{t('/ hr')}</span>
        </span>
      </div>
    </motion.li>
  );
}
