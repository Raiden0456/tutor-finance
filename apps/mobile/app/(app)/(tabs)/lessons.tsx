import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  Archive,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react-native';
import { Screen } from '~/components/common/screen';
import { WeekStrip } from '~/components/lessons/week-strip';
import { LessonCard } from '~/components/lessons/lesson-card';
import { LessonForm } from '~/components/forms/lesson-form';
import { RecurringLessonForm } from '~/components/forms/recurring-lesson-form';
import { EmptyState } from '~/components/common/empty-state';
import { Fab } from '~/components/common/fab';
import { Segmented } from '~/components/common/segmented';
import { TabFade } from '~/components/common/tab-fade';
import { StaggerItem } from '~/components/common/stagger';
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
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { capitalizeFirst, getDateFnsLocale, useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import { formatDate } from '~/lib/format';
import { useColorScheme } from '~/lib/use-color-scheme';
import { cn } from '~/lib/utils';
import type { Lesson, RecurringLesson, Student } from '~/lib/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function LessonsScreen() {
  const { t } = useI18n();
  const [tab, setTab] = React.useState<'calendar' | 'schedules'>('calendar');
  const [logOpen, setLogOpen] = React.useState(false);

  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [],
  );

  return (
    <View className="flex-1">
      <Screen title={t('Lessons')}>
        <View className="gap-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'calendar', label: t('Calendar') },
              { value: 'schedules', label: t('Schedules') },
            ]}
          />
          <TabFade tabKey={tab}>
            {tab === 'calendar' ? (
              <CalendarTab
                students={students.data ?? []}
                formOpen={logOpen}
                onFormOpenChange={setLogOpen}
              />
            ) : (
              <SchedulesTab students={students.data ?? []} />
            )}
          </TabFade>
        </View>
      </Screen>

      {tab === 'calendar' && (students.data ?? []).length > 0 ? (
        <Fab onPress={() => setLogOpen(true)} />
      ) : null}
    </View>
  );
}

function CalendarTab({
  students,
  formOpen,
  onFormOpenChange,
}: {
  students: Student[];
  formOpen: boolean;
  onFormOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { colors, colorScheme } = useColorScheme();
  const { weekStartsOn } = useSettings();

  const [selected, setSelected] = React.useState(() => startOfDay(new Date()));
  const [rangeEnd, setRangeEnd] = React.useState<Date | null>(null);
  const [rangeMode, setRangeMode] = React.useState(false);
  const [monthExpanded, setMonthExpanded] = React.useState(false);
  const [showArchive, setShowArchive] = React.useState(false);

  // Fetch a ±1 month window so the strip + month grid have their dots.
  const from = React.useMemo(() => startOfMonth(addMonths(selected, -1)).toISOString(), [selected]);
  const to = React.useMemo(() => endOfMonth(addMonths(selected, 1)).toISOString(), [selected]);
  const lessons = useApiQuery(
    () => api.get<Lesson[]>('lessons', { query: { from, to, orderDir: 'asc', limit: 500 } }),
    [from, to],
  );

  const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? t('Student');
  const daysWithLessons = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of lessons.data ?? []) set.add(format(new Date(l.startsAt), 'yyyy-MM-dd'));
    return set;
  }, [lessons.data]);

  const end = rangeEnd ?? selected;
  const dayLessons = (lessons.data ?? []).filter((l) => {
    const d = startOfDay(new Date(l.startsAt)).getTime();
    return d >= selected.getTime() && d <= end.getTime();
  });

  const weekStart = startOfWeek(selected, { weekStartsOn });

  const selectDay = (day: Date) => {
    const d = startOfDay(day);
    if (!rangeMode) {
      setSelected(d);
      setRangeEnd(null);
      return;
    }
    if (!rangeEnd) {
      if (isSameDay(d, selected)) return;
      if (d.getTime() < selected.getTime()) {
        setRangeEnd(selected);
        setSelected(d);
      } else {
        setRangeEnd(d);
      }
    } else {
      setSelected(d);
      setRangeEnd(null);
    }
  };

  const marked = React.useMemo(() => {
    const m: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    for (const key of daysWithLessons) m[key] = { marked: true, dotColor: colors.primary };
    const selKey = format(selected, 'yyyy-MM-dd');
    m[selKey] = { ...(m[selKey] ?? {}), selected: true, selectedColor: colors.primary };
    if (rangeEnd) {
      const endKey = format(rangeEnd, 'yyyy-MM-dd');
      m[endKey] = { ...(m[endKey] ?? {}), selected: true, selectedColor: colors.primary };
    }
    return m;
  }, [daysWithLessons, selected, rangeEnd, colors.primary]);

  const detailLabel = rangeEnd
    ? `${formatDate(selected, 'd MMM', locale)} – ${formatDate(rangeEnd, 'd MMM', locale)}`
    : isSameDay(selected, new Date())
      ? t('Today')
      : formatDate(selected, 'EEEE, d MMMM', locale);

  return (
    <View className="gap-3">
      {/* Header */}
      <View className="flex-row items-center justify-between gap-2">
        <Pressable
          onPress={() => setMonthExpanded((v) => !v)}
          className="flex-row items-center gap-1.5 active:opacity-70"
        >
          <Text className="text-base font-semibold">
            {capitalizeFirst(format(selected, 'LLLL yyyy', { locale: getDateFnsLocale(locale) }))}
          </Text>
          <Icon
            as={ChevronDown}
            size={16}
            className={cn('text-muted-foreground', monthExpanded && 'rotate-180')}
          />
        </Pressable>
        <View className="flex-row items-center gap-1.5">
          <HeaderToggle
            active={rangeMode}
            icon={CalendarRange}
            onPress={() => {
              setRangeMode((v) => !v);
              setRangeEnd(null);
            }}
          />
          <HeaderToggle active={showArchive} icon={Archive} onPress={() => setShowArchive((v) => !v)} />
        </View>
      </View>

      {/* Week strip (default) */}
      <WeekStrip
        weekStart={weekStart}
        selected={selected}
        rangeEnd={rangeEnd}
        daysWithLessons={daysWithLessons}
        onSelect={selectDay}
        onSwipe={(dir) =>
          setSelected((d) => startOfDay(new Date(d.getTime() + (dir === 'next' ? 7 : -7) * 86400000)))
        }
      />

      {/* Expandable month grid */}
      {monthExpanded ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)}>
          <Card>
            <CardContent className="p-2">
              <Calendar
                key={colorScheme}
                current={format(selected, 'yyyy-MM-dd')}
                onDayPress={(d: DateData) => {
                  selectDay(new Date(d.timestamp));
                  if (!rangeMode) setMonthExpanded(false);
                }}
                markedDates={marked}
                firstDay={weekStartsOn}
                theme={{
                  calendarBackground: 'transparent',
                  monthTextColor: colors.foreground,
                  arrowColor: colors.primary,
                  textSectionTitleColor: colors.mutedForeground,
                  dayTextColor: colors.foreground,
                  textDisabledColor: colors.mutedForeground,
                  todayTextColor: colors.primary,
                  selectedDayTextColor: colors.primaryForeground,
                  selectedDayBackgroundColor: colors.primary,
                  dotColor: colors.primary,
                  selectedDotColor: colors.primaryForeground,
                }}
              />
            </CardContent>
          </Card>
        </Animated.View>
      ) : null}

      {/* Detail / archive */}
      {showArchive ? (
        <ArchiveView nameOf={nameOf} />
      ) : (
        <View className="mt-1 gap-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold">{detailLabel}</Text>
            {dayLessons.length > 0 ? (
              <View className="rounded-full bg-muted px-2 py-0.5">
                <Text className="text-[11px] text-muted-foreground">{dayLessons.length}</Text>
              </View>
            ) : null}
          </View>

          {lessons.loading && (lessons.data ?? []).length === 0 ? (
            <Skeleton className="h-20 w-full" />
          ) : dayLessons.length === 0 ? (
            <View className="items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10">
              <Text className="text-center text-sm text-muted-foreground">
                {students.length === 0
                  ? t('Add a student first to log lessons.')
                  : rangeEnd
                    ? t('No lessons in this range.')
                    : t('No lessons on this day.')}
              </Text>
              {students.length > 0 ? (
                <Button variant="outline" size="sm" onPress={() => onFormOpenChange(true)}>
                  <Icon as={Plus} size={15} />
                  <Text>{t('Add lesson')}</Text>
                </Button>
              ) : null}
            </View>
          ) : (
            <View className="gap-2">
              {dayLessons.map((l, i) => (
                <StaggerItem key={l.id} index={i}>
                  <LessonCard lesson={l} studentName={nameOf(l.studentId)} onChanged={() => lessons.refetch()} />
                </StaggerItem>
              ))}
            </View>
          )}
        </View>
      )}

      <LessonForm
        open={formOpen}
        onOpenChange={onFormOpenChange}
        students={students}
        defaultDate={selected}
        onSaved={() => lessons.refetch()}
      />
    </View>
  );
}

