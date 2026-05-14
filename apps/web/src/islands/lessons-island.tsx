import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Archive,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lesson, StudentRef } from '@/lib/types';
import { cn, statusLabel } from '@/lib/utils';
import { LessonCard } from '@/components/lesson-card';

// ─── types ───────────────────────────────────────────────────────────────────

interface Props {
  initial: Lesson[];
  students: StudentRef[];
  initialMonthStr: string;
}

type SelectionMode = 'single' | 'range';

interface SlotDraft {
  id: string;
  studentId: string;
  date: Date;
  time: string;
  durationMin: number;
  status: 'scheduled' | 'due' | 'paid';
}

const CREATE_STATUSES = ['scheduled', 'due', 'paid'] as const;
const WEEK_START = { weekStartsOn: 1 } as const;

// ─── helpers ─────────────────────────────────────────────────────────────────

function dayKey(d: Date | string): string {
  return format(typeof d === 'string' ? new Date(d) : d, 'yyyy-MM-dd');
}

function monthKey(d: Date): string {
  return format(d, 'yyyy-MM');
}

function findOverlaps(lessons: Lesson[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < lessons.length; i++) {
    const aStart = new Date(lessons[i].startsAt).getTime();
    const aEnd = aStart + lessons[i].durationMin * 60000;
    for (let j = i + 1; j < lessons.length; j++) {
      const bStart = new Date(lessons[j].startsAt).getTime();
      const bEnd = bStart + lessons[j].durationMin * 60000;
      if (aStart < bEnd && bStart < aEnd) {
        ids.add(lessons[i].id);
        ids.add(lessons[j].id);
      }
    }
  }
  return ids;
}

// ─── Main island ─────────────────────────────────────────────────────────────

