import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import type { Tx } from '@/lib/types';
import type { Currency } from '@tutor-finance/shared';
import { dateFmt } from './constants';

export function TxCard({
  tx,
  primaryCurrency,
  studentMap,
}: {
  tx: Tx;
  primaryCurrency: Currency;
  studentMap: Map<string, string>;
}) {
  const isIncome = tx.type === 'income';
  const Icon = isIncome ? ArrowUpRight : ArrowDownRight;
  const accent = isIncome ? 'text-income' : 'text-expense';
  const accentBg = isIncome ? 'bg-income/12' : 'bg-expense/12';
  const accentBorder = isIncome ? 'border-l-income' : 'border-l-expense';
  const studentName = tx.studentId ? studentMap.get(tx.studentId) : null;
  return (
    <li
      className={
        'rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm ' + accentBorder
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
              <div className="truncate text-sm font-medium capitalize">{tx.category}</div>
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
      </div>
    </li>
  );
}