function HeaderToggle({
  active,
  icon,
  onPress,
}: {
  active: boolean;
  icon: React.ComponentProps<typeof Icon>['as'];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-9 w-9 items-center justify-center rounded-xl active:opacity-80',
        active ? 'bg-primary' : 'bg-transparent',
      )}
    >
      <Icon as={icon} size={16} className={active ? 'text-primary-foreground' : 'text-muted-foreground'} />
    </Pressable>
  );
}

function ArchiveView({ nameOf }: { nameOf: (id: string) => string }) {
  const { t } = useI18n();
  const archived = useApiQuery(
    () => api.get<Lesson[]>('lessons', { query: { showArchived: true, orderDir: 'desc', limit: 500 } }),
    [],
  );
  const [confirmAll, setConfirmAll] = React.useState(false);
  const list = (archived.data ?? []).filter((l) => l.archivedAt);

  const deleteAll = async () => {
    await api.delete('lessons/archive');
    setConfirmAll(false);
    void archived.refetch();
  };

  return (
    <View className="mt-1 gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold">{t('Archived')}</Text>
        {list.length > 0 ? (
          <Pressable onPress={() => setConfirmAll(true)} className="flex-row items-center gap-1.5 active:opacity-70">
            <Icon as={Trash2} size={14} className="text-destructive" />
            <Text className="text-xs text-destructive">{t('Delete all')}</Text>
          </Pressable>
        ) : null}
      </View>

      {archived.loading && list.length === 0 ? (
        <Skeleton className="h-20 w-full" />
      ) : list.length === 0 ? (
        <EmptyState title={t('No archived lessons')} />
      ) : (
        <View className="gap-2">
          {list.map((l, i) => (
            <StaggerItem key={l.id} index={i}>
              <LessonCard
                lesson={l}
                studentName={nameOf(l.studentId)}
                showDate
                isArchived
                onChanged={() => archived.refetch()}
              />
            </StaggerItem>
          ))}
        </View>
      )}

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
