import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import { I18nProvider, useI18n, type Locale } from '@/lib/i18n';
import { fmtMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapse, FadeSwap } from '@/components/ui/collapse';
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
import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import type { PricingMode, Student, IncomeTx } from '@/lib/types';
import { TabSwitcher } from '../transactions-island/tab-switcher';
import { StudentCard } from './student-card';
import { StudentDialog, EmptyState } from './student-dialog';

interface Props {
  initial: Student[];
  transactions: IncomeTx[];
  primaryCurrency: Currency;
  locale?: Locale;
}

type StudentsTab = 'active' | 'archived';

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
  const [tab, setTab] = useState<StudentsTab>('active');
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const [archiveId, setArchiveId] = useState<string | null>(null);

  const active = students.filter((s) => !s.archivedAt);
  const archived = students.filter((s) => s.archivedAt);
  const list = tab === 'active' ? active : archived;

  // Income this month per student (minor units, already converted to primary).
  const earnedByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'income' || !tx.studentId) continue;
      map.set(tx.studentId, (map.get(tx.studentId) ?? 0) + (tx.convertedAmount ?? 0));
    }
    return map;
  }, [transactions]);

  const topEarners = useMemo(() => {
    return active
      .map((s) => ({ id: s.id, name: s.name, earned: earnedByStudent.get(s.id) ?? 0 }))
      .filter((e) => e.earned > 0)
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 5);
  }, [active, earnedByStudent]);
  const maxEarned = topEarners[0]?.earned ?? 0;

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
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, archivedAt: new Date().toISOString() } : s)),
    );
    setArchiveId(null);
  }

  async function restore(id: string) {
    await api.delete(`/students/${id}/archive`);
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, archivedAt: null } : s)));
  }

  return (
    <div className="page-enter space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="hidden text-xl font-semibold tracking-tight md:block">{t('Students')}</h1>
          <p className="text-xs text-muted-foreground">
            {active.length === 0
              ? t('No students yet')
              : t('{count} active', { count: active.length })}
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

      {/* Top earners — name + amount rows with progress bars, mirrors mobile. */}
      <Collapse open={topEarners.length > 0} className="p-1">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('Top earners · this month')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topEarners.map(({ id, name, earned }) => (
              <div key={id} className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm">{name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-income">
                    {fmtMoney(earned, primaryCurrency)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-income transition-all duration-500 ease-in-out"
                    style={{ width: `${maxEarned > 0 ? (earned / maxEarned) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Collapse>

      <TabSwitcher<StudentsTab>
        value={tab}
        onChange={setTab}
        groupId="students"
        tabs={[
          { key: 'active', label: t('Active') },
          { key: 'archived', label: t('Archived') },
        ]}
      />

      <FadeSwap motionKey={`${tab}-${list.length === 0 ? 'empty' : 'list'}`}>
        {list.length === 0 ? (
          tab === 'active' ? (
            <EmptyState onAdd={startCreate} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
              {t('No data')}
            </div>
          )
        ) : (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {list.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  earnedMinor={earnedByStudent.get(s.id)}
                  primaryCurrency={primaryCurrency}
                  onEdit={() => startEdit(s)}
                  onArchive={() => setArchiveId(s.id)}
                  onRestore={() => restore(s.id)}
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
