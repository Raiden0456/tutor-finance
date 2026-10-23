import { ArrowDownRight, ArrowUpRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fmtMoney } from '@/lib/format';
import type { Tx } from '@/lib/types';
import type { Currency } from '@tutor-finance/shared';
import { useI18n } from '@/lib/i18n';
import { categoryLabel } from '../constants';

export function TxCard({
  tx,
  primaryCurrency,
  studentMap,
  onEdit,
  onDelete,
}: {
  tx: Tx;
  primaryCurrency: Currency;
  studentMap: Map<string, string>;
  onEdit: (tx: Tx) => void;
  onDelete: (tx: Tx) => void;
}) {
  const { locale, t } = useI18n();
  const dateFmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const isIncome = tx.type === 'income';
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
  const accent = isIncome ? 'text-income' : 'text-expense';
  const accentBg = isIncome ? 'bg-income/12' : 'bg-expense/12';
  const accentBorder = isIncome ? 'border-l-income' : 'border-l-expense';
  const studentName = tx.studentId ? studentMap.get(tx.studentId) : null;
  const managed = !!tx.lessonId || !!tx.studentLessonPackageId;
  return (
    <li
      className={
        'animate-in fade-in rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm duration-300 ' +
        accentBorder
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' + accentBg}
        >
          <Icon className={'h-5 w-5 ' + accent} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium capitalize">
                {categoryLabel(tx.category, t)}
              </div>
              {studentName && (
                <div className="truncate text-xs text-muted-foreground">{studentName}</div>
              )}
            </div>
            <div className={'shrink-0 text-base font-semibold tabular-nums ' + accent}>
              {isIncome ? '+' : '−'}
              {fmtMoney(tx.amount, tx.currency)}
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate">
              {tx.description || dateFmt.format(new Date(tx.occurredAt))}
            </span>
            {typeof tx.convertedAmount === 'number' && tx.currency !== primaryCurrency ? (
              <span className="shrink-0 tabular-nums">
                ≈ {fmtMoney(tx.convertedAmount, primaryCurrency)}
              </span>
            ) : (
              <span className="shrink-0">{dateFmt.format(new Date(tx.occurredAt))}</span>
            )}
          </div>
        </div>
        {!managed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('More actions')}
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(tx)}>
                <Pencil className="h-4 w-4" />
                {t('Edit')}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(tx)}>
                <Trash2 className="h-4 w-4" />
                {t('Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
