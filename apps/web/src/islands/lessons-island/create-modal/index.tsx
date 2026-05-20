import { useEffect, useMemo, useRef, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { FadeSwap } from '@/components/ui/collapse';
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
import { getDateFnsLocale, useI18n } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Lesson, StudentRef } from '@/lib/types';
import { statusLabel } from '@/lib/utils';
import { CreateCalendar } from './create-calendar';
import { DaySchedulePreview } from './day-schedule-preview';
import { SlotCard } from './slot-card';
import { type SlotDraft, CREATE_STATUSES, dayKey } from '../shared';

interface CreateLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentRef[];
  studentMap: Map<string, string>;
  daysWithLessons: Set<string>;
  monthLessons: Lesson[];
  initialDate: Date;
  loadMonth: (date: Date) => Promise<void>;
  onCreated: (affectedDates: Date[]) => Promise<void>;
}

export function CreateLessonModal({
  open,
  onOpenChange,
  students,
  studentMap,
  daysWithLessons,
  monthLessons,
  initialDate,
  loadMonth,
  onCreated,
}: CreateLessonModalProps) {
  const { locale, t } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const initialDateRef = useRef(initialDate);

  const [createDate, setCreateDate] = useState<Date>(initialDate);
  const [createTime, setCreateTime] = useState('10:00');
  const [createDurationMin, setCreateDurationMin] = useState(60);
  const [createViewMonth, setCreateViewMonth] = useState(() => startOfMonth(initialDate));
  const [createStudentId, setCreateStudentId] = useState(students[0]?.id ?? '');
  const [batchMode, setBatchMode] = useState(false);
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [focusedSlotId, setFocusedSlotId] = useState<string | null>(null);
  const [createProgress, setCreateProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Capture initialDate at open time; reset all state when modal opens
  useEffect(() => {
    if (open) {
      initialDateRef.current = initialDate;
      const d = initialDate;
      setCreateDate(d);
      setCreateViewMonth(startOfMonth(d));
      setCreateTime('10:00');
      setCreateDurationMin(60);
      setCreateStudentId(students[0]?.id ?? '');
      setBatchMode(false);
      setSlots([]);
      setFocusedSlotId(null);
      setCreateProgress(null);
      setCreateErrors([]);
      setCreateSubmitting(false);
    }
  }, [open]);

  const focusedSlot = useMemo(
    () => slots.find((s) => s.id === focusedSlotId) ?? null,
    [slots, focusedSlotId],
  );

  const createDayLessons = useMemo(() => {
    const key = dayKey(batchMode ? (focusedSlot?.date ?? createDate) : createDate);
    return monthLessons
      .filter((l) => dayKey(new Date(l.startsAt)) === key)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [createDate, focusedSlot, batchMode, monthLessons]);

  const slotOverlapIds = useMemo(() => {
    if (!batchMode) return new Set<string>();
    const synthetic = slots.map((s) => {
      const [h, m] = s.time.split(':').map(Number);
      const d = new Date(s.date);
      d.setHours(h, m, 0, 0);
      return { id: s.id, startsAt: d.toISOString(), durationMin: s.durationMin } as Lesson;
    });
    const overlaps = new Set<string>();
    const all = [...monthLessons, ...synthetic];
    for (let i = 0; i < all.length; i++) {
      const aStart = new Date(all[i].startsAt).getTime();
      const aEnd = aStart + all[i].durationMin * 60000;
      for (let j = i + 1; j < all.length; j++) {
        const bStart = new Date(all[j].startsAt).getTime();
        const bEnd = bStart + all[j].durationMin * 60000;
        if (aStart < bEnd && bStart < aEnd) {
          overlaps.add(all[i].id);
          overlaps.add(all[j].id);
        }
      }
    }
    return overlaps;
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
      homework: String(data.get('homework') ?? '').trim() || undefined,
      meetingLink: String(data.get('meetingLink') ?? '').trim() || undefined,
    });
    onOpenChange(false);
    await onCreated([createDate]);
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
        errs.push(
          t('Slot {index} ({date} {time}) failed', {
            index: i + 1,
            date: format(s.date, 'd MMM', { locale: dateLocale }),
            time: s.time,
          }),
        );
      }
      setCreateProgress({ done: i + 1, total: slots.length });
    }
    setCreateSubmitting(false);
    setCreateErrors(errs);
    if (errs.length === 0) {
      onOpenChange(false);
      await onCreated(slots.map((s) => s.date));
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="max-w-md md:max-h-[calc(100dvh-2rem)]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {batchMode ? t('Log {count} lessons', { count: slots.length }) : t('New lesson')}
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!batchMode) onCreate(e.currentTarget);
          }}
          className="contents"
        >
          <ResponsiveModalBody className="min-h-0 flex flex-col gap-4 pr-1">
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
                      <Label>{t('Student')}</Label>
                      <Select
                        name="studentId"
                        value={createStudentId}
                        onValueChange={setCreateStudentId}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>{t('Status')}</Label>
                      <Select name="status" defaultValue="scheduled">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CREATE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(statusLabel[s])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>{t('Date')}</Label>
                    <CreateCalendar
                      selectedDate={createDate}
                      viewMonth={createViewMonth}
                      daysWithLessons={daysWithLessons}
                      onSelect={(d) => {
                        setCreateDate(d);
                        loadMonth(d);
                      }}
                      onMonthChange={(d) => {
                        setCreateViewMonth(d);
                        loadMonth(d);
                      }}
                    />
                    <FadeSwap motionKey={dayKey(createDate)} duration={0.18}>
                      {createDayLessons.length > 0 ? (
                        <DaySchedulePreview lessons={createDayLessons} studentMap={studentMap} />
                      ) : null}
                    </FadeSwap>
                  </div>
                  <div className="grid gap-3 grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="createTime">{t('Time')}</Label>
                      <Input
                        id="createTime"
                        type="time"
                        value={createTime}
                        onChange={(e) => setCreateTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="createDurationMin">{t('Duration (min)')}</Label>
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
                    <Label htmlFor="notes">{t('Notes')}</Label>
                    <Input id="notes" name="notes" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="homework">{t('Homework')}</Label>
                    <Input id="homework" name="homework" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="meetingLink">{t('Meeting link')}</Label>
                    <Input
                      id="meetingLink"
                      name="meetingLink"
                      type="url"
                      placeholder="https://..."
                    />
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
                          prev.map((s) => (s.id === focusedSlotId ? { ...s, date: d } : s)),
                        );
                      }
                    }}
                    onMonthChange={(d) => {
                      setCreateViewMonth(d);
                      loadMonth(d);
                    }}
                  />
                  <FadeSwap motionKey={dayKey(focusedSlot?.date ?? createDate)} duration={0.18}>
                    {createDayLessons.length > 0 ? (
                      <DaySchedulePreview lessons={createDayLessons} studentMap={studentMap} />
                    ) : null}
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
                            prev.map((s) => (s.id === slot.id ? { ...s, ...patch } : s)),
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
              {t('Add slot')}
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
                      {t('Overlaps with {name} at {time}', {
                        name: studentMap.get(createOverlapLesson.studentId) ?? t('another lesson'),
                        time: format(new Date(createOverlapLesson.startsAt), 'HH:mm'),
                      })}
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
                    {t('Creating {done} of {total}…', {
                      done: createProgress.done,
                      total: createProgress.total,
                    })}
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
                      <p key={i} className="text-xs text-destructive">
                        {e}
                      </p>
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
                ? t('Creating {done}/{total}…', {
                    done: createProgress?.done ?? 0,
                    total: createProgress?.total ?? 0,
                  })
                : batchMode
                  ? t(slots.length === 1 ? 'Create {count} lesson' : 'Create {count} lessons', {
                      count: slots.length,
                    })
                  : t('Create')}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
