import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/api';
import { I18nProvider, useI18n, type Locale } from '@/lib/i18n';
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
  ResponsiveModalBody,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { Plus } from 'lucide-react';
import { fromMinorUnits, parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import type { PricingMode, Student, IncomeTx } from '@/lib/types';
import { StudentCard } from './student-card';
import { StudentDialog, EmptyState } from './student-dialog';

interface Props {
  initial: Student[];
  transactions: IncomeTx[];
  primaryCurrency: Currency;
  locale?: Locale;
}

export function StudentsIsland({ locale, ...props }: Props) {
  return (
    <I18nProvider locale={locale}>
      <StudentsContent {...props} />
    </I18nProvider>
  );
}

function StudentsContent({ initial, transactions, primaryCurrency }: Omit<Props, 'locale'>) {
  const { t } = useI18n();
  const [students, setStudents] = useState(initial);
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

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
    const meetingLink = String(data.get('meetingLink') ?? '').trim() || undefined;
    const telegramLink = String(data.get('telegramLink') ?? '').trim() || undefined;
    const whatsappLink = String(data.get('whatsappLink') ?? '').trim() || undefined;
    const pricingMode = String(data.get('pricingMode') ?? 'hourly') as PricingMode;
    const input: Record<string, unknown> = {
      name,
      email,
      phone,
      pricingMode,
      meetingLink,
      telegramLink,
      whatsappLink,
      notes,
    };

    if (pricingMode === 'hourly') {
      const currency = String(data.get('currency') ?? 'USD') as Currency;
      input.hourlyRate = {
        amount: parseMajorToMinor(String(data.get('rate') ?? ''), currency),
        currency,
      };
      input.ratePeriodMin = Number(data.get('ratePeriodMin') ?? 60);
      input.defaultCurrency = currency;
    } else {
      const currency = String(data.get('packageCurrency') ?? 'USD') as Currency;
      input.package = {
        lessonCount: Number(data.get('packageLessonCount') ?? 0),
        price: {
          amount: parseMajorToMinor(String(data.get('packagePrice') ?? ''), currency),
          currency,
        },
      };
      input.defaultCurrency = currency;
    }
    if (editing) {
      const updated = await api.patch<Student>(`/students/${editing.id}`, input);
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEditing(null);
    } else {
      const created = await api.post<Student>('/students', input);
      setStudents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setOpen(false);
  }

  async function archive(id: string) {
    await api.post(`/students/${id}/archive`);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setArchiveId(null);
  }

  return (
    <div className="page-enter space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="hidden text-xl font-semibold tracking-tight md:block">{t('Students')}</h1>
          <p className="text-xs text-muted-foreground">
            {empty ? t('No students yet') : t('{count} active', { count: students.length })}
          </p>
        </div>
        <ResponsiveModal open={open} onOpenChange={setOpen}>
          <ResponsiveModalTrigger asChild>
            <Button onClick={startCreate} size="default">
              <Plus className="h-4 w-4" />
              <span>{t('Add')}</span>
            </Button>
          </ResponsiveModalTrigger>
          <StudentDialog editing={editing} onSubmit={handleSubmit} />
        </ResponsiveModal>
      </header>

      <Collapse open={topEarners.length > 0} className="p-1">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('Top earners · this month')}</CardTitle>
            <CardDescription className="text-xs">
              {t('Lesson income totals ({currency})', { currency: primaryCurrency })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={
                {
                  total: { label: t('Earned'), color: 'var(--tf-indigo)' },
                  label: { color: 'var(--background)' },
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
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, (dataMax: number) => Math.max(dataMax * 1.12, dataMax + 1)]}
                  hide
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  width={96}
                  tick={{ fontSize: 12 }}
                  hide
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Bar dataKey="total" radius={6} fill="var(--color-total)">
                  <LabelList
                    dataKey="name"
                    position="insideLeft"
                    offset={10}
                    className="fill-(--color-label)"
                    fontSize={12}
                  />
                  <LabelList
                    dataKey="total"
                    position="right"
                    offset={8}
                    className="fill-foreground"
                    fontSize={12}
                    formatter={(v) => Number(v).toFixed(2)}
                  />
                </Bar>
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
                  onArchive={() => setArchiveId(s.id)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </FadeSwap>

      <ResponsiveModal
        open={archiveId !== null}
        onOpenChange={(next) => !next && setArchiveId(null)}
      >
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Archive this student?')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <ResponsiveModalBody className="text-sm text-muted-foreground">
            {t(
              'Archived students are hidden from the active list, but their history stays intact.',
            )}
          </ResponsiveModalBody>
          <ResponsiveModalFooter>
            <Button variant="outline" onClick={() => setArchiveId(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={() => archiveId && archive(archiveId)}>
              {t('Archive')}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
}
