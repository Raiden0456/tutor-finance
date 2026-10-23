import { useState } from 'react';
import { addDays, startOfWeek, subDays } from 'date-fns';
import { AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { FadeSwap } from '@/components/ui/collapse';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import type { RecurringLesson, LessonStudent } from '@/lib/types';
import type { WeekStartsOn } from '@tutor-finance/shared';
import { useI18n } from '@/lib/i18n';
import { useMutation } from '@/hooks/use-mutation';
import { weekStartOptions } from '../shared';
import { ScheduleCard } from './card';
import { WeekGrid } from './week-grid';
import { ScheduleFormDialog, type ScheduleFormPayload } from './form-dialog';

export function SchedulesView({
  initialSchedules,
  students,
  studentMap,
  weekStartsOn,
  addOpen,
  onAddOpenChange,
}: {
  initialSchedules: RecurringLesson[];
  students: LessonStudent[];
  studentMap: Map<string, string>;
  weekStartsOn: WeekStartsOn;
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { run } = useMutation();
  const [schedules, setSchedules] = useState<RecurringLesson[]>(initialSchedules);
  const [editing, setEditing] = useState<RecurringLesson | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), weekStartOptions(weekStartsOn)),
  );

  function handleWeekNav(dir: 'prev' | 'next') {
    setWeekStart((prev) => (dir === 'next' ? addDays(prev, 7) : subDays(prev, 7)));
  }

  async function handleCreate(payload: ScheduleFormPayload) {
    const created = await api.post<RecurringLesson>('/recurring-lessons', payload);
    setSchedules((prev) => [...prev, created]);
    onAddOpenChange(false);
  }

  async function handleEdit(id: string, payload: ScheduleFormPayload) {
    const updated = await api.patch<RecurringLesson>(`/recurring-lessons/${id}`, payload);
    setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditing(null);
  }

  async function handleToggle(item: RecurringLesson) {
    await run(async () => {
      const updated = await api.patch<RecurringLesson>(`/recurring-lessons/${item.id}`, {
        isActive: !item.isActive,
      });
      setSchedules((prev) => prev.map((s) => (s.id === item.id ? updated : s)));
    });
  }

  async function handleDelete(id: string) {
    await run(async () => {
      await api.delete(`/recurring-lessons/${id}`);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    });
  }

  return (
    <div className="mt-1 space-y-4">
      <div className="min-w-0">
        <span className="text-sm font-semibold">{t('Weekly template')}</span>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t(
            'Schedules create actual lessons only for the next 2 weeks. Future lessons are generated automatically as they get closer.',
          )}
        </p>
      </div>

      {schedules.length > 0 && (
        <WeekGrid
          schedules={schedules}
          studentMap={studentMap}
          weekStartsOn={weekStartsOn}
          weekStart={weekStart}
          onWeekNav={handleWeekNav}
          onEdit={setEditing}
        />
      )}

      <FadeSwap motionKey={schedules.length === 0 ? 'empty' : 'list'}>
        {schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            {t('No recurring schedules yet.')}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {schedules.map((s) => (
                <ScheduleCard
                  key={s.id}
                  item={s}
                  studentName={studentMap.get(s.studentId) ?? s.studentId}
                  onToggle={handleToggle}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </FadeSwap>

      <ResponsiveModal open={addOpen} onOpenChange={onAddOpenChange}>
        <ScheduleFormDialog
          title={t('New schedule')}
          students={students}
          schedules={schedules}
          weekStartsOn={weekStartsOn}
          onSubmit={handleCreate}
        />
      </ResponsiveModal>

      {editing && (
        <ResponsiveModal open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <ScheduleFormDialog
            title={t('Edit schedule')}
            students={students}
            defaults={editing}
            schedules={schedules}
            weekStartsOn={weekStartsOn}
            onSubmit={(p) => handleEdit(editing.id, p)}
          />
        </ResponsiveModal>
      )}
    </div>
  );
}
