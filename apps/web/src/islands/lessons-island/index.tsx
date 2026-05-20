import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  endOfMonth,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { api } from '@/lib/api';
import { I18nProvider, useI18n, type Locale } from '@/lib/i18n';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import type { WeekStartsOn } from '@tutor-finance/shared';
import type { Lesson, RecurringLesson, StudentRef } from '@/lib/types';
import { dayKey, monthKey, weekStartOptions } from './shared';
import { CalendarHeader } from './calendar/header';
import { WeekStrip } from './calendar/week-strip';
import { MonthGrid } from './calendar/month-grid';
import { DayDetail } from './day-detail';
import { ArchiveView } from './archive-view';
import { CreateLessonModal } from './create-modal';
import { SchedulesView } from './schedules/list';
import { TabSwitcher } from '../transactions-island/tab-switcher';

interface Props {
  initial: Lesson[];
  students: StudentRef[];
  initialMonthStr: string;
  weekStartsOn: WeekStartsOn;
  locale?: Locale;
  initialSchedules: RecurringLesson[];
}

export function LessonsIsland({ locale = 'en', ...props }: Props) {
  return (
    <I18nProvider locale={locale}>
      <LessonsContent {...props} />
    </I18nProvider>
  );
}

function LessonsContent({
  initial,
  students,
  initialMonthStr,
  weekStartsOn,
  initialSchedules,
}: Omit<Props, 'locale'>) {
  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const weekStart = useMemo(() => weekStartOptions(weekStartsOn), [weekStartsOn]);

  const [activeTab, setActiveTab] = useState<'calendar' | 'schedules'>('calendar');
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>('single');
  const [rangeStart, setRangeStart] = useState(todayDate);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [weekViewStart, setWeekViewStart] = useState(() => startOfWeek(todayDate, weekStart));
  const [monthExpanded, setMonthExpanded] = useState(false);
  const [monthLessons, setMonthLessons] = useState<Lesson[]>(initial);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedLessons, setArchivedLessons] = useState<Lesson[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const loadedMonthsRef = useRef(new Set([initialMonthStr]));

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const daysWithLessons = useMemo(
    () => new Set(monthLessons.map((l) => dayKey(new Date(l.startsAt)))),
    [monthLessons],
  );

  const effectiveEnd = selectionMode === 'range' && rangeEnd ? rangeEnd : rangeStart;

  const selectedLessons = useMemo(
    () =>
      monthLessons
        .filter((l) => {
          const d = startOfDay(new Date(l.startsAt));
          return d >= rangeStart && d <= effectiveEnd;
        })
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [monthLessons, rangeStart, effectiveEnd],
  );

  const loadMonth = useCallback(async (date: Date, force = false) => {
    const mk = monthKey(date);
    if (!force && loadedMonthsRef.current.has(mk)) return;
    loadedMonthsRef.current.add(mk);
    setLoadingMonth(true);
    try {
      const from = startOfMonth(date).toISOString();
      const to = endOfMonth(date).toISOString();
      const data = await api.get<Lesson[]>('/lessons', {
        query: { from, to, limit: 500, orderDir: 'asc' },
      });
      setMonthLessons((prev) => [
        ...prev.filter((l) => !isSameMonth(new Date(l.startsAt), date)),
        ...data,
      ]);
    } catch {
      loadedMonthsRef.current.delete(mk);
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  const reloadRange = useCallback(async () => {
    loadedMonthsRef.current.delete(monthKey(rangeStart));
    await loadMonth(rangeStart, true);
    if (rangeEnd && !isSameMonth(rangeEnd, rangeStart)) {
      loadedMonthsRef.current.delete(monthKey(rangeEnd));
      await loadMonth(rangeEnd, true);
    }
  }, [rangeStart, rangeEnd, loadMonth]);

  const loadArchive = useCallback(async () => {
    setLoadingArchive(true);
    try {
      const data = await api.get<Lesson[]>('/lessons', {
        query: { showArchived: 'true', limit: '500' },
      });
      setArchivedLessons(data);
    } finally {
      setLoadingArchive(false);
    }
  }, []);

  function toggleArchive() {
    const next = !showArchive;
    setShowArchive(next);
    if (next) loadArchive();
  }

  const rsMonthKey = monthKey(rangeStart);
  useEffect(() => {
    loadMonth(rangeStart);
  }, [rsMonthKey]);

  const reMonthKey = rangeEnd ? monthKey(rangeEnd) : null;
  useEffect(() => {
    if (rangeEnd) loadMonth(rangeEnd);
  }, [reMonthKey]);

  // Keep week strip in sync when rangeStart week changes
  const rsWeekKey = dayKey(startOfWeek(rangeStart, weekStart));
  useEffect(() => {
    setWeekViewStart(startOfWeek(rangeStart, weekStart));
  }, [rsWeekKey]);

  function handleDaySelect(day: Date) {
    const d = startOfDay(day);
    if (selectionMode === 'single') {
      setRangeStart(d);
      setRangeEnd(null);
      return;
    }
    if (!rangeEnd) {
      if (isSameDay(d, rangeStart)) return; // tap same = no-op
      if (d < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(d);
      } else {
        setRangeEnd(d);
      }
    } else {
      // range complete → start fresh
      setRangeStart(d);
      setRangeEnd(null);
    }
  }

  function handleWeekNav(dir: 'prev' | 'next') {
    const next = dir === 'next' ? addDays(weekViewStart, 7) : subDays(weekViewStart, 7);
    setWeekViewStart(next);
    loadMonth(next);
  }

  function toggleMode() {
    if (selectionMode === 'range') {
      setSelectionMode('single');
      setRangeEnd(null);
    } else {
      setSelectionMode('range');
    }
  }

  function openCreate() {
    setCreateOpen(true);
  }

  const handleModalCreated = useCallback(
    async (affectedDates: Date[]) => {
      const distinctMonths = [...new Set(affectedDates.map((d) => monthKey(d)))];
      for (const mk of distinctMonths) loadedMonthsRef.current.delete(mk);
      const uniqueDates = affectedDates.filter(
        (d, i, arr) => arr.findIndex((x) => monthKey(x) === monthKey(d)) === i,
      );
      await Promise.all(uniqueDates.map((d) => loadMonth(d, true)));
    },
    [loadMonth],
  );

  const { t } = useI18n();

  return (
    <div className="page-enter flex flex-col">
      <TabSwitcher
        value={activeTab}
        onChange={setActiveTab}
        groupId="lessons-main"
        tabs={[
          { key: 'calendar', label: t('Calendar') },
          { key: 'schedules', label: t('Schedules') },
        ]}
      />

      <FadeSwap motionKey={activeTab}>
        {activeTab === 'schedules' ? (
          <SchedulesView
            initialSchedules={initialSchedules}
            students={students}
            studentMap={studentMap}
            weekStartsOn={weekStartsOn}
          />
        ) : (
          <>
            <div className="sticky top-14 z-20 -mx-4 bg-background px-4 pb-3">
              <CalendarHeader
                rangeStart={rangeStart}
                selectionMode={selectionMode}
                monthExpanded={monthExpanded}
                loading={loadingMonth}
                showArchive={showArchive}
                onToggleMonth={() => setMonthExpanded((x) => !x)}
                onToggleMode={toggleMode}
                onToggleArchive={toggleArchive}
                onLog={openCreate}
                disabledLog={students.length === 0}
              />
              <WeekStrip
                weekViewStart={weekViewStart}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                selectionMode={selectionMode}
                daysWithLessons={daysWithLessons}
                monthExpanded={monthExpanded}
                onSelect={handleDaySelect}
                onToggleMonth={() => setMonthExpanded((x) => !x)}
                onWeekNav={handleWeekNav}
              />
              <Collapse open={monthExpanded}>
                <MonthGrid
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  selectionMode={selectionMode}
                  daysWithLessons={daysWithLessons}
                  onSelect={(day) => {
                    handleDaySelect(day);
                    if (selectionMode === 'single') setMonthExpanded(false);
                  }}
                  onMonthChange={(date) => loadMonth(date)}
                  weekStartsOn={weekStartsOn}
                />
              </Collapse>
            </div>

            <FadeSwap motionKey={showArchive ? 'archive' : 'day'}>
              {showArchive ? (
                <ArchiveView
                  lessons={archivedLessons}
                  studentMap={studentMap}
                  loading={loadingArchive}
                  onRefresh={loadArchive}
                />
              ) : (
                <DayDetail
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  selectionMode={selectionMode}
                  lessons={selectedLessons}
                  studentMap={studentMap}
                  loading={loadingMonth}
                  onLessonChanged={reloadRange}
                  onLog={openCreate}
                  hasStudents={students.length > 0}
                />
              )}
            </FadeSwap>

            <CreateLessonModal
              open={createOpen}
              onOpenChange={setCreateOpen}
              students={students}
              studentMap={studentMap}
              daysWithLessons={daysWithLessons}
              monthLessons={monthLessons}
              initialDate={rangeStart}
              loadMonth={loadMonth}
              onCreated={handleModalCreated}
              weekStartsOn={weekStartsOn}
            />
          </>
        )}
      </FadeSwap>
    </div>
  );
}
