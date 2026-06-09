import * as React from 'react';
import { Linking, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { toMinorUnits } from '@tutor-finance/shared';
import { Mail, Phone, Send, MessageCircle, Video, Pencil, Archive, ArchiveRestore } from 'lucide-react-native';
import { Screen } from '~/components/common/screen';
import { StudentAvatar } from '~/components/students/student-avatar';
import { StudentForm } from '~/components/forms/student-form';
import { LessonCard } from '~/components/lessons/lesson-card';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { Progress } from '~/components/ui/progress';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useI18n } from '~/lib/i18n';
import { money } from '~/lib/format';
import type { Lesson, Student, Tx } from '~/lib/types';
import { cn } from '~/lib/utils';

export default function StudentDetailScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const student = useApiQuery(() => api.get<Student>(`students/${id}`), [id]);
  const lessons = useApiQuery(
    () => api.get<Lesson[]>('lessons', { query: { studentId: id, orderDir: 'desc', limit: 100 } }),
    [id],
  );

  const s = student.data;
  const incomeTx = useApiQuery(
    () =>
      s
        ? api.get<Tx[]>('transactions', {
            query: { type: 'income', studentId: id, target: s.defaultCurrency, limit: 1000 },
          })
        : Promise.resolve([]),
    [id, s?.defaultCurrency],
  );
  const totalIncome = (incomeTx.data ?? []).reduce((acc, tx) => acc + (tx.convertedAmount ?? 0), 0);

  const [editOpen, setEditOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [partialOpen, setPartialOpen] = React.useState(false);

  const refresh = () => {
    void student.refetch();
    void lessons.refetch();
    void incomeTx.refetch();
  };

  const toggleArchive = async () => {
    if (!s) return;
    if (s.archivedAt) await api.delete(`students/${s.id}/archive`);
    else await api.post(`students/${s.id}/archive`);
    setArchiveOpen(false);
    if (s.archivedAt) refresh();
    else router.back();
  };

  const markPackagePaid = async () => {
    if (!s?.activePackage) return;
    await api.post(`students/${s.id}/package/payment`, { paidAmount: s.activePackage.price.amount });
    refresh();
  };

  if (student.loading && !s) {
    return (
      <Screen onBack={() => router.back()} title="">
        <View className="gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </View>
      </Screen>
    );
  }
  if (!s) {
    return (
      <Screen onBack={() => router.back()} title={t('Student')}>
        <Text className="text-muted-foreground">{t('Error')}</Text>
      </Screen>
    );
  }

  const pkg = s.activePackage;

  return (
    <>
      <Screen
        onBack={() => router.back()}
        title={s.name}
        refreshing={student.loading}
        onRefresh={refresh}
        right={
          <View className="flex-row gap-1">
            <Button size="icon" variant="ghost" onPress={() => setEditOpen(true)}>
              <Icon as={Pencil} size={18} />
            </Button>
            <Button size="icon" variant="ghost" onPress={() => setArchiveOpen(true)}>
              <Icon as={s.archivedAt ? ArchiveRestore : Archive} size={18} />
            </Button>
          </View>
        }
      >
        <View className="gap-4">
          {/* Identity + contacts */}
          <Card>
            <CardContent className="gap-3 pt-5">
              <View className="flex-row items-center gap-3">
                <StudentAvatar name={s.name} className="size-14" />
                <View className="flex-1">
                  <Text className="text-lg font-semibold">{s.name}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {t('Total earned')}: {money(totalIncome, s.defaultCurrency, locale)}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2">
                <ContactButton icon={Mail} value={s.email} href={s.email ? `mailto:${s.email}` : undefined} />
                <ContactButton icon={Phone} value={s.phone} href={s.phone ? `tel:${s.phone}` : undefined} />
                <ContactButton icon={Send} value={s.telegramLink ? 'Telegram' : undefined} href={s.telegramLink} />
                <ContactButton icon={MessageCircle} value={s.whatsappLink ? 'WhatsApp' : undefined} href={s.whatsappLink} />
                <ContactButton icon={Video} value={s.meetingLink ? t('Meeting link') : undefined} href={s.meetingLink} />
              </View>
            </CardContent>
          </Card>

          {/* Pricing / package */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Pricing')}</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              {pkg ? (
                <>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-muted-foreground">{t('Lesson package')}</Text>
                    <Badge
                      className={cn(
                        'border-transparent',
                        pkg.paymentStatus === 'paid' ? 'bg-income/15' : 'bg-tf-pollen/25',
                      )}
                    >
                      <Text className={cn('text-xs', pkg.paymentStatus === 'paid' ? 'text-income' : 'text-foreground')}>
                        {pkg.paymentStatus === 'paid' ? t('Paid') : t('Unpaid')}
                      </Text>
                    </Badge>
                  </View>
                  <Text className="text-sm">
                    {t('{done} of {total} lessons used', {
                      done: pkg.completedLessons,
                      total: pkg.lessonCount,
                    })}
                  </Text>
                  <Progress value={(pkg.completedLessons / Math.max(1, pkg.lessonCount)) * 100} />
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-muted-foreground">
                      {t('Remaining')}: {pkg.remainingLessons}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {money(pkg.price.amount, pkg.price.currency, locale)}
                    </Text>
                  </View>
                  {pkg.overageLessons > 0 ? (
                    <Text className="text-xs text-expense">
                      {t('Package overrun: {count} extra lessons', { count: pkg.overageLessons })}
                    </Text>
                  ) : null}
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    {pkg.paymentStatus !== 'paid' ? (
                      <>
                        <Button size="sm" onPress={markPackagePaid}>
                          <Text>{t('Mark package paid')}</Text>
                        </Button>
                        <Button size="sm" variant="outline" onPress={() => setPartialOpen(true)}>
                          <Text>{t('Partial payment')}</Text>
                        </Button>
                      </>
                    ) : null}
                    <Button size="sm" variant="ghost" onPress={() => setCloseOpen(true)}>
                      <Text className="text-destructive">{t('Close package')}</Text>
                    </Button>
                  </View>
                </>
              ) : (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted-foreground">{t('Hourly rate')}</Text>
                  <Text className="text-sm font-semibold">
                    {money(s.hourlyRate.amount, s.hourlyRate.currency, locale)} / {s.ratePeriodMin}
                    {t('m')}
                  </Text>
                </View>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {s.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Text className="text-sm text-muted-foreground">{s.notes}</Text>
              </CardContent>
            </Card>
          ) : null}

          {/* Lessons */}
          <View className="gap-2">
            <Text className="text-base font-semibold">{t('Lessons')}</Text>
            {(lessons.data ?? []).length === 0 ? (
              <Text className="text-sm text-muted-foreground">{t('No lessons yet')}</Text>
            ) : (
              <View className="gap-2">
                {(lessons.data ?? []).map((l) => (
                  <LessonCard key={l.id} lesson={l} studentName={s.name} showDate onChanged={refresh} />
                ))}
              </View>
            )}
          </View>
        </View>
      </Screen>

      <StudentForm open={editOpen} onOpenChange={setEditOpen} student={s} onSaved={refresh} />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{s.archivedAt ? t('Restore') : t('Archive student?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Archived students are hidden from the active list, but their history stays intact.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={toggleArchive}>
              <Text>{s.archivedAt ? t('Restore') : t('Archive')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClosePackageDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        studentId={s.id}
        maxCovered={pkg?.completedLessons ?? 0}
        onDone={refresh}
      />
      <PartialPaymentSheet
        open={partialOpen}
        onOpenChange={setPartialOpen}
        student={s}
        onDone={refresh}
      />
    </>
  );
}

function ContactButton({
  icon,
  value,
  href,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  value?: string | null;
  href?: string | null;
}) {
  if (!value || !href) return null;
  return (
    <Button size="sm" variant="outline" onPress={() => Linking.openURL(href)}>
      <Icon as={icon} size={15} />
      <Text numberOfLines={1}>{value}</Text>
    </Button>
  );
}

function ClosePackageDialog({
  open,
  onOpenChange,
  studentId,
  maxCovered,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  maxCovered: number;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [covered, setCovered] = React.useState(String(maxCovered));

  React.useEffect(() => {
    if (open) setCovered(String(maxCovered));
  }, [open, maxCovered]);

  const submit = async () => {
    await api.post(`students/${studentId}/package/close`, { coveredLessons: Number(covered) || 0 });
    onOpenChange(false);
    onDone();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Close package')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('This stops using the current package for future lessons. Choose how many lessons stay covered by it.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field label={t('Covered lessons from package')}>
          <Input value={covered} onChangeText={setCovered} keyboardType="number-pad" />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Text>{t('Cancel')}</Text>
          </AlertDialogCancel>
          <AlertDialogAction onPress={submit}>
            <Text>{t('Close package')}</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PartialPaymentSheet({
  open,
  onOpenChange,
  student,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const [amount, setAmount] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const pkg = student.activePackage;

  const submit = async () => {
    if (!pkg) return;
    setSaving(true);
    try {
      await api.post(`students/${student.id}/package/payment`, {
        paidAmount: toMinorUnits(Number(amount) || 0, pkg.price.currency),
      });
      onOpenChange(false);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('Partial package payment')}
      footer={
        <Button onPress={submit} disabled={saving || !amount}>
          <Text>{t('Save')}</Text>
        </Button>
      }
    >
      <View className="gap-3">
        {pkg ? (
          <Text className="text-sm text-muted-foreground">
            {t('Package price:')} {money(pkg.price.amount, pkg.price.currency, locale)}
          </Text>
        ) : null}
        <Field label={t('Amount')}>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
        </Field>
      </View>
    </FormSheet>
  );
}
