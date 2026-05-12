import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse } from '@/components/ui/collapse';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  ResponsiveModal,
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Archive, Pencil, MoreVertical } from 'lucide-react';
import { fmtMoney, fmtMajor } from '@/lib/format';
import {
  fromMinorUnits,
  SUPPORTED_CURRENCIES,
  toMinorUnits,
  type Currency,
} from '@tutor-finance/shared';
import type { Student, IncomeTx } from '@/lib/types';

interface Props {
  initial: Student[];
  transactions: IncomeTx[];
  primaryCurrency: Currency;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_TINTS = [
  'var(--tf-indigo)',
  'var(--tf-teal)',
  'var(--tf-coral)',
  'var(--tf-jade)',
  'var(--tf-pollen)',
];

function avatarTint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]!;
}

export function StudentsIsland({ initial, transactions, primaryCurrency }: Props) {
  const [students, setStudents] = useState(initial);
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);

  const empty = students.length === 0;

  const topEarners = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== 'income' || !t.studentId) continue;
      const v = typeof t.convertedAmount === 'number' ? t.convertedAmount : 0;
      totals.set(t.studentId, (totals.get(t.studentId) ?? 0) + v);
    }
    const nameById = new Map(students.map((s) => [s.id, s.name]));
    return Array.from(totals.entries())
      .map(([id, total]) => ({
        id,
        name: nameById.get(id) ?? '—',
        total: Math.round(fromMinorUnits(total, primaryCurrency) * 100) / 100,
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [transactions, students, primaryCurrency]);

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
    const input = { name, email, phone, hourlyRate, defaultCurrency: currency, notes };
    if (editing) {
      await api.patch(`/students/${editing.id}`, input);
    } else {
      await api.post('/students', input);
    }
    setOpen(false);
    window.location.reload();
  }

  async function archive(id: string) {
    if (!confirm('Archive this student?')) return;
    await api.post(`/students/${id}/archive`);
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="page-enter space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="hidden text-xl font-semibold tracking-tight md:block">Students</h1>
          <p className="text-xs text-muted-foreground">
            {empty ? 'No students yet' : `${students.length} active`}
          </p>
        </div>
        <ResponsiveModal open={open} onOpenChange={setOpen}>
          <ResponsiveModalTrigger asChild>
            <Button onClick={startCreate} size="default">
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          </ResponsiveModalTrigger>
          <StudentDialog editing={editing} onSubmit={handleSubmit} />
        </ResponsiveModal>
      </header>

      <Collapse open={topEarners.length > 0}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top earners · this month</CardTitle>
            <CardDescription className="text-xs">
              Lesson income totals ({primaryCurrency})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={
                {
                  total: { label: 'Earned', color: 'var(--tf-indigo)' },
                } satisfies ChartConfig
              }
              className="aspect-auto w-full"
              style={{ height: 56 + topEarners.length * 36 }}
            >
              <BarChart
                data={topEarners}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={96}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={{ fill: 'var(--accent)' }}
                  content={
                    <ChartTooltipContent indicator="line" formatter={(v) => Number(v).toFixed(2)} />
                  }
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} fill="var(--color-total)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </Collapse>

      <div
        key={empty ? 'empty' : 'list'}
        className="animate-in fade-in slide-in-from-bottom-1 duration-300"
      >
        {empty ? (
          <EmptyState onAdd={startCreate} />
        ) : (
          <ul className="flex flex-col gap-3">
            {students.map((s) => (
              <StudentCard
                key={s.id}
                student={s}
                onEdit={() => startEdit(s)}
                onArchive={() => archive(s.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StudentCard({
  student,
  onEdit,
  onArchive,
}: {
  student: Student;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const tint = useMemo(() => avatarTint(student.id), [student.id]);
  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-primary-foreground"
          style={{ backgroundColor: tint }}
          aria-hidden
        >
          {initials(student.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-medium">{student.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {student.email || student.phone || '—'}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onArchive}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Hourly rate</span>
        <span className="text-lg font-semibold tabular-nums">
          {fmtMoney(student.hourlyRate.amount, student.hourlyRate.currency)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/ hr</span>
        </span>
      </div>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <p className="text-sm font-medium">No students yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Add your first one to start tracking lessons.
      </p>
      <Button onClick={onAdd} className="mt-4">
        <Plus className="h-4 w-4" /> Add student
      </Button>
    </div>
  );
}

function StudentDialog({
  editing,
  onSubmit,
}: {
  editing: Student | null;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  return (
    <ResponsiveModalContent className="max-w-md">
      <ResponsiveModalHeader>
        <ResponsiveModalTitle>{editing ? 'Edit student' : 'New student'}</ResponsiveModalTitle>
        <ResponsiveModalDescription>
          Hourly rate stored in minor units; enter major value (e.g. 30.00).
        </ResponsiveModalDescription>
      </ResponsiveModalHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e.currentTarget);
        }}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <ResponsiveModalBody className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required defaultValue={editing?.name ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ''} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={editing?.phone ?? ''} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rate">Hourly rate</Label>
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
              <Select name="currency" defaultValue={editing?.hourlyRate.currency ?? 'USD'}>
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
        </ResponsiveModalBody>
        <ResponsiveModalFooter>
          <Button type="submit" className="w-full sm:w-auto">
            {editing ? 'Save' : 'Create'}
          </Button>
        </ResponsiveModalFooter>
      </form>
    </ResponsiveModalContent>
  );
}
