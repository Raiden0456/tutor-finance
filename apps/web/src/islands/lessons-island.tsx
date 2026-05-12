import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
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
import { Plus } from 'lucide-react';
import type { Lesson, StudentRef } from '@/lib/types';
import { statusLabel } from '@/lib/utils';
import { LessonCard } from '@/components/lesson-card';

interface Props {
  initial: Lesson[];
  students: StudentRef[];
}

const CREATE_STATUSES = ['scheduled', 'due', 'paid'] as const;

const dayKeyFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});

function groupByDay(lessons: Lesson[]): Array<{ key: string; label: string; items: Lesson[] }> {
  const groups = new Map<string, { label: string; items: Lesson[] }>();
  for (const l of lessons) {
    const d = new Date(l.startsAt);
    const key = d.toISOString().slice(0, 10);
    const label = dayKeyFmt.format(d);
    const g = groups.get(key) ?? { label, items: [] };
    g.items.push(l);
    groups.set(key, g);
  }
  return Array.from(groups.entries()).map(([key, v]) => ({ key, ...v }));
}

export function LessonsIsland({ initial, students }: Props) {
  const [open, setOpen] = useState(false);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);
  const groups = useMemo(() => groupByDay(initial), [initial]);

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const input = {
      studentId: String(data.get('studentId')),
      startsAt: new Date(String(data.get('startsAt'))).toISOString(),
      durationMin: Number(data.get('durationMin') ?? 60),
      status: String(data.get('status') ?? 'due'),
      notes: String(data.get('notes') ?? '').trim() || undefined,
    };
    await api.post('/lessons', input);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="page-enter space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="hidden text-xl font-semibold tracking-tight md:block">Lessons</h1>
          <p className="text-xs text-muted-foreground">
            {initial.length === 0 ? 'No lessons yet' : `${initial.length} total`}
          </p>
        </div>
        <ResponsiveModal open={open} onOpenChange={setOpen}>
          <ResponsiveModalTrigger asChild>
            <Button disabled={students.length === 0}>
              <Plus className="h-4 w-4" /> Log
            </Button>
          </ResponsiveModalTrigger>
          <ResponsiveModalContent className="max-w-md">
            <ResponsiveModalHeader>
              <ResponsiveModalTitle>New lesson</ResponsiveModalTitle>
            </ResponsiveModalHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreate(e.currentTarget);
              }}
              className="flex min-h-0 flex-1 flex-col gap-4"
            >
              <ResponsiveModalBody className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="studentId">Student</Label>
                  <Select name="studentId" defaultValue={students[0]?.id}>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="startsAt">Starts at</Label>
                    <Input
                      id="startsAt"
                      name="startsAt"
                      type="datetime-local"
                      required
                      defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="durationMin">Duration (min)</Label>
                    <Input
                      id="durationMin"
                      name="durationMin"
                      type="number"
                      min="1"
                      defaultValue="60"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue="due">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CREATE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusLabel[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" />
                </div>
              </ResponsiveModalBody>
              <ResponsiveModalFooter>
                <Button type="submit" className="w-full sm:w-auto">
                  Create
                </Button>
              </ResponsiveModalFooter>
            </form>
          </ResponsiveModalContent>
        </ResponsiveModal>
      </header>

      <div
        key={students.length === 0 ? 'no-students' : initial.length === 0 ? 'no-lessons' : 'list'}
        className="animate-in fade-in slide-in-from-bottom-1 duration-300"
      >
        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            Add a student first, then log lessons here.
          </div>
        ) : initial.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            No lessons yet.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((g) => (
              <section key={g.key} className="space-y-2">
                <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </h2>
                <div className="flex flex-col gap-2">
                  {g.items.map((l) => (
                    <LessonCard
                      key={l.id}
                      lesson={l}
                      studentName={studentMap.get(l.studentId) ?? l.studentId}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
