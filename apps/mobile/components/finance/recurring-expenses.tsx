import * as React from 'react';
import { View } from 'react-native';
import { Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react-native';
import { EmptyState } from '~/components/common/empty-state';
import { ErrorState } from '~/components/common/error-state';
import { RecurringForm } from '~/components/forms/recurring-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { categoryLabel } from '~/lib/catalog';
import { money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import { useApiQuery } from '~/lib/use-query';
import { useMutation } from '~/lib/use-mutation';
import type { Recurring } from '~/lib/types';

export function RecurringExpenses({ version }: { version: number }) {
  const { t, locale } = useI18n();
  const recurring = useApiQuery(() => api.get<Recurring[]>('recurring'), [version]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Recurring | null>(null);
  const [toDelete, setToDelete] = React.useState<Recurring | null>(null);

  const togglePause = useMutation(async (r: Recurring) => {
    await api.patch(`recurring/${r.id}`, { isActive: !r.isActive });
    void recurring.refetch();
  });
  const remove = useMutation(async () => {
    if (!toDelete) return;
    await api.delete(`recurring/${toDelete.id}`);
    setToDelete(null);
    void recurring.refetch();
  });

  return (
    <View className="gap-3">
      {recurring.error && !recurring.data ? (
        <ErrorState
          message={recurring.error}
          onRetry={recurring.refetch}
          retrying={recurring.loading}
        />
      ) : recurring.loading && (recurring.data ?? []).length === 0 ? (
        <Skeleton className="h-32 w-full" />
      ) : (recurring.data ?? []).length === 0 ? (
        <EmptyState
          title={t('No recurring expenses')}
          description={t('No recurring expenses yet. Add one to automate regular costs.')}
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Icon as={Plus} size={15} />
              <Text>{t('Add recurring expense')}</Text>
            </Button>
          }
        />
      ) : (
        (recurring.data ?? []).map((r) => (
          <View
            key={r.id}
            className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <View className="flex-1">
              <Text className="font-medium">{categoryLabel(r.category, t)}</Text>
              <Text className="text-xs text-muted-foreground">
                {t(r.frequency)} · {money(r.amount, r.currency, locale)}
                {r.isActive ? '' : ` · ${t('Paused')}`}
              </Text>
            </View>
            <Button
              size="icon"
              variant="ghost"
              disabled={togglePause.pending}
              onPress={() => void togglePause.run(r)}
            >
              <Icon as={r.isActive ? Pause : Play} size={18} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onPress={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              <Icon as={Pencil} size={18} />
            </Button>
            <Button size="icon" variant="ghost" onPress={() => setToDelete(r)}>
              <Icon as={Trash2} size={18} className="text-destructive" />
            </Button>
          </View>
        ))
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={setFormOpen}
        recurring={editing}
        onSaved={() => recurring.refetch()}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete transaction?')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              disabled={remove.pending}
              onPress={() => void remove.run()}
            >
              <Text>{t('Delete')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