export function LessonsIsland({ initial, students, initialMonthStr }: Props) {
  const todayDate = useMemo(() => startOfDay(new Date()), []);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single');
  const [rangeStart, setRangeStart] = useState(todayDate);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [weekViewStart, setWeekViewStart] = useState(() => startOfWeek(todayDate, WEEK_START));
  const [monthExpanded, setMonthExpanded] = useState(false);
  const [monthLessons, setMonthLessons] = useState<Lesson[]>(initial);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date>(todayDate);
  const [createTime, setCreateTime] = useState('10:00');
  const [createDurationMin, setCreateDurationMin] = useState(60);
  const [createViewMonth, setCreateViewMonth] = useState(() => startOfMonth(todayDate));
  const [createStudentId, setCreateStudentId] = useState(students[0]?.id ?? '');
  const [batchMode, setBatchMode] = useState(false);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState<{ done: number; total: number } | null>(null);
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
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

  const createDayLessons = useMemo(() => {
    if (!createOpen) return [];
    const key = dayKey(createDate);
    return monthLessons
      .filter((l) => dayKey(new Date(l.startsAt)) === key)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [createOpen, createDate, monthLessons]);

  const focusedSlot = useMemo(
    () => slots.find((s) => s.id === focusedSlotId) ?? null,
    [slots, focusedSlotId],
  );

  const slotOverlapIds = useMemo(() => {
    if (!batchMode) return new Set<string>();
    const synthetic = slots.map((s) => {
      const [h, m] = s.time.split(':').map(Number);
      const d = new Date(s.date);
      d.setHours(h, m, 0, 0);
      return { id: s.id, startsAt: d.toISOString(), durationMin: s.durationMin } as Lesson;
    });
    return findOverlaps([...monthLessons, ...synthetic]);
  }, [batchMode, slots, monthLessons]);

  const createOverlapLesson = useMemo(() => {
    if (!createTime) return null;
    const [h, m] = createTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const start = new Date(createDate);
    start.setHours(h, m, 0, 0);
    const startMs = start.getTime();
    const endMs = startMs + createDurationMin * 60000;
    return (
      monthLessons.find((lesson) => {
        const lStart = new Date(lesson.startsAt).getTime();
        const lEnd = lStart + lesson.durationMin * 60000;
        return startMs < lEnd && lStart < endMs;
      }) ?? null
    );
  }, [createDate, createTime, createDurationMin, monthLessons]);

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
      const data = await api.get<Lesson[]>('/lessons', { query: { showArchived: 'true', limit: '500' } });
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
  const rsWeekKey = dayKey(startOfWeek(rangeStart, WEEK_START));
  useEffect(() => {
    setWeekViewStart(startOfWeek(rangeStart, WEEK_START));
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
    setCreateDate(rangeStart);
    setCreateViewMonth(startOfMonth(rangeStart));
    setCreateTime('10:00');
    setCreateDurationMin(60);
    setCreateStudentId(students[0]?.id ?? '');
    setBatchMode(false);
    setSlots([]);
    setFocusedSlotId(null);
    setCreateProgress(null);
    setCreateErrors([]);
    setCreateSubmitting(false);
    setCreateOpen(true);
  }

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const [h, m] = createTime.split(':').map(Number);
    const startsAt = new Date(createDate);
    startsAt.setHours(h, m, 0, 0);
    await api.post('/lessons', {
      studentId: createStudentId,
      startsAt: startsAt.toISOString(),
      durationMin: createDurationMin,
      status: String(data.get('status') ?? 'scheduled'),
      notes: String(data.get('notes') ?? '').trim() || undefined,
    });
    setCreateOpen(false);
    await reloadRange();
  }

  function handleAddSlot() {
    const prev = slots.at(-1);
    const newSlot: SlotDraft = {
      id: crypto.randomUUID(),
      studentId: batchMode ? (prev?.studentId ?? students[0]?.id ?? '') : createStudentId,
      date: createDate,
      time: batchMode ? (prev?.time ?? createTime) : createTime,
      durationMin: batchMode ? (prev?.durationMin ?? createDurationMin) : createDurationMin,
      status: 'scheduled',
    };
    if (!batchMode) {
      const firstSlot: SlotDraft = {
        id: crypto.randomUUID(),
        studentId: createStudentId,
        date: createDate,
        time: createTime,
        durationMin: createDurationMin,
        status: 'scheduled',
      };
      setBatchMode(true);
      setSlots([firstSlot, newSlot]);
      setFocusedSlotId(newSlot.id);
    } else {
      setSlots((s) => [...s, newSlot]);
      setFocusedSlotId(newSlot.id);
    }
  }

  async function onBatchCreate() {
    setCreateSubmitting(true);
    setCreateErrors([]);
    setCreateProgress({ done: 0, total: slots.length });
    const errs: string[] = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const [h, m] = s.time.split(':').map(Number);
      const startsAt = new Date(s.date);
      startsAt.setHours(h, m, 0, 0);
      try {
        await api.post('/lessons', {
          studentId: s.studentId,
          startsAt: startsAt.toISOString(),
          durationMin: s.durationMin,
          status: s.status,
        });
      } catch {
        errs.push(`Slot ${i + 1} (${format(s.date, 'd MMM')} ${s.time}) failed`);
      }
      setCreateProgress({ done: i + 1, total: slots.length });
    }
    setCreateSubmitting(false);
    setCreateErrors(errs);
    const distinctStarts = [...new Set(slots.map((s) => monthKey(s.date)))].map(
      (mk) => startOfMonth(new Date(mk + '-01')),
    );
    for (const d of distinctStarts) loadedMonthsRef.current.delete(monthKey(d));
    await Promise.all(distinctStarts.map((d) => loadMonth(d, true)));
    if (errs.length === 0) setCreateOpen(false);
  }

  return (
    <div className="page-enter flex flex-col">
      <div className="sticky top-14 z-20 -mx-4 bg-background px-4 pb-3">
        <CalendarHeader
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
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

      <ResponsiveModal open={createOpen} onOpenChange={setCreateOpen}>
        <ResponsiveModalContent className="max-w-md">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {batchMode ? `Log ${slots.length} lessons` : 'New lesson'}
            </ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!batchMode) onCreate(e.currentTarget);
            }}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <ResponsiveModalBody className="flex flex-col gap-4">
              {/* ─── Mode panels ─── */}
              <AnimatePresence initial={false} mode="wait">
                {!batchMode ? (
                  <motion.div
                    key="single"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Student</Label>
                        <Select
                          name="studentId"
                          value={createStudentId}
                          onValueChange={setCreateStudentId}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {students.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <Select name="status" defaultValue="scheduled">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CREATE_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Date</Label>
                      <CreateCalendar
                        selectedDate={createDate}
                        viewMonth={createViewMonth}
                        daysWithLessons={daysWithLessons}
                        onSelect={(d) => { setCreateDate(d); loadMonth(d); }}
                        onMonthChange={(d) => { setCreateViewMonth(d); loadMonth(d); }}
                      />
                      <FadeSwap motionKey={dayKey(createDate)} duration={0.18}>
                        {createDayLessons.length > 0
                          ? <DaySchedulePreview lessons={createDayLessons} studentMap={studentMap} />
                          : null}
                      </FadeSwap>
                    </div>
                    <div className="grid gap-3 grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="createTime">Time</Label>
                        <Input
                          id="createTime"
                          type="time"
                          value={createTime}
                          onChange={(e) => setCreateTime(e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="createDurationMin">Duration (min)</Label>
                        <Input
                          id="createDurationMin"
                          type="number"
                          min="1"
                          value={createDurationMin}
                          onChange={(e) => setCreateDurationMin(Number(e.target.value))}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Input id="notes" name="notes" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="batch"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-3"
                  >
                    <CreateCalendar
                      selectedDate={focusedSlot?.date ?? createDate}
                      viewMonth={createViewMonth}
                      daysWithLessons={daysWithLessons}
                      onSelect={(d) => {
                        setCreateDate(d);
                        loadMonth(d);
                        if (focusedSlotId) {
                          setSlots((prev) =>
                            prev.map((s) => s.id === focusedSlotId ? { ...s, date: d } : s),
                          );
                        }
                      }}
                      onMonthChange={(d) => { setCreateViewMonth(d); loadMonth(d); }}
                    />
                    <FadeSwap motionKey={dayKey(focusedSlot?.date ?? createDate)} duration={0.18}>
                      {createDayLessons.length > 0
                        ? <DaySchedulePreview lessons={createDayLessons} studentMap={studentMap} />
                        : null}
                    </FadeSwap>
                    <div className="flex flex-col gap-2">
                      {slots.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          students={students}
                          isFocused={focusedSlotId === slot.id}
                          hasOverlap={slotOverlapIds.has(slot.id)}
                          canDelete={slots.length > 1}
                          onFocus={() => {
                            setFocusedSlotId(slot.id);
                            setCreateDate(slot.date);
                            setCreateViewMonth(startOfMonth(slot.date));
                          }}
                          onChange={(patch) =>
                            setSlots((prev) =>
                              prev.map((s) => s.id === slot.id ? { ...s, ...patch } : s),
                            )
                          }
                          onDelete={() => {
                            const next = slots.filter((s) => s.id !== slot.id);
                            if (next.length <= 1) {
                              const remaining = next[0];
                              if (remaining) {
                                setCreateStudentId(remaining.studentId);
                                setCreateDate(remaining.date);
                                setCreateTime(remaining.time);
                                setCreateDurationMin(remaining.durationMin);
                                setCreateViewMonth(startOfMonth(remaining.date));
                              }
                              setBatchMode(false);
                              setSlots([]);
                              setFocusedSlotId(null);
                              return;
                            }
                            const idx = slots.findIndex((s) => s.id === slot.id);
                            const nextFocus = next[Math.min(idx, next.length - 1)];
                            setFocusedSlotId(nextFocus.id);
                            setSlots(next);
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ─── Add slot button ─── */}
              <button
                type="button"
                onClick={handleAddSlot}
                className="flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-70 active:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add slot
              </button>
            </ResponsiveModalBody>

            <ResponsiveModalFooter className="flex-col items-stretch gap-2">
              {/* Overlap warning — single mode */}
              <AnimatePresence>
                {createOverlapLesson && !batchMode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Overlaps with{' '}
                        <span className="font-medium">
                          {studentMap.get(createOverlapLesson.studentId) ?? 'another lesson'}
                        </span>
                        {' '}at {format(new Date(createOverlapLesson.startsAt), 'HH:mm')}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Batch progress */}
              <AnimatePresence>
                {createProgress && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating {createProgress.done} of {createProgress.total}…
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Batch errors */}
              <AnimatePresence>
                {createErrors.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-0.5 rounded-lg bg-destructive/10 px-3 py-2.5">
                      {createErrors.map((e, i) => (
                        <p key={i} className="text-xs text-destructive">{e}</p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                type={batchMode ? 'button' : 'submit'}
                onClick={batchMode ? onBatchCreate : undefined}
                disabled={createSubmitting || (batchMode && slots.some((s) => !s.studentId))}
                className="w-full sm:w-auto"
              >
                {createSubmitting
                  ? `Creating ${createProgress?.done ?? 0}/${createProgress?.total ?? 0}…`
                  : batchMode
                    ? `Create ${slots.length} lesson${slots.length !== 1 ? 's' : ''}`
                    : 'Create'}
              </Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
}

// ─── Calendar header ──────────────────────────────────────────────────────────

function CalendarHeader({
  rangeStart,
  rangeEnd,
  selectionMode,
  monthExpanded,
  loading,
  showArchive,
  onToggleMonth,
  onToggleMode,
  onToggleArchive,
  onLog,
  disabledLog,
}: {
  rangeStart: Date;
  rangeEnd: Date | null;
  selectionMode: SelectionMode;
  monthExpanded: boolean;
  loading: boolean;
  showArchive: boolean;
  onToggleMonth: () => void;
  onToggleMode: () => void;
  onToggleArchive: () => void;
  onLog: () => void;
  disabledLog: boolean;
}) {
  const isRange = selectionMode === 'range' && rangeEnd && !isSameDay(rangeStart, rangeEnd);

  return (
    <div className="flex items-center justify-between gap-2 pt-3 pb-2">
      {/* Left: month label + range span */}
      <button
        onClick={onToggleMonth}
        className="flex min-w-0 items-center gap-1.5 transition-opacity active:opacity-60"
        aria-expanded={monthExpanded}
      >
        <span className="text-base font-semibold tracking-tight">
          {format(rangeStart, 'MMMM yyyy')}
        </span>
        <motion.span
          animate={{ rotate: monthExpanded ? 180 : 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {isRange && rangeEnd && (
          <span className="ml-1 truncate text-xs text-muted-foreground">
            {format(rangeStart, 'd MMM')} – {format(rangeEnd, 'd MMM')}
          </span>
        )}
      </button>

      {/* Right: mode toggle + archive + log */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onToggleMode}
          title={selectionMode === 'range' ? 'Single day mode' : 'Range mode'}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
            selectionMode === 'range'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <CalendarRange className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleArchive}
          title={showArchive ? 'Back to schedule' : 'View archive'}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200',
            showArchive
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Archive className="h-4 w-4" />
        </button>
        <Button size="sm" disabled={disabledLog || showArchive} onClick={onLog}>
          <Plus className="h-4 w-4" />
          Log
        </Button>
      </div>
    </div>
  );
}

// ─── Week strip ───────────────────────────────────────────────────────────────

function WeekStrip({
  weekViewStart,
  rangeStart,
  rangeEnd,
  selectionMode,
  daysWithLessons,
  monthExpanded,
  onSelect,
  onToggleMonth,
  onWeekNav,
}: {
  weekViewStart: Date;
  rangeStart: Date;
  rangeEnd: Date | null;
  selectionMode: SelectionMode;
  daysWithLessons: Set<string>;
  monthExpanded: boolean;
  onSelect: (day: Date) => void;
  onToggleMonth: () => void;
  onWeekNav: (dir: 'prev' | 'next') => void;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekViewStart, i)),
    [weekViewStart],
  );

  const effectiveEnd = selectionMode === 'range' && rangeEnd ? rangeEnd : null;
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card px-1 py-1.5 shadow-sm"
      onTouchStart={(e) => {
        touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!touchRef.current) return;
        const dx = e.changedTouches[0].clientX - touchRef.current.x;
        const dy = e.changedTouches[0].clientY - touchRef.current.y;
        touchRef.current = null;
        if (Math.abs(dy) > Math.abs(dx)) {
          if (dy > 28 && !monthExpanded) onToggleMonth();
          else if (dy < -28 && monthExpanded) onToggleMonth();
        } else if (Math.abs(dx) > 48) {
          onWeekNav(dx < 0 ? 'next' : 'prev');
        }
      }}
    >
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const isStart = isSameDay(day, rangeStart);
          const isEnd = !!effectiveEnd && isSameDay(day, effectiveEnd);
          const hasRange = !!effectiveEnd && !isSameDay(rangeStart, effectiveEnd);
          const isInRange = hasRange && day > rangeStart && day < effectiveEnd!;
          const showRight = hasRange && (isStart || isInRange) && !isEnd;
          const showLeft = hasRange && (isEnd || isInRange) && !isStart;
          const isActive = isStart || isEnd;
          const isTodayDay = isToday(day);
          const hasLesson = daysWithLessons.has(key);

          return (
            <div key={key} className="relative flex items-center justify-center py-0.5">
              {/* Range bridge */}
              {showRight && (
                <div className="absolute top-1/2 left-1/2 right-0 h-9 -translate-y-1/2 bg-primary/12 rounded-none" />
              )}
              {showLeft && (
                <div className="absolute top-1/2 left-0 right-1/2 h-9 -translate-y-1/2 bg-primary/12 rounded-none" />
              )}
              {isInRange && (
                <div className="absolute top-1/2 inset-x-0 h-9 -translate-y-1/2 bg-primary/12" />
              )}

              <button
                onClick={() => onSelect(day)}
                className={cn(
                  'relative z-10 flex h-9 w-9 flex-col items-center justify-center gap-px rounded-full transition-all duration-200',
                  isActive && 'bg-primary text-primary-foreground shadow-sm',
                  !isActive && isTodayDay && 'ring-1 ring-primary/50',
                  !isActive && 'hover:bg-accent/60 active:scale-95',
                )}
              >
                <span
                  className={cn(
                    'text-[9px] uppercase leading-none tracking-widest',
                    isActive ? 'opacity-60' : 'text-muted-foreground',
                  )}
                >
                  {format(day, 'EEE').charAt(0)}
                </span>
                <span
                  className={cn(
                    'text-[13px] font-medium leading-none',
                    !isActive && isTodayDay && 'font-bold text-primary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div
                  className={cn(
                    'h-[3px] w-[3px] rounded-full transition-opacity duration-200',
                    hasLesson
                      ? isActive
                        ? 'bg-primary-foreground opacity-60'
                        : 'bg-primary opacity-50'
                      : 'opacity-0',
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  rangeStart,
  rangeEnd,
  selectionMode,
  daysWithLessons,
  onSelect,
  onMonthChange,
}: {
  rangeStart: Date;
  rangeEnd: Date | null;
  selectionMode: SelectionMode;
  daysWithLessons: Set<string>;
  onSelect: (day: Date) => void;
  onMonthChange: (date: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(rangeStart));
  const selMonthKey = monthKey(rangeStart);

  useEffect(() => {
    if (!isSameMonth(viewMonth, rangeStart)) setViewMonth(startOfMonth(rangeStart));
  }, [selMonthKey]);

  function changeMonth(delta: number) {
    const next = delta > 0 ? addMonths(viewMonth, 1) : subMonths(viewMonth, 1);
    setViewMonth(next);
    onMonthChange(next);
  }

  const gridStart = startOfWeek(viewMonth, WEEK_START);
  const gridEnd = endOfWeek(endOfMonth(viewMonth), WEEK_START);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const vmKey = monthKey(viewMonth);
  const effectiveEnd = selectionMode === 'range' && rangeEnd ? rangeEnd : null;

  return (
    <div className="mt-1.5 rounded-2xl border border-border/50 bg-card p-3 shadow-sm">
      {/* Month nav */}
      <div className="mb-2.5 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          onClick={() => changeMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            className="py-0.5 text-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const isStart = isSameDay(day, rangeStart);
          const isEnd = !!effectiveEnd && isSameDay(day, effectiveEnd);
          const hasRange = !!effectiveEnd && !isSameDay(rangeStart, effectiveEnd);
          const isInRange = hasRange && day > rangeStart && day < effectiveEnd!;
          const showRight = hasRange && (isStart || isInRange) && !isEnd;
          const showLeft = hasRange && (isEnd || isInRange) && !isStart;
          const isActive = isStart || isEnd;
          const isTodayDay = isToday(day);
          const hasLesson = daysWithLessons.has(key);
          const inMonth = monthKey(day) === vmKey;

          return (
            <div
              key={key}
              className={cn(
                'relative flex items-center justify-center py-[3px]',
                !inMonth && 'opacity-20',
              )}
            >
              {showRight && (
                <div className="absolute top-1/2 left-1/2 right-0 h-8 -translate-y-1/2 bg-primary/12" />
              )}
              {showLeft && (
                <div className="absolute top-1/2 left-0 right-1/2 h-8 -translate-y-1/2 bg-primary/12" />
              )}
              {isInRange && (
                <div className="absolute top-1/2 inset-x-0 h-8 -translate-y-1/2 bg-primary/12" />
              )}

              <button
                onClick={() => onSelect(day)}
                className={cn(
                  'relative z-10 flex h-8 w-8 flex-col items-center justify-center gap-px rounded-full text-sm transition-all duration-150',
                  isActive && 'bg-primary text-primary-foreground shadow-sm',
                  !isActive && isTodayDay && 'font-bold text-primary ring-1 ring-primary/40',
                  !isActive && !isInRange && 'hover:bg-accent/60 active:scale-95',
                )}
              >
                <span className="leading-none">{format(day, 'd')}</span>
                <div
                  className={cn(
                    'h-[3px] w-3 rounded-full',
                    hasLesson
                      ? isActive
                        ? 'bg-primary-foreground opacity-60'
                        : 'bg-primary opacity-40'
                      : 'invisible',
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day / range detail ───────────────────────────────────────────────────────

function DayDetail({
  rangeStart,
  rangeEnd,
  selectionMode,
  lessons,
  studentMap,
  loading,
  onLessonChanged,
  onLog,
  hasStudents,
}: {
  rangeStart: Date;
  rangeEnd: Date | null;
  selectionMode: SelectionMode;
  lessons: Lesson[];
  studentMap: Map<string, string>;
  loading: boolean;
  onLessonChanged: () => Promise<void>;
  onLog: () => void;
  hasStudents: boolean;
}) {
  const effectiveEnd = selectionMode === 'range' && rangeEnd ? rangeEnd : rangeStart;
  const isRange = !isSameDay(rangeStart, effectiveEnd);
  const overlappingIds = useMemo(() => findOverlaps(lessons), [lessons]);

  const label = isRange
    ? `${format(rangeStart, 'd MMM')} – ${format(effectiveEnd, 'd MMM')}`
    : isToday(rangeStart)
      ? 'Today'
      : format(rangeStart, 'EEEE, d MMMM');

  const rangeKey = `${dayKey(rangeStart)}_${dayKey(effectiveEnd)}`;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 px-0.5">
        <span className="text-sm font-semibold">{label}</span>
        {lessons.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {lessons.length}
          </span>
        )}
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      <FadeSwap motionKey={rangeKey}>
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            {!hasStudents ? (
              <span>Add a student first to log lessons.</span>
            ) : loading ? (
              <span>Loading…</span>
            ) : (
              <>
                <span>{isRange ? 'No lessons in this range.' : 'No lessons on this day.'}</span>
                <Button size="sm" variant="outline" onClick={onLog}>
                  <Plus className="h-4 w-4" />
                  Add lesson
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {lessons.map((l) => (
              <LessonCard
                key={l.id}
                lesson={l}
                studentName={studentMap.get(l.studentId) ?? l.studentId}
                overlapping={overlappingIds.has(l.id)}
                onChanged={onLessonChanged}
                onArchived={onLessonChanged}
                onDeleted={onLessonChanged}
              />
            ))}
          </div>
        )}
      </FadeSwap>
    </div>
  );
}

// ─── Archive view ─────────────────────────────────────────────────────────────

function ArchiveView({
  lessons,
  studentMap,
  loading,
  onRefresh,
}: {
  lessons: Lesson[];
  studentMap: Map<string, string>;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await api.delete('/lessons/archive');
      setDeleteAllOpen(false);
      onRefresh();
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Archive</span>
          {lessons.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {lessons.length}
            </span>
          )}
          {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        {lessons.length > 0 && (
          <button
            onClick={() => setDeleteAllOpen(true)}
            className="flex items-center gap-1.5 text-xs text-destructive transition-opacity hover:opacity-70 active:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete all
          </button>
        )}
      </div>

      {!loading && lessons.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-sm text-muted-foreground">
          No archived lessons
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {lessons.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              studentName={studentMap.get(l.studentId) ?? l.studentId}
              isArchived
              onDeleted={onRefresh}
            />
          ))}
        </div>
      )}

      <ResponsiveModal open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete all archived?</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody>
            <p className="text-sm text-muted-foreground">
              This permanently deletes all {lessons.length} archived lesson
              {lessons.length !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete all
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
}

// ─── Day schedule preview ─────────────────────────────────────────────────────

function DaySchedulePreview({
  lessons,
  studentMap,
}: {
  lessons: Lesson[];
  studentMap: Map<string, string>;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
      <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Schedule for this day</p>
      <ul className="divide-y divide-border/40">
        {lessons.map((l) => (
          <li key={l.id} className="flex items-center gap-2 py-1.5 text-xs">
            <span className="w-10 shrink-0 tabular-nums font-medium">
              {format(new Date(l.startsAt), 'HH:mm')}
            </span>
            <span className="flex-1 truncate text-foreground/80">
              {studentMap.get(l.studentId) ?? l.studentId}
            </span>
            <span className="shrink-0 text-muted-foreground">{l.durationMin}m</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Slot card (batch mode) ───────────────────────────────────────────────────

function SlotCard({
  slot,
  students,
  isFocused,
  hasOverlap,
  canDelete,
  onFocus,
  onChange,
  onDelete,
}: {
  slot: SlotDraft;
  students: StudentRef[];
  isFocused: boolean;
  hasOverlap: boolean;
  canDelete: boolean;
  onFocus: () => void;
  onChange: (patch: Partial<SlotDraft>) => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onFocus}
      className={cn(
        'rounded-xl border p-2.5 transition-all duration-200',
        isFocused ? 'border-primary/50 bg-primary/[0.03] shadow-sm' : 'border-border/50 bg-muted/20',
        hasOverlap && 'border-amber-500/50 bg-amber-500/[0.05]',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* Student */}
        <Select
          value={slot.studentId}
          onValueChange={(v) => onChange({ studentId: v })}
        >
          <SelectTrigger className="h-7 w-auto min-w-[100px] flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date chip */}
        <button
          type="button"
          onClick={onFocus}
          className={cn(
            'h-7 rounded-lg px-2.5 text-xs font-medium transition-all duration-150',
            isFocused
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground hover:bg-muted/70',
          )}
        >
          {format(slot.date, 'd MMM EEE')}
        </button>

        {/* Time */}
        <Input
          type="time"
          value={slot.time}
          onChange={(e) => onChange({ time: e.target.value })}
          className="h-7 w-24 text-xs"
        />

        {/* Duration */}
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="1"
            value={slot.durationMin}
            onChange={(e) => onChange({ durationMin: Number(e.target.value) })}
            className="h-7 w-14 text-xs"
          />
          <span className="text-xs text-muted-foreground">m</span>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
            canDelete
              ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
              : 'pointer-events-none opacity-30',
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Overlap indicator */}
      <AnimatePresence>
        {hasOverlap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 pt-2 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Time overlap detected
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create calendar picker ───────────────────────────────────────────────────

function CreateCalendar({
  selectedDate,
  viewMonth,
  daysWithLessons,
  onSelect,
  onMonthChange,
}: {
  selectedDate: Date;
  viewMonth: Date;
  daysWithLessons: Set<string>;
  onSelect: (d: Date) => void;
  onMonthChange: (d: Date) => void;
}) {
  const gridStart = startOfWeek(viewMonth, WEEK_START);
  const gridEnd = endOfWeek(endOfMonth(viewMonth), WEEK_START);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const vmKey = monthKey(viewMonth);

  return (
    <div className="rounded-xl border border-border/60 bg-card p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(viewMonth, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          {format(viewMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(viewMonth, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:opacity-70"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-0.5 grid grid-cols-7">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div
            key={i}
            className="py-0.5 text-center text-[9px] font-medium uppercase tracking-widest text-muted-foreground/50"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDay = isToday(day);
          const hasLesson = daysWithLessons.has(key);
          const inMonth = monthKey(day) === vmKey;

          return (
            <div
              key={key}
              className={cn('flex items-center justify-center py-[3px]', !inMonth && 'opacity-25')}
            >
              <button
                type="button"
                onClick={() => onSelect(startOfDay(day))}
                className={cn(
                  'flex h-8 w-8 flex-col items-center justify-center gap-px rounded-full text-[13px] transition-all duration-150',
                  isSelected && 'bg-primary text-primary-foreground shadow-sm',
                  !isSelected && isTodayDay && 'font-bold text-primary ring-1 ring-primary/40',
                  !isSelected && 'hover:bg-accent/60 active:scale-95',
                )}
              >
                <span className="leading-none">{format(day, 'd')}</span>
                <div
                  className={cn(
                    'h-[3px] w-2.5 rounded-full',
                    hasLesson
                      ? isSelected
                        ? 'bg-primary-foreground opacity-60'
                        : 'bg-primary opacity-40'
                      : 'invisible',
                  )}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
