import { ApolloProvider, useMutation } from '@apollo/client/react';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/apollo';
import { M_CREATE_LESSON, M_UPDATE_LESSON } from '@/lib/gql';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { fmtDateTime } from '@/lib/format';

interface StudentRef {
  id: string;
  name: string;
}

interface Lesson {
  id: string;
  studentId: string;
  startsAt: string;
  durationMin: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string | null;
}

interface Props {
  initial: Lesson[];
  students: StudentRef[];
}

const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;

function LessonsImpl({ initial, students }: Props) {
  const [open, setOpen] = useState(false);
  const [createMut] = useMutation(M_CREATE_LESSON);
  const [updateMut] = useMutation(M_UPDATE_LESSON);

  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  async function onCreate(form: HTMLFormElement) {
    const data = new FormData(form);
    const input = {
      studentId: String(data.get('studentId')),
      startsAt: new Date(String(data.get('startsAt'))).toISOString(),
      durationMin: Number(data.get('durationMin') ?? 60),
      status: String(data.get('status') ?? 'scheduled'),
      notes: String(data.get('notes') ?? '').trim() || undefined,
    };
    await createMut({ variables: { input } });
    setOpen(false);
    window.location.reload();
  }

  async function setStatus(id: string, status: Lesson['status']) {
    await updateMut({ variables: { id, patch: { status } } });
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lessons</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={students.length === 0}>
              <Plus className="mr-2 h-4 w-4" /> Log lesson
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New lesson</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onCreate(e.currentTarget);
              }}
              className="grid gap-4"
            >
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
              <div className="grid grid-cols-2 gap-3">
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
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
              <DialogFooter>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add a student first, then log lessons.
        </p>
      ) : null}

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initial.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No lessons yet.
                </TableCell>
              </TableRow>
            ) : (
              initial.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{fmtDateTime(l.startsAt)}</TableCell>
                  <TableCell>{studentMap.get(l.studentId) ?? l.studentId}</TableCell>
                  <TableCell>{l.durationMin} min</TableCell>
                  <TableCell>
                    <Select
                      defaultValue={l.status}
                      onValueChange={(v) => setStatus(l.id, v as Lesson['status'])}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function LessonsIsland(props: Props) {
  return (
    <ApolloProvider client={getBrowserClient()}>
      <LessonsImpl {...props} />
    </ApolloProvider>
  );
}
