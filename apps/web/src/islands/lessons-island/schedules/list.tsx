import { useState } from 'react';
import { addDays, startOfWeek, subDays } from 'date-fns';
import { AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { FadeSwap } from '@/components/ui/collapse';
import { Button } from '@/components/ui/button';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import type { RecurringLesson, StudentRef } from '@/lib/types';
import type { WeekStartsOn } from '@tutor-finance/shared';
import { useI18n } from '@/lib/i18n';
import { weekStartOptions } from '../shared';
import { ScheduleCard } from './card';
import { WeekGrid } from './week-grid';
import { ScheduleFormDialog, type ScheduleFormPayload } from './form-dialog';

export function SchedulesView({
  initialSchedules,
  students,
  studentMap,
  weekStartsOn,
}: {
  initialSchedules: RecurringLesson[];
  students: StudentRef[];
  studentMap: Map<string, string>;
  weekStartsOn: WeekStartsOn;
}) {
  const { t } = useI18n();
  const [schedules, setSchedules] = useState<RecurringLesson[]>(initialSchedules);
  const [addOpen, setAddOpen] = useState(false);
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
    setAddOpen(false);
  }

  async function handleEdit(id: string, payload: ScheduleFormPayload) {
    const updated = await api.patch<RecurringLesson>(`/recurring-lessons/${id}`, payload);
    setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
    setEditing(null);
  }

  async function handleToggle(item: RecurringLesson) {
    const updated = await api.patch<RecurringLesson>(`/recurring-lessons/${item.id}`, {
      isActive: !item.isActive,
    });
    setSchedules((prev) => prev.map((s) => (s.id === item.id ? updated : s)));
  }

  async function handleDelete(id: string) {
    await api.delete(`/recurring-lessons/${id}`);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="mt-1 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t('Weekly template')}</span>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('Add schedule')}
        </Button>
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
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            <span>{t('No recurring schedules yet.')}</span>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('Add schedule')}
            </Button>
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

      <ResponsiveModal open={addOpen} onOpenChange={setAddOpen}>
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
