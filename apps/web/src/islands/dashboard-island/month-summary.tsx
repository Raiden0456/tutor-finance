import { ChevronRight } from 'lucide-react';
import { FinanceStat } from '@/components/finance-stat';
import { fmtMoney } from '@/lib/format';
import { localizePath, useI18n } from '@/lib/i18n';
import type { Summary } from '@/lib/types';
import { DashboardSection } from './section';

export function MonthSummary({ summary }: { summary: Summary }) {
  const { locale, t } = useI18n();
  const currency = summary.targetCurrency;

  return (
    <DashboardSection
      title={t('This month')}
      action={
        <a
          href={localizePath('/transactions', locale)}
          className="flex items-center gap-0.5 text-xs font-medium text-primary transition-opacity hover:opacity-70"
        >
          {t('Finance')}
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FinanceStat
          label={t('Income')}
          value={fmtMoney(summary.incomeInTargetCurrency, currency)}
          tone="income"
        />
        <FinanceStat
          label={t('Expenses')}
          value={fmtMoney(summary.expenseInTargetCurrency, currency)}
          tone="expense"
        />
        <FinanceStat
          label={t('Net')}
          value={fmtMoney(summary.netInTargetCurrency, currency)}
          tone={summary.netInTargetCurrency >= 0 ? 'income' : 'expense'}
        />
        <FinanceStat
          label={t('Planned')}
          value={fmtMoney(summary.plannedIncomeInTargetCurrency, currency)}
          tone="planned"
        />
      </div>
    </DashboardSection>
  );
}
