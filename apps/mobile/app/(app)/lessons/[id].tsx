import * as React from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lightbulb, MoreHorizontal, NotebookPen, Video } from 'lucide-react-native';
import { Screen } from '~/components/common/screen';
import { StatusBadge } from '~/components/lessons/status-badge';
import { LessonStatusNote } from '~/components/lessons/lesson-status-note';
import { PrimaryActionButton, useLessonActions } from '~/components/lessons/lesson-actions';
import { ErrorState } from '~/components/common/error-state';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useOpenAssistant } from '~/lib/ai/use-open-assistant';
import { useApiQuery } from '~/lib/use-query';
import { useI18n } from '~/lib/i18n';
import { formatDate } from '~/lib/format';
import type { Lesson, Student } from '~/lib/types';

export default function LessonDetailScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const lesson = useApiQuery(() => api.get<Lesson>(`lessons/${id}`), [id]);
  const studentId = lesson.data?.studentId;
  const student = useApiQuery(
    () => (studentId ? api.get<Student>(`students/${studentId}`) : Promise.resolve(null)),
    [studentId],
  );

  if (lesson.loading && !lesson.data) {
    return (
      <Screen onBack={() => router.back()} title="">
        <Skeleton className="h-40 w-full" />
      </Screen>
    );
  }
  if (!lesson.data) {
    return (
      <Screen onBack={() => router.back()} title={t('Lesson')}>
        <ErrorState message={lesson.error} onRetry={lesson.refetch} retrying={lesson.loading} />
      </Screen>
    );
  }

  return (
    <LessonDetail
      lesson={lesson.data}
      studentName={student.data?.name ?? ''}
      onChanged={(updated) => (updated ? lesson.setData(updated) : void lesson.refetch())}
      onDeleted={() => router.back()}
      onBack={() => router.back()}
    />
  );
}

function LessonDetail({
  lesson: l,
  studentName,
  onChanged,
  onDeleted,
  onBack,
}: {
  lesson: Lesson;
  studentName: string;
  onChanged: (updated?: Lesson) => void;
  onDeleted: () => void;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const actions = useLessonActions({
    lesson: l,
    title: studentName,
    showDetails: false,
    onChanged,
    onDeleted,
  });
  const assistant = useOpenAssistant();
  const askAssistant = (key: string) =>
    void assistant.run({
      studentId: l.studentId,
      studentName,
      prompt: t(key, { when: formatDate(l.startsAt, 'EEEE d MMMM, HH:mm', locale) }),
    });

  return (
    <>
      <Screen
        onBack={onBack}
        title={t('Lesson with {name}', { name: studentName })}
        right={
          <Button size="icon" variant="ghost" onPress={actions.openMenu}>
            <Icon as={MoreHorizontal} size={18} />
          </Button>
        }
      >
        <View className="gap-4">
          <Card>
            <CardContent className="gap-3 pt-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold">{studentName || t('Student')}</Text>
                <StatusBadge lesson={l} />
              </View>
              <LessonStatusNote lesson={l} className="text-sm" />
              <Row
                label={t('Date & time')}
                value={formatDate(l.startsAt, 'EEE, d MMM yyyy · HH:mm', locale)}
              />
              <Row label={t('Duration')} value={`${l.durationMin} ${t('min')}`} />
            </CardContent>
          </Card>

          {actions.primary || l.meetingLink ? (
            <View className="flex-row gap-2">
              {actions.primary ? (
                <PrimaryActionButton
                  lesson={l}
                  action={actions.primary}
                  busy={actions.busy}
                  onPress={actions.runPrimary}
                  className="flex-1"
                />
              ) : null}
              {l.meetingLink ? (
                <Button
                  variant="outline"
                  className={actions.primary ? undefined : 'flex-1'}
                  onPress={() => void Linking.openURL(l.meetingLink!)}
                >
                  <Icon as={Video} size={16} />
                  <Text>{t('Join meeting')}</Text>
                </Button>
              ) : null}
            </View>
          ) : null}

          <View className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={assistant.pending}
              onPress={() => askAssistant('Prepare a lesson plan for the lesson on {when}.')}
            >
              <Icon as={NotebookPen} size={16} className="text-primary" />
              <Text>{t('Lesson plan')}</Text>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={assistant.pending}
              onPress={() => askAssistant('Suggest homework ideas for the lesson on {when}.')}
            >
              <Icon as={Lightbulb} size={16} className="text-primary" />
              <Text>{t('Homework ideas')}</Text>
            </Button>
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
      {actions.elements}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium">{value}</Text>
    </View>
  );
}
