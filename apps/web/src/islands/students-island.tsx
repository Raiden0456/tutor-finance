import { useMutation, ApolloProvider } from '@apollo/client/react';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/apollo';
import {
  M_ARCHIVE_STUDENT,
  M_CREATE_STUDENT,
  M_UPDATE_STUDENT,
} from '@/lib/gql';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Plus, Archive, Pencil } from 'lucide-react';
import { fmtMoney, fmtMajor } from '@/lib/format';
import { SUPPORTED_CURRENCIES, toMinorUnits, type Currency } from '@tutor-finance/shared';

interface Student {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  hourlyRate: { amount: number; currency: Currency };
  defaultCurrency: Currency;
  notes?: string | null;
  archivedAt?: string | null;
}

interface Props {
  initial: Student[];
}

function StudentsImpl({ initial }: Props) {
  const [students, setStudents] = useState(initial);
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);

  const [createMut] = useMutation(M_CREATE_STUDENT);
  const [updateMut] = useMutation(M_UPDATE_STUDENT);
  const [archiveMut] = useMutation(M_ARCHIVE_STUDENT);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(s: Student) {
    setEditing(s);
    setOpen(true);
  }

  async function handleSubmit(form: HTMLFormElement) {
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim() || undefined;
    const phone = String(data.get('phone') ?? '').trim() || undefined;
    const notes = String(data.get('notes') ?? '').trim() || undefined;
    const currency = String(data.get('currency') ?? 'USD') as Currency;
    const rateMajor = Number(data.get('rate') ?? 0);
    const hourlyRate = { amount: toMinorUnits(rateMajor, currency), currency };
    const input = {
      name,
      email,
      phone,
      hourlyRate,
      defaultCurrency: currency,
      notes,
    };
    if (editing) {
      await updateMut({ variables: { id: editing.id, patch: input } });
    } else {
      await createMut({ variables: { input } });
    }
    setOpen(false);
    window.location.reload();
  }

  async function archive(id: string) {
    if (!confirm('Archive this student?')) return;
    await archiveMut({ variables: { id } });
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Students</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" /> Add student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit student' : 'New student'}</DialogTitle>
              <DialogDescription>
                Hourly rate is stored in minor units; enter the major-unit value (e.g. 30.00).
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(e.currentTarget);
              }}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ''}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editing?.email ?? ''}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editing?.phone ?? ''} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="rate">Hourly rate (major)</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    defaultValue={
                      editing ? fmtMajor(editing.hourlyRate.amount, editing.hourlyRate.currency) : ''
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    name="currency"
                    defaultValue={editing?.hourlyRate.currency ?? 'USD'}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" defaultValue={editing?.notes ?? ''} />
              </div>
              <DialogFooter>
                <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No students yet. Add your first one.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    {fmtMoney(s.hourlyRate.amount, s.hourlyRate.currency)} / hr
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.email ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => archive(s.id)}>
                      <Archive className="h-4 w-4" />
                    </Button>
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

export function StudentsIsland(props: Props) {
  return (
    <ApolloProvider client={getBrowserClient()}>
      <StudentsImpl {...props} />
    </ApolloProvider>
  );
}
