import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, type DateData } from 'react-native-calendars';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react-native';
import { Screen } from '~/components/screen';
import { LessonCard } from '~/components/lesson-card';
import { LessonForm } from '~/components/forms/lesson-form';
import { RecurringLessonForm } from '~/components/forms/recurring-lesson-form';
import { EmptyState } from '~/components/empty-state';
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
import { Card, CardContent } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Skeleton } from '~/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useI18n } from '~/lib/i18n';
import { formatDate } from '~/lib/format';
import { useColorScheme } from '~/lib/use-color-scheme';
import type { Lesson, RecurringLesson, Student } from '~/lib/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function LessonsScreen() {
  const { t } = useI18n();
  const [tab, setTab] = React.useState('calendar');

  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [],
  );

  return (
    <View className="flex-1">
      <Screen title={t('Lessons')}>
        <Tabs value={tab} onValueChange={setTab} className="gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="calendar" className="flex-1">
              <Text>{t('Calendar')}</Text>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex-1">
              <Text>{t('Schedules')}</Text>
            </TabsTrigger>
            <TabsTrigger value="archive" className="flex-1">
              <Text>{t('Archived')}</Text>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <CalendarTab students={students.data ?? []} />
          </TabsContent>
          <TabsContent value="schedules">
            <SchedulesTab students={students.data ?? []} />
          </TabsContent>
          <TabsContent value="archive">
            <ArchiveTab students={students.data ?? []} />
          </TabsContent>
        </Tabs>
      </Screen>
    </View>
  );
}

function CalendarTab({ students }: { students: Student[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { colors } = useColorScheme();
  const [month, setMonth] = React.useState(() => new Date());
  const [selected, setSelected] = React.useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [formOpen, setFormOpen] = React.useState(false);

  const from = React.useMemo(() => startOfMonth(month).toISOString(), [month]);
  const to = React.useMemo(() => endOfMonth(month).toISOString(), [month]);

  const lessons = useApiQuery(
    () => api.get<Lesson[]>('lessons', { query: { from, to, orderDir: 'asc', limit: 500 } }),
    [from, to],
  );

  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? t('Student');

  const marked = React.useMemo(() => {
    const m: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    for (const l of lessons.data ?? []) {
      const key = format(new Date(l.startsAt), 'yyyy-MM-dd');
      m[key] = { ...(m[key] ?? {}), marked: true, dotColor: colors.primary };
    }
    m[selected] = { ...(m[selected] ?? {}), selected: true, selectedColor: colors.primary };
    return m;
  }, [lessons.data, selected, colors.primary]);

  const dayLessons = (lessons.data ?? []).filter(
    (l) => format(new Date(l.startsAt), 'yyyy-MM-dd') === selected,
  );

  return (
    <View className="gap-4">
      <Card>
        <CardContent className="p-2">
          <Calendar
            current={format(month, 'yyyy-MM-dd')}
            onMonthChange={(d: DateData) => setMonth(new Date(d.timestamp))}
            onDayPress={(d: DateData) => setSelected(d.dateString)}
            markedDates={marked}
            firstDay={1}
            theme={{
              calendarBackground: 'transparent',
              monthTextColor: colors.foreground,
              dayTextColor: colors.foreground,
              textDisabledColor: colors.mutedForeground,
              textSectionTitleColor: colors.mutedForeground,
              todayTextColor: colors.primary,
              selectedDayTextColor: colors.primaryForeground,
              selectedDayBackgroundColor: colors.primary,
              arrowColor: colors.primary,
            }}
          />
        </CardContent>
      </Card>

      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold">
          {formatDate(selected, 'EEEE, d MMM', locale)}
        </Text>
        <Button size="sm" onPress={() => setFormOpen(true)}>
          <Icon as={Plus} size={15} />
          <Text>{t('Add lesson')}</Text>
        </Button>
      </View>

      {lessons.loading && (lessons.data ?? []).length === 0 ? (
        <Skeleton className="h-16 w-full" />
      ) : dayLessons.length === 0 ? (
        <Card>
          <CardContent className="py-5">
            <Text className="text-center text-sm text-muted-foreground">{t('No lessons on this day.')}</Text>
          </CardContent>
        </Card>
      ) : (
        <View className="gap-2">
          {dayLessons.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              studentName={nameOf(l.studentId)}
              onPress={() => router.push(`/(app)/lessons/${l.id}`)}
            />
          ))}
        </View>
      )}

      <LessonForm
        open={formOpen}
        onOpenChange={setFormOpen}
        students={students}
        defaultDate={new Date(`${selected}T12:00:00`)}
        onSaved={() => lessons.refetch()}
      />
    </View>
  );
}

