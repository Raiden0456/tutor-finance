import * as React from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, CircleDollarSign, Pencil, Trash2, Video } from 'lucide-react-native';
import { Screen } from '~/components/common/screen';
import { StatusBadge } from '~/components/lessons/status-badge';
import { LessonForm } from '~/components/forms/lesson-form';
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
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useI18n } from '~/lib/i18n';
import { formatDate, money } from '~/lib/format';
import type { Lesson, Student } from '~/lib/types';

export default function LessonDetailScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const lesson = useApiQuery(() => api.get<Lesson>(`lessons/${id}`), [id]);
  const studentId = lesson.data?.studentId;
  const student = useApiQuery(
    () => (studentId ? api.get<Student>(`students/${studentId}`) : Promise.resolve(null)),
    [studentId],
  );

  const [editOpen, setEditOpen] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const l = lesson.data;
  const refresh = () => {
    void lesson.refetch();
  };

  const patchStatus = async (patch: Record<string, unknown>) => {
    await api.patch(`lessons/${id}`, patch);
    refresh();
  };

  const remove = async () => {
    await api.delete(`lessons/${id}`);
    setConfirmDelete(false);
    router.back();
  };

  if (lesson.loading && !l) {
    return (
      <Screen onBack={() => router.back()} title="">
        <Skeleton className="h-40 w-full" />
      </Screen>
    );
  }
  if (!l) {
    return (
      <Screen onBack={() => router.back()} title={t('Lesson')}>
        <Text className="text-muted-foreground">{t('Error')}</Text>
      </Screen>
    );
  }

  const price = l.effectivePrice;

  return (
    <>
      <Screen
        onBack={() => router.back()}
        title={t('Lesson with {name}', { name: student.data?.name ?? '' })}
        right={
          <View className="flex-row gap-1">
            <Button size="icon" variant="ghost" onPress={() => setEditOpen(true)}>
              <Icon as={Pencil} size={18} />
            </Button>
            <Button size="icon" variant="ghost" onPress={() => setConfirmDelete(true)}>
              <Icon as={Trash2} size={18} className="text-destructive" />
            </Button>
          </View>
        }
      >
        <View className="gap-4">
          <Card>
            <CardContent className="gap-3 pt-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold">{student.data?.name ?? t('Student')}</Text>
                <StatusBadge status={l.status} />
              </View>
              <Row
                label={t('Date & time')}
                value={formatDate(l.startsAt, 'EEE, d MMM yyyy · HH:mm', locale)}
              />
              <Row label={t('Duration')} value={`${l.durationMin} ${t('min')}`} />
              {price ? (
                <Row
                  label={l.isPackageCovered ? t('Included in package') : t('Lesson price')}
                  value={l.isPackageCovered ? '—' : money(price.amount, price.currency, locale)}
                />
              ) : null}
              {l.paidAmount != null && price ? (
                <Row
                  label={t('Paid {paid} of {total}', {
                    paid: money(l.paidAmount, price.currency, locale),
                    total: money(price.amount, price.currency, locale),
                  })}
                  value=""
                />
              ) : null}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <View className="flex-row flex-wrap gap-2">
            {l.status === 'scheduled' ? (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => patchStatus({ status: 'completed' })}
              >
                <Icon as={CheckCircle2} size={15} />
                <Text>{t('Mark as Completed')}</Text>
              </Button>
            ) : null}
            {l.status !== 'paid' && !l.isPackageCovered ? (
              <Button
                size="sm"
                onPress={() => patchStatus({ status: 'paid', paidAmount: price?.amount })}
              >
                <Icon as={CircleDollarSign} size={15} />
                <Text>{t('Mark as Paid')}</Text>
              </Button>
            ) : null}
            {l.meetingLink ? (
              <Button size="sm" variant="outline" onPress={() => Linking.openURL(l.meetingLink!)}>
                <Icon as={Video} size={15} />
                <Text>{t('Join meeting')}</Text>
              </Button>
            ) : null}
          </View>

          {l.homework ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Homework')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm text-muted-foreground">{l.homework}</Text>
              </CardContent>
            </Card>
          ) : null}

          {l.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm text-muted-foreground">{l.notes}</Text>
              </CardContent>
            </Card>
          ) : null}
        </View>
      </Screen>

      {student.data ? (
        <LessonForm
          open={editOpen}
          onOpenChange={setEditOpen}
          lesson={l}
          students={[student.data]}
          onSaved={refresh}
        />
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete lesson?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This permanently deletes the lesson')} {t('and its income transaction')}.{' '}
              {t('This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={remove}>
              <Text>{t('Delete')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      {value ? <Text className="text-sm font-medium">{value}</Text> : null}
    </View>
  );
}
