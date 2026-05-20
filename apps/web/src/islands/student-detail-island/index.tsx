import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, ChevronLeft, Mail, MessageSquare, Pencil, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { I18nProvider, localizePath, useI18n, type Locale } from '@/lib/i18n';
import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
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
import { LessonCard } from '@/components/lesson-card';
import { StudentDialog } from '@/islands/students-island/student-dialog';
import type { Lesson, Student } from '@/lib/types';

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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

interface Props {
  student: Student;
  lessons: Lesson[];
  totalIncome: number;
  primaryCurrency: Currency;
  backUrl?: string;
  locale?: Locale;
}

export function StudentDetailIsland({ locale, ...props }: Props) {
  return (
    <I18nProvider locale={locale}>
      <StudentDetailContent {...props} />
    </I18nProvider>
  );
}

function StudentDetailContent({
  student: initialStudent,
  lessons: initialLessons,
  totalIncome: initialTotalIncome,
  primaryCurrency,
  backUrl = '/students',
}: Omit<Props, 'locale'>) {
  const { locale, t } = useI18n();
  const [student, setStudent] = useState(initialStudent);
  const [lessons, setLessons] = useState(initialLessons);
  const [totalIncome, setTotalIncome] = useState(initialTotalIncome);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const tint = useMemo(() => avatarTint(student.id), [student.id]);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const upcomingLessons = useMemo(
    () =>
      lessons
        .filter((l) => {
          if (l.status !== 'scheduled') return false;
          const d = new Date(l.startsAt);
          const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return ds >= todayStr;
        })
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [lessons, todayStr],
  );

  const recentLessons = useMemo(
    () =>
      lessons
        .filter((l) => l.status !== 'scheduled')
        .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
        .slice(0, 10),
    [lessons],
  );

  const dueByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of lessons) {
      if (l.status !== 'due' && l.status !== 'partially_paid') continue;
      if (!l.effectivePrice) continue;
      const { amount, currency } = l.effectivePrice;
      const paid = l.status === 'partially_paid' ? (l.paidAmount ?? 0) : 0;
      const owed = amount - paid;
      if (owed <= 0) continue;
      map.set(currency, (map.get(currency) ?? 0) + owed);
    }
    return Array.from(map.entries()).map(([currency, amount]) => ({
      currency: currency as Currency,
      amount,
    }));
  }, [lessons]);

  async function handleEditSubmit(form: HTMLFormElement) {
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim() || undefined;
    const phone = String(data.get('phone') ?? '').trim() || undefined;
    const notes = String(data.get('notes') ?? '').trim() || undefined;
    const currency = String(data.get('currency') ?? 'USD') as Currency;
    const rateValue = String(data.get('rate') ?? '0');
    const hourlyRate = { amount: parseMajorToMinor(rateValue, currency), currency };
    const updated = await api.patch<Student>(`/students/${student.id}`, {
      name,
      email,
      phone,
      hourlyRate,
      defaultCurrency: currency,
      notes,
    });
    setStudent(updated);
    setEditOpen(false);
  }

  async function handleArchive() {
    await api.post(`/students/${student.id}/archive`);
    window.location.href = localizePath('/students', locale);
  }

  async function reloadStudentFinancials() {
    const [freshLessons, transactions] = await Promise.all([
      api.get<Lesson[]>('/lessons', {
        query: { studentId: student.id, limit: 200, orderDir: 'asc' },
      }),
      api.get<{ convertedAmount: number | null }[]>('/transactions', {
        query: { studentId: student.id, type: 'income', target: primaryCurrency, limit: 1000 },
      }),
    ]);
    setLessons(freshLessons);
    setTotalIncome(
      transactions.reduce(
        (sum, tx) => sum + (typeof tx.convertedAmount === 'number' ? tx.convertedAmount : 0),
        0,
      ),
    );
  }

  const resolvedBackUrl = backUrl === '/students' ? localizePath('/students', locale) : backUrl;

  return (
    <div className="page-enter space-y-5">
      {/* Back nav */}
      <a
        href={resolvedBackUrl}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {backUrl === '/students' ? t('Students') : t('Back')}
      </a>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-primary-foreground"
            style={{ backgroundColor: tint }}
            aria-hidden
          >
            {initials(student.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-semibold">{student.name}</h2>
            <div className="mt-0.5 text-sm text-muted-foreground">
              {fmtMoney(student.hourlyRate.amount, student.hourlyRate.currency)}
              <span className="ml-1 text-xs">{t('/ hr')}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <ResponsiveModal open={editOpen} onOpenChange={setEditOpen}>
              <ResponsiveModalTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditOpen(true)}
                  aria-label={t('Edit student')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </ResponsiveModalTrigger>
              <StudentDialog editing={student} onSubmit={handleEditSubmit} />
            </ResponsiveModal>
            <ResponsiveModal open={archiveOpen} onOpenChange={setArchiveOpen}>
              <ResponsiveModalTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setArchiveOpen(true)}
                  className="text-muted-foreground"
                  aria-label={t('Archive')}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </ResponsiveModalTrigger>
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
                  <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                    {t('Cancel')}
                  </Button>
                  <Button variant="destructive" onClick={handleArchive}>
                    {t('Archive')}
                  </Button>
                </ResponsiveModalFooter>
              </ResponsiveModalContent>
            </ResponsiveModal>
          </div>
        </div>

        {(student.email || student.phone || student.notes) && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {student.email && (
              <a
                href={`mailto:${student.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {student.email}
              </a>
            )}
            {student.phone && (
              <a
                href={`tel:${student.phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {student.phone}
              </a>
            )}
            {student.notes && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{student.notes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('Total earned')}
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {fmtMoney(totalIncome, primaryCurrency)}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{primaryCurrency}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t('Total due')}
          </div>
          {dueByCurrency.length === 0 ? (
            <div className="mt-1 text-lg font-semibold text-tf-jade">—</div>
          ) : (
            <div className="mt-1 space-y-0.5">
              {dueByCurrency.map(({ currency, amount }) => (
                <div key={currency} className="text-lg font-semibold tabular-nums text-tf-pollen">
                  {fmtMoney(amount, currency)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming lessons */}
      {upcomingLessons.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('Upcoming')}
          </h3>
          <AnimatePresence initial={false}>
            {upcomingLessons.map((lesson) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <LessonCard
                  lesson={lesson}
                  studentName={student.name}
                  onChanged={reloadStudentFinancials}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}

      {/* Recent lessons */}
      {recentLessons.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('Recent')}
          </h3>
          <AnimatePresence initial={false}>
            {recentLessons.map((lesson) => (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <LessonCard
                  lesson={lesson}
                  studentName={student.name}
                  onChanged={reloadStudentFinancials}
                  onDeleted={reloadStudentFinancials}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </section>
      )}

      {upcomingLessons.length === 0 && recentLessons.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">{t('No lessons yet')}</div>
      )}
    </div>
  );
}