function SchedulesTab({ students }: { students: Student[] }) {
  const { t } = useI18n();
  const schedules = useApiQuery(() => api.get<RecurringLesson[]>('recurring-lessons'), []);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringLesson | null>(null);
  const [toDelete, setToDelete] = React.useState<RecurringLesson | null>(null);

  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? t('Student');

  const remove = async () => {
    if (!toDelete) return;
    await api.delete(`recurring-lessons/${toDelete.id}`);
    setToDelete(null);
    void schedules.refetch();
  };

  return (
    <View className="gap-3">
      <Text className="text-xs text-muted-foreground">
        {t('Schedules create actual lessons only for the next 2 weeks. Future lessons are generated automatically as they get closer.')}
      </Text>
      <Button
        variant="outline"
        onPress={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        <Icon as={Plus} size={16} />
        <Text>{t('Add schedule')}</Text>
      </Button>

      {schedules.loading && (schedules.data ?? []).length === 0 ? (
        <Skeleton className="h-24 w-full" />
      ) : (schedules.data ?? []).length === 0 ? (
        <EmptyState icon={CalendarDays} title={t('No recurring schedules yet.')} />
      ) : (
        (schedules.data ?? []).map((sch) => (
          <View key={sch.id} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
            <View className="flex-1">
              <Text className="font-medium">{nameOf(sch.studentId)}</Text>
              <Text className="text-xs text-muted-foreground">
                {sch.daysOfWeek
                  .slice()
                  .sort((a, b) => a - b)
                  .map((d) => t(DAY_NAMES[d]!).slice(0, 2))
                  .join(', ')}{' '}
                · {sch.startTime} · {sch.frequency === 'weekly' ? t('Weekly') : t('Biweekly')}
              </Text>
            </View>
            <Button
              size="icon"
              variant="ghost"
              onPress={() => {
                setEditing(sch);
                setFormOpen(true);
              }}
            >
              <Icon as={Pencil} size={18} />
            </Button>
            <Button size="icon" variant="ghost" onPress={() => setToDelete(sch)}>
              <Icon as={Trash2} size={18} className="text-destructive" />
            </Button>
          </View>
        ))
      )}

      <RecurringLessonForm
        open={formOpen}
        onOpenChange={setFormOpen}
        schedule={editing}
        students={students}
        onSaved={() => schedules.refetch()}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Remove')}</AlertDialogTitle>
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
    </View>
  );
}

function ArchiveTab({ students }: { students: Student[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const archived = useApiQuery(
    () => api.get<Lesson[]>('lessons', { query: { showArchived: true, orderDir: 'desc', limit: 500 } }),
    [],
  );
  const [confirmAll, setConfirmAll] = React.useState(false);

  const list = (archived.data ?? []).filter((l) => l.archivedAt);
  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? t('Student');

  const deleteAll = async () => {
    await api.delete('lessons/archive');
    setConfirmAll(false);
    void archived.refetch();
  };

  if (archived.loading && list.length === 0) return <Skeleton className="h-24 w-full" />;
  if (list.length === 0) return <EmptyState title={t('No archived lessons')} />;

  return (
    <View className="gap-3">
      <Button variant="outline" onPress={() => setConfirmAll(true)}>
        <Icon as={Trash2} size={16} className="text-destructive" />
        <Text className="text-destructive">{t('Delete all')}</Text>
      </Button>
      {list.map((l) => (
        <LessonCard
          key={l.id}
          lesson={l}
          studentName={nameOf(l.studentId)}
          showDate
          onPress={() => router.push(`/(app)/lessons/${l.id}`)}
        />
      ))}

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete all archived?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This permanently deletes all {count} archived lessons. This action cannot be undone.', {
                count: list.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onPress={deleteAll}>
              <Text>{t('Delete all')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
