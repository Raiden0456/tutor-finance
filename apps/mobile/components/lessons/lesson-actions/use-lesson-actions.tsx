import * as React from 'react';
import { useRouter } from 'expo-router';
import { displayStatus, isNotPastDay, primaryAction, type Currency } from '@tutor-finance/shared';
import {
  Archive,
  Ban,
  Banknote,
  CalendarClock,
  ExternalLink,
  PencilLine,
  Trash2,
  UserX,
} from 'lucide-react-native';
import { ActionSheet, type ActionItem } from '~/components/common/action-sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useI18n } from '~/lib/i18n';
import { useMutation } from '~/lib/use-mutation';
import { useSettings } from '~/lib/settings';
import type { Lesson } from '~/lib/types';
import { EditDetailsSheet } from './edit-details-sheet';
import { PartialPaymentSheet } from './partial-payment-sheet';
import { PRIMARY_ACTION_PATCH } from './primary-action-button';
import { RescheduleSheet } from './reschedule-sheet';
import type { LessonPatch } from './types';

type Sheet = 'menu' | 'reschedule' | 'partial' | 'edit' | 'delete' | null;

export function useLessonActions({
  lesson,
  title,
  showDetails = true,
  onChanged,
  onDeleted,
}: {
  lesson: Lesson;
  title?: string;
  showDetails?: boolean;
  onChanged?: (updated?: Lesson) => void;
  onDeleted?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { primaryCurrency } = useSettings();
  const action = useMutation((fn: () => Promise<boolean>) => fn());
  const [sheet, setSheet] = React.useState<Sheet>(null);
  const setOpen = (name: Exclude<Sheet, null>) => (open: boolean) => setSheet(open ? name : null);

  const price = lesson.effectivePrice;
  const currency: Currency = price?.currency ?? lesson.priceOverride?.currency ?? primaryCurrency;
  const display = displayStatus(lesson);
  const primary = primaryAction(lesson);

  const patch: LessonPatch = (body) =>
    action.run(async () => {
      const updated = await api.patch<Lesson>(`lessons/${lesson.id}`, body);
      onChanged?.(updated);
      return true;
    });

  const archive = () =>
    action.run(async () => {
      await api.post(`lessons/${lesson.id}/archive`);
      onChanged?.();
      return true;
    });

  const remove = () =>
    action.run(async () => {
      await api.delete(`lessons/${lesson.id}`);
      setSheet(null);
      (onDeleted ?? onChanged)?.();
      return true;
    });

  const editItem: ActionItem = {
    label: t('Edit Details'),
    icon: PencilLine,
    onPress: () => setSheet('edit'),
  };
  const statusItems: ActionItem[] = [
    { label: t('No-show'), icon: UserX, onPress: () => void patch({ status: 'no_show' }) },
    {
      label: t('Cancel lesson'),
      icon: Ban,
      destructive: true,
      onPress: () => void patch({ status: 'cancelled' }),
    },
  ];

  const items: ActionItem[] = [
    ...(showDetails
      ? [
          {
            label: t('View details'),
            icon: ExternalLink,
            onPress: () => router.push(`/(app)/lessons/${lesson.id}`),
          },
        ]
      : []),
    ...(display === 'scheduled'
      ? [
          { label: t('Reschedule'), icon: CalendarClock, onPress: () => setSheet('reschedule') },
          editItem,
          ...statusItems,
        ]
      : []),
    ...(display === 'awaiting_payment'
      ? [
          ...(price
            ? [{ label: t('Partial payment'), icon: Banknote, onPress: () => setSheet('partial') }]
            : []),
          ...(isNotPastDay(lesson.startsAt) ? [editItem] : []),
          ...statusItems,
        ]
      : []),
    ...(!lesson.archivedAt
      ? [{ label: t('Archive'), icon: Archive, onPress: () => void archive() }]
      : []),
    { label: t('Delete'), icon: Trash2, destructive: true, onPress: () => setSheet('delete') },
  ];

  const hasIncome =
    (lesson.status === 'paid' || lesson.status === 'partially_paid') && !lesson.isPackageCovered;

  const elements = (
    <>
      <ActionSheet
        open={sheet === 'menu'}
        onOpenChange={setOpen('menu')}
        title={title}
        items={items}
      />
      <RescheduleSheet
        open={sheet === 'reschedule'}
        onOpenChange={setOpen('reschedule')}
        lesson={lesson}
        onSubmit={patch}
      />
      <PartialPaymentSheet
        open={sheet === 'partial'}
        onOpenChange={setOpen('partial')}
        currency={currency}
        fullPrice={price?.amount ?? null}
        onSubmit={patch}
      />
      <EditDetailsSheet
        open={sheet === 'edit'}
        onOpenChange={setOpen('edit')}
        lesson={lesson}
        defaultCurrency={currency}
        onSubmit={patch}
      />
      <AlertDialog open={sheet === 'delete'} onOpenChange={setOpen('delete')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete lesson?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This permanently deletes the lesson')}
              {hasIncome ? ` ${t('and its income transaction')}` : ''}.{' '}
              {t('This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={action.pending}
              onPress={() => void remove()}
            >
              <Text>{t('Delete')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return {
    primary,
    runPrimary: () => {
      if (primary) void patch(PRIMARY_ACTION_PATCH[primary]);
    },
    busy: action.pending,
    openMenu: () => setSheet('menu'),
    elements,
  };
}
