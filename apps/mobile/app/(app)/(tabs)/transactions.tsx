import * as React from 'react';
import { View } from 'react-native';
import { Screen } from '~/components/common/screen';
import { ErrorState } from '~/components/common/error-state';
import { Segmented } from '~/components/common/segmented';
import { TabFade } from '~/components/common/tab-fade';
import { RecurringExpenses } from '~/components/finance/recurring-expenses';
import { TransactionsOverview } from '~/components/finance/transactions-overview';
import { TransactionForm } from '~/components/forms/transaction-form';
import { api } from '~/lib/api';
import { bumpDataVersion, useDataVersion } from '~/lib/data-version';
import { useI18n } from '~/lib/i18n';
import { useApiQuery } from '~/lib/use-query';
import type { Student, Tx } from '~/lib/types';

export default function FinanceScreen() {
  const { t } = useI18n();
  const version = useDataVersion();
  const [tab, setTab] = React.useState<'transactions' | 'recurring'>('transactions');
  const [editingTx, setEditingTx] = React.useState<Tx | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [version],
  );

  return (
    <>
      <Screen title={t('Finance')}>
        <View className="gap-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'transactions', label: t('All transactions') },
              { value: 'recurring', label: t('Recurring') },
            ]}
          />
          <TabFade tabKey={tab}>
            {students.error && !students.data ? (
              <ErrorState
                message={students.error}
                onRetry={students.refetch}
                retrying={students.loading}
              />
            ) : tab === 'transactions' ? (
              <TransactionsOverview
                students={students.data ?? []}
                version={version}
                onEdit={(tx) => {
                  setEditingTx(tx);
                  setFormOpen(true);
                }}
              />
            ) : (
              <RecurringExpenses version={version} />
            )}
          </TabFade>
        </View>
      </Screen>
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editingTx}
        students={students.data ?? []}
        onSaved={bumpDataVersion}
      />
    </>
  );
}
