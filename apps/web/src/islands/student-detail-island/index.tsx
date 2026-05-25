import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Archive,
  Banknote,
  ChevronLeft,
  Link2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fmtMajor, fmtMoney } from '@/lib/format';
import { I18nProvider, localizePath, useI18n, type Locale } from '@/lib/i18n';
import { parseMajorToMinor, type Currency } from '@tutor-finance/shared';
import { Button } from '@/components/ui/button';
import { TelegramIcon, WhatsAppIcon } from '@/components/social-icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Lesson, PricingMode, Student } from '@/lib/types';

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
  const [closePackageOpen, setClosePackageOpen] = useState(false);
  const [packagePaymentOpen, setPackagePaymentOpen] = useState(false);
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

  const activePackage = student.activePackage;

  const dueByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    if (activePackage) {
      const owed = activePackage.price.amount - activePackage.paidAmount;
      if (owed > 0) map.set(activePackage.price.currency, owed);
    }
    for (const l of lessons) {
      if (l.isPackageCovered) continue;
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
  }, [activePackage, lessons]);

  async function handleEditSubmit(form: HTMLFormElement) {
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim() || undefined;
    const phone = String(data.get('phone') ?? '').trim() || undefined;
    const notes = String(data.get('notes') ?? '').trim() || undefined;
    const meetingLink = String(data.get('meetingLink') ?? '').trim() || undefined;
    const telegramLink = String(data.get('telegramLink') ?? '').trim() || undefined;
    const whatsappLink = String(data.get('whatsappLink') ?? '').trim() || undefined;
    const pricingMode = String(data.get('pricingMode') ?? 'hourly') as PricingMode;
    const body: Record<string, unknown> = {
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
      body.hourlyRate = {
        amount: parseMajorToMinor(String(data.get('rate') ?? '0'), currency),
        currency,
      };
      body.ratePeriodMin = Number(data.get('ratePeriodMin') ?? 60);
      body.defaultCurrency = currency;
    } else {
      const currency = String(data.get('packageCurrency') ?? 'USD') as Currency;
      body.package = {
        lessonCount: Number(data.get('packageLessonCount') ?? 0),
        price: {
          amount: parseMajorToMinor(String(data.get('packagePrice') ?? ''), currency),
          currency,
        },
      };
      body.defaultCurrency = currency;
    }

    const updated = await api.patch<Student>(`/students/${student.id}`, body);
    setStudent(updated);
    setEditOpen(false);
  }

  async function handleArchive() {
    await api.post(`/students/${student.id}/archive`);
    window.location.href = localizePath('/students', locale);
  }

  async function handleClosePackage(form: HTMLFormElement) {
    const data = new FormData(form);
    const coveredLessons = Number(data.get('coveredLessons') ?? 0);
    const updated = await api.post<Student>(`/students/${student.id}/package/close`, {
      coveredLessons,
    });
    setStudent(updated);
    setClosePackageOpen(false);
  }

  async function handlePackagePayment(paidAmount: number) {
    const updated = await api.post<Student>(`/students/${student.id}/package/payment`, {
      paidAmount,
    });
    setStudent(updated);
    setPackagePaymentOpen(false);
    await reloadStudentFinancials();
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
  const packageProgress = activePackage
    ? Math.min(100, Math.round((activePackage.coveredLessons / activePackage.lessonCount) * 100))
    : 0;

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
              {student.pricingMode === 'package' && student.activePackage ? (
                <>
                  {fmtMoney(
                    student.activePackage.price.amount,
                    student.activePackage.price.currency,
                  )}
                  <span className="ml-1 text-xs">
                    · {student.activePackage.lessonCount} {t('lessons')}
                  </span>
                </>
              ) : (
                <>
                  {fmtMoney(student.hourlyRate.amount, student.hourlyRate.currency)}
                  <span className="ml-1 text-xs">
                    / {student.ratePeriodMin} {t('min')}
                  </span>
                </>
              )}
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

        {(student.email ||
          student.phone ||
          student.meetingLink ||
          student.telegramLink ||
          student.whatsappLink ||
          student.notes) && (
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
            {student.meetingLink && (
              <a
                href={student.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-all">{student.meetingLink}</span>
              </a>
            )}
            {student.telegramLink && (
              <a
                href={student.telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <TelegramIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                Telegram
              </a>
            )}
            {student.whatsappLink && (
              <a
                href={student.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-tf-jade" />
                WhatsApp
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

      <AnimatePresence initial={false}>
        {activePackage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('Lesson package')}
                </div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {fmtMoney(activePackage.price.amount, activePackage.price.currency)}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t('{done} of {total} lessons used', {
                    done: activePackage.coveredLessons,
                    total: activePackage.lessonCount,
                  })}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ' +
                    (activePackage.paymentStatus === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : activePackage.paymentStatus === 'partially_paid'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        : 'bg-muted text-muted-foreground')
                  }
                >
                  {activePackage.paymentStatus === 'paid'
                    ? t('Paid')
                    : activePackage.paymentStatus === 'partially_paid'
                      ? t('Partial')
                      : t('Unpaid')}
                </span>
                <Button size="sm" variant="outline" onClick={() => setClosePackageOpen(true)}>
                  {t('Close package')}
                </Button>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{t('Package payment')}</span>
                <span className="font-medium tabular-nums">
                  {fmtMoney(activePackage.paidAmount, activePackage.price.currency)} /{' '}
                  {fmtMoney(activePackage.price.amount, activePackage.price.currency)}
                </span>
              </div>
              {activePackage.paymentStatus !== 'paid' && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePackagePayment(activePackage.price.amount)}
                  >
                    <Banknote className="h-4 w-4" />
                    {t('Mark package paid')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPackagePaymentOpen(true)}>
                    {t('Partial payment')}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out"
                style={{ width: `${packageProgress}%` }}
              />
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>
                {t('Remaining')}: {activePackage.remainingLessons}
              </span>
              <span>·</span>
              <span>
                {t('Completed')}: {activePackage.completedLessons}
              </span>
            </div>

            {activePackage.overageLessons > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 transition-colors dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {t('Package overrun: {count} extra lessons', {
                    count: activePackage.overageLessons,
                  })}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

      <ResponsiveModal open={closePackageOpen} onOpenChange={setClosePackageOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Close package')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleClosePackage(e.currentTarget);
            }}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <ResponsiveModalBody className="grid gap-4 text-sm text-muted-foreground">
              <p>
                {t(
                  'This stops using the current package for future lessons. Choose how many lessons stay covered by it.',
                )}
              </p>
              <div className="grid gap-2">
                <Label htmlFor="coveredLessons">{t('Covered lessons from package')}</Label>
                <Input
                  id="coveredLessons"
                  name="coveredLessons"
                  type="number"
                  min="0"
                  max={activePackage?.lessonCount ?? undefined}
                  required
                  defaultValue={activePackage?.coveredLessons ?? 0}
                />
              </div>
            </ResponsiveModalBody>
            <ResponsiveModalFooter>
              <Button variant="outline" type="button" onClick={() => setClosePackageOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit">{t('Close package')}</Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal open={packagePaymentOpen} onOpenChange={setPackagePaymentOpen}>
        <ResponsiveModalContent className="max-w-sm">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>{t('Partial package payment')}</ResponsiveModalTitle>
          </ResponsiveModalHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const raw = String(data.get('paidAmount') ?? '').trim();
              const currency = activePackage?.price.currency ?? primaryCurrency;
              const paidAmount = parseMajorToMinor(raw, currency);
              if (paidAmount >= 0) handlePackagePayment(paidAmount);
            }}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <ResponsiveModalBody className="grid gap-4">
              {activePackage && (
                <p className="text-sm text-muted-foreground">
                  {t('Package price:')}{' '}
                  <span className="font-medium text-foreground">
                    {fmtMoney(activePackage.price.amount, activePackage.price.currency)}
                  </span>
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="paidAmount">
                  {t('Amount received ({currency})', {
                    currency: activePackage?.price.currency ?? primaryCurrency,
                  })}
                </Label>
                <Input
                  id="paidAmount"
                  name="paidAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  max={
                    activePackage
                      ? fmtMajor(activePackage.price.amount, activePackage.price.currency)
                      : undefined
                  }
                  required
                  defaultValue={
                    activePackage
                      ? fmtMajor(activePackage.paidAmount, activePackage.price.currency)
                      : ''
                  }
                  autoFocus
                />
              </div>
            </ResponsiveModalBody>
            <ResponsiveModalFooter>
              <Button variant="outline" type="button" onClick={() => setPackagePaymentOpen(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit">{t('Save')}</Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
}
