import * as React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  toMinorUnits,
  fromMinorUnits,
  detectMeetingProvider,
  needsPayment,
  isNotPastDay,
  combineDateTime,
  type Currency,
} from '@tutor-finance/shared';
import {
  Archive,
  Ban,
  Banknote,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Link2,
  MoreHorizontal,
  PencilLine,
  RefreshCw,
  Trash2,
  UserX,
  Video,
} from 'lucide-react-native';
import { StatusBadge } from '~/components/lessons/status-badge';
import { ActionSheet, type ActionItem } from '~/components/common/action-sheet';
import { FormSheet } from '~/components/common/form-sheet';
import { Field } from '~/components/common/field';
import { DateTimeField } from '~/components/common/date-time-field';
import { SelectField } from '~/components/common/select-field';
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
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { currencyOptions } from '~/lib/catalog';
import { formatDate, money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import type { Lesson } from '~/lib/types';

export function LessonCard({
  lesson: lessonProp,
  studentName,
  showDate,
  isArchived,
  onChanged,
}: {
  lesson: Lesson;
  studentName: string;
  showDate?: boolean;
  isArchived?: boolean;
  onChanged?: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { primaryCurrency } = useSettings();

  const [lesson, setLesson] = React.useState(lessonProp);
  React.useEffect(() => setLesson(lessonProp), [lessonProp]);

  const [busy, setBusy] = React.useState(false);
  const [cardMenu, setCardMenu] = React.useState(false);
  const [actionMenu, setActionMenu] = React.useState(false);
  const [reschedOpen, setReschedOpen] = React.useState(false);
  const [partialOpen, setPartialOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const price = lesson.effectivePrice;
  const currency: Currency = price?.currency ?? lesson.priceOverride?.currency ?? primaryCurrency;
  const packageCovered = !!lesson.isPackageCovered;
  const scheduledVisible = lesson.status === 'scheduled' || (packageCovered && lesson.status === 'due');
  const dueVisible = needsPayment(lesson.status) && !packageCovered;
  const isPaidish = (lesson.status === 'paid' || lesson.status === 'partially_paid') && !packageCovered;

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const updated = await api.patch<Lesson>(`lessons/${lesson.id}`, body);
      setLesson(updated);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const viewDetails = () => router.push(`/(app)/lessons/${lesson.id}`);

  const cardItems: ActionItem[] = [
    { label: t('View details'), icon: ExternalLink, onPress: viewDetails },
    ...(!isArchived
      ? [{ label: t('Archive'), icon: Archive, onPress: () => void archive() }]
      : []),
    { label: t('Delete'), icon: Trash2, destructive: true, onPress: () => setDeleteOpen(true) },
  ];

  const scheduledItems: ActionItem[] = [
    { label: t('Reschedule'), icon: CalendarClock, onPress: () => setReschedOpen(true) },
    { label: t('Edit Details'), icon: PencilLine, onPress: () => setEditOpen(true) },
    { label: t('No-show'), icon: UserX, onPress: () => void patch({ status: 'no_show' }) },
    { label: t('Cancel lesson'), icon: Ban, destructive: true, onPress: () => void patch({ status: 'cancelled' }) },
  ];

  const dueItems: ActionItem[] = [
    { label: t('Partial payment'), icon: Banknote, onPress: () => setPartialOpen(true) },
    ...(isNotPastDay(lesson.startsAt)
      ? [{ label: t('Edit Details'), icon: PencilLine, onPress: () => setEditOpen(true) }]
      : []),
    { label: t('No-show'), icon: UserX, onPress: () => void patch({ status: 'no_show' }) },
    { label: t('Cancel lesson'), icon: Ban, destructive: true, onPress: () => void patch({ status: 'cancelled' }) },
  ];

  const archive = async () => {
    setBusy(true);
    try {
      await api.post(`lessons/${lesson.id}/archive`);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`lessons/${lesson.id}`);
      setDeleteOpen(false);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const canJoinScheduled = !!lesson.meetingLink && isNotPastDay(lesson.startsAt);

  return (
    <View className="rounded-2xl border border-border bg-card p-4">
      {/* Header */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-medium" numberOfLines={1}>
            {studentName}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Icon as={Clock} size={14} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground">
              {formatDate(lesson.startsAt, 'HH:mm', locale)} · {lesson.durationMin} {t('min')}
              {showDate ? ` · ${formatDate(lesson.startsAt, 'd MMM', locale)}` : ''}
            </Text>
            {lesson.recurringLessonId ? (
              <Icon as={RefreshCw} size={12} className="text-primary/60" />
            ) : null}
          </View>

          {packageCovered ? (
            <Text className="mt-1 text-xs text-muted-foreground">{t('Included in package')}</Text>
          ) : lesson.status === 'partially_paid' && lesson.paidAmount != null && price ? (
            <Text className="mt-1 text-xs text-tf-coral">
              {t('Paid {paid} of {total}', {
                paid: money(lesson.paidAmount, currency, locale),
                total: money(price.amount, currency, locale),
              })}
            </Text>
          ) : price ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              {money(price.amount, price.currency, locale)}
            </Text>
          ) : null}

          {lesson.notes ? (
            <Text className="mt-2 text-sm text-muted-foreground" numberOfLines={2}>
              {lesson.notes}
            </Text>
          ) : null}
          {lesson.homework ? (
            <View className="mt-1.5 flex-row items-start gap-1.5">
              <Icon as={BookOpen} size={12} className="mt-0.5 text-muted-foreground" />
              <Text className="flex-1 text-xs text-muted-foreground" numberOfLines={2}>
                {lesson.homework}
              </Text>
            </View>
          ) : null}
          {lesson.meetingLink ? (
            <Pressable
              onPress={() => Linking.openURL(lesson.meetingLink!)}
              className="mt-1.5 flex-row items-center gap-1.5 active:opacity-70"
            >
              <Icon as={Link2} size={12} className="text-primary" />
              <Text className="flex-1 text-xs text-primary" numberOfLines={1}>
                {detectMeetingProvider(lesson.meetingLink) ?? lesson.meetingLink}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="shrink-0 flex-row items-start gap-1.5">
          <StatusBadge status={lesson.status} />
          <Pressable
            hitSlop={8}
            onPress={() => setCardMenu(true)}
            className="h-6 w-6 items-center justify-center rounded-full active:bg-accent"
          >
            <Icon as={MoreHorizontal} size={16} className="text-muted-foreground" />
          </Pressable>
        </View>
      </View>

      {/* Action area */}
      {scheduledVisible || dueVisible ? (
        <View className="mt-3 border-t border-border pt-3">
          <View className="flex-row items-center gap-2">
            <Button className="flex-1 bg-tf-jade" onPress={() => patch(scheduledVisible ? { status: 'completed' } : { status: 'paid' })} disabled={busy}>
              {busy ? (
                <Spinner color="#fff" />
              ) : (
                <>
                  <Icon as={scheduledVisible ? CheckCircle2 : Banknote} size={16} className="text-white" />
                  <Text className="font-semibold text-white">
                    {scheduledVisible
                      ? t('Mark as Completed')
                      : lesson.status === 'partially_paid'
                        ? t('Pay Remaining')
                        : t('Mark as Paid')}
                  </Text>
                </>
              )}
            </Button>

            {scheduledVisible && canJoinScheduled ? (
              <Pressable
                onPress={() => Linking.openURL(lesson.meetingLink!)}
                className="h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 active:bg-primary/20"
              >
                <Icon as={Video} size={16} className="text-primary" />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => setActionMenu(true)}
              className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:bg-accent"
            >
              <Icon as={MoreHorizontal} size={16} className="text-muted-foreground" />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Card-level overflow menu */}
      <ActionSheet open={cardMenu} onOpenChange={setCardMenu} title={studentName} items={cardItems} />
      {/* Action-area overflow menu */}
      <ActionSheet
        open={actionMenu}
        onOpenChange={setActionMenu}
        items={scheduledVisible ? scheduledItems : dueItems}
      />

      <RescheduleSheet open={reschedOpen} onOpenChange={setReschedOpen} lesson={lesson} onSubmit={patch} />
      <PartialPaymentSheet
        open={partialOpen}
        onOpenChange={setPartialOpen}
        currency={currency}
        fullPrice={price?.amount ?? null}
        onSubmit={patch}
      />
      <EditDetailsSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        lesson={lesson}
        defaultCurrency={currency}
        onSubmit={patch}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete lesson?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This permanently deletes the lesson')}
              {isPaidish ? ` ${t('and its income transaction')}` : ''}. {t('This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('Cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onPress={remove}>
              <Text>{t('Delete')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

function RescheduleSheet({
  open,
  onOpenChange,
  lesson,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useI18n();
  const [date, setDate] = React.useState(new Date(lesson.startsAt));
  const [time, setTime] = React.useState(new Date(lesson.startsAt));
  const [duration, setDuration] = React.useState(String(lesson.durationMin));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setDate(new Date(lesson.startsAt));
    setTime(new Date(lesson.startsAt));
    setDuration(String(lesson.durationMin));
  }, [open, lesson]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({ startsAt: combineDateTime(date, time).toISOString(), durationMin: Number(duration) || 60 });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('Reschedule lesson')}
      footer={
        <Button onPress={submit} disabled={saving}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Field label={t('New date & time')}>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <DateTimeField mode="date" value={date} onChange={setDate} />
            </View>
            <View className="w-28">
              <DateTimeField mode="time" value={time} onChange={setTime} />
            </View>
          </View>
        </Field>
        <Field label={t('Duration (min)')}>
          <Input value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        </Field>
      </View>
    </FormSheet>
  );
}

function PartialPaymentSheet({
  open,
  onOpenChange,
  currency,
  fullPrice,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currency: Currency;
  fullPrice: number | null;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [amount, setAmount] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setAmount('');
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({ status: 'partially_paid', paidAmount: toMinorUnits(Number(amount) || 0, currency) });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('Partial Payment')}
      footer={
        <Button onPress={submit} disabled={saving || !amount}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-3">
        {fullPrice != null ? (
          <Text className="text-sm text-muted-foreground">
            {t('Full lesson price:')} {money(fullPrice, currency, locale)}
          </Text>
        ) : null}
        <Field label={t('Amount received ({currency})', { currency })}>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" />
        </Field>
      </View>
    </FormSheet>
  );
}

function EditDetailsSheet({
  open,
  onOpenChange,
  lesson,
  defaultCurrency,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lesson: Lesson;
  defaultCurrency: Currency;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useI18n();
  const [notes, setNotes] = React.useState('');
  const [homework, setHomework] = React.useState('');
  const [meetingLink, setMeetingLink] = React.useState('');
  const [priceAmount, setPriceAmount] = React.useState('');
  const [priceCurrency, setPriceCurrency] = React.useState<Currency>(defaultCurrency);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setNotes(lesson.notes ?? '');
    setHomework(lesson.homework ?? '');
    setMeetingLink(lesson.meetingLink ?? '');
    setPriceCurrency(lesson.priceOverride?.currency ?? defaultCurrency);
    setPriceAmount(
      lesson.priceOverride
        ? String(fromMinorUnits(lesson.priceOverride.amount, lesson.priceOverride.currency))
        : '',
    );
  }, [open, lesson, defaultCurrency]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({
        notes: notes.trim() || null,
        homework: homework.trim() || null,
        meetingLink: meetingLink.trim() || null,
        priceOverride: priceAmount.trim()
          ? { amount: toMinorUnits(Number(priceAmount) || 0, priceCurrency), currency: priceCurrency }
          : null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('Edit Details')}
      footer={
        <Button onPress={submit} disabled={saving}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
      }
    >
      <View className="gap-4">
        <Field label={t('Price override')} hint={t('Leave blank to use hourly rate')}>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input value={priceAmount} onChangeText={setPriceAmount} keyboardType="decimal-pad" placeholder="0.00" />
            </View>
            <View className="w-28">
              <SelectField
                value={priceCurrency}
                onValueChange={(v) => setPriceCurrency(v as Currency)}
                options={currencyOptions()}
              />
            </View>
          </View>
        </Field>
        <Field label={t('Meeting link')}>
          <Input value={meetingLink} onChangeText={setMeetingLink} autoCapitalize="none" />
        </Field>
        <Field label={t('Homework')}>
          <Textarea value={homework} onChangeText={setHomework} placeholder={t('Add homework…')} />
        </Field>
        <Field label={t('Notes')}>
          <Textarea value={notes} onChangeText={setNotes} placeholder={t('Add a note…')} />
        </Field>
      </View>
    </FormSheet>
  );
}
