import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Archive, ArchiveRestore, MoreVertical, Pencil } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Currency } from '@tutor-finance/shared';
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

/** Compact student row — mirrors the mobile app's student card. */
export function StudentCard({
  student,
  earnedMinor,
  primaryCurrency,
  onEdit,
  onArchive,
  onRestore,
}: {
  student: Student;
  earnedMinor?: number;
  primaryCurrency: Currency;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}) {
  const { t } = useI18n();
  const tint = useMemo(() => avatarTint(student.id), [student.id]);
  const archived = !!student.archivedAt;

  const pricing =
    student.pricingMode === 'package' && student.activePackage
      ? `${t('Package')} · ${student.activePackage.remainingLessons} ${t('Remaining').toLowerCase()}`
      : `${fmtMoney(student.hourlyRate.amount, student.hourlyRate.currency)} / ${student.ratePeriodMin} ${t('min')}`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: -12 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3 p-3">
        <a href={`/students/${student.id}`} className="flex min-w-0 flex-1 items-center gap-3 group">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: tint }}
            aria-hidden
          >
            {initials(student.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium group-hover:underline">
                {student.name}
              </span>
              {student.dueLessonsCount ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-tf-pollen/15 px-1.5 py-0.5 text-[10px] font-medium text-tf-pollen">
                  <span className="h-1.5 w-1.5 rounded-full bg-tf-pollen" />
                  {t('{count} unpaid', { count: student.dueLessonsCount })}
                </span>
              ) : null}
            </span>
            <span className="block truncate text-xs text-muted-foreground">{pricing}</span>
          </span>
        </a>

        {typeof earnedMinor === 'number' ? (
          <div className="shrink-0 text-right">
            <div className="text-[11px] text-muted-foreground">{t('Earned')}</div>
            <div className="text-sm font-semibold tabular-nums text-income">
              {fmtMoney(earnedMinor, primaryCurrency)}
            </div>
          </div>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('Open menu')}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {archived ? (
              <DropdownMenuItem onClick={onRestore}>
                <ArchiveRestore className="mr-2 h-4 w-4" /> {t('Restore')}
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> {t('Edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onArchive}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="mr-2 h-4 w-4" /> {t('Archive')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  );
}
