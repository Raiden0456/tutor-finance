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
import { Plus, Clock } from 'lucide-react';
import type { Lesson, StudentRef } from '@/lib/types';
import { statusLabel, statusStyles } from '@/lib/utils';

interface Props {
  initial: Lesson[];
  students: StudentRef[];
}

const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;

const dayKeyFmt = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

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
      status: String(data.get('status') ?? 'scheduled'),
      notes: String(data.get('notes') ?? '').trim() || undefined,
    };
    await api.post('/lessons', input);
    setOpen(false);
    window.location.reload();
  }

  async function setStatus(id: string, status: Lesson['status']) {
    await api.patch(`/lessons/${id}`, { status });
    window.location.reload();
  }

  return (
    <div className="space-y-5">
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
                  <Select name="status" defaultValue="completed">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
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
              <ul className="flex flex-col gap-2">
                {g.items.map((l) => (
                  <li key={l.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-medium">
                          {studentMap.get(l.studentId) ?? l.studentId}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{timeFmt.format(new Date(l.startsAt))}</span>
                          <span>·</span>
                          <span>{l.durationMin} min</span>
                        </div>
                        {l.notes ? (
                          <div className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {l.notes}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={
                          'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ' +
                          statusStyles[l.status]
                        }
                      >
                        {statusLabel[l.status]}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-border pt-3">
                      <Select
                        defaultValue={l.status}
                        onValueChange={(v) => setStatus(l.id, v as Lesson['status'])}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabel[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
