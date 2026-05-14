import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  ResponsiveModal,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { Plus } from 'lucide-react';
import { fromMinorUnits, toMinorUnits, type Currency } from '@tutor-finance/shared';
import type { Student, IncomeTx } from '@/lib/types';
import { StudentCard } from './student-card';
import { StudentDialog, EmptyState } from './student-dialog';

interface Props {
  initial: Student[];
  transactions: IncomeTx[];
  primaryCurrency: Currency;
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

      <FadeSwap motionKey={empty ? 'empty' : 'list'}>
        {empty ? (
          <EmptyState onAdd={startCreate} />
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {students.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  onEdit={() => startEdit(s)}
                  onArchive={() => archive(s.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </FadeSwap>
    </div>
  );
}
