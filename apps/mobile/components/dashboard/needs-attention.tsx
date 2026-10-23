import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { primaryAction, type Currency } from '@tutor-finance/shared';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { SectionHeader } from '~/components/dashboard/section-header';
import { PRIMARY_ACTION_PATCH, PrimaryActionButton } from '~/components/lessons/lesson-actions';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { formatDate, money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import { useMutation } from '~/lib/use-mutation';
import type { Lesson } from '~/lib/types';

type Debt = { studentId: string; lessons: Lesson[]; owed: Map<Currency, number> };

function outstanding(lesson: Lesson): number {
  if (!lesson.effectivePrice) return 0;
  const paid = lesson.status === 'partially_paid' ? (lesson.paidAmount ?? 0) : 0;
  return Math.max(0, lesson.effectivePrice.amount - paid);
}

function groupDebts(lessons: Lesson[]): Debt[] {
  const byStudent = new Map<string, Debt>();
  for (const lesson of lessons) {
    const debt = byStudent.get(lesson.studentId) ?? {
      studentId: lesson.studentId,
      lessons: [],
      owed: new Map<Currency, number>(),
    };
    debt.lessons.push(lesson);
    if (lesson.effectivePrice) {
      const { currency } = lesson.effectivePrice;
      debt.owed.set(currency, (debt.owed.get(currency) ?? 0) + outstanding(lesson));
    }
    byStudent.set(lesson.studentId, debt);
  }
  return [...byStudent.values()];
}

export function NeedsAttention({
  awaiting,
  conflicts,
  nameOf,
  onChanged,
}: {
  awaiting: Lesson[];
  conflicts: [Lesson, Lesson][];
  nameOf: (studentId: string) => string;
  onChanged: () => void;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const debts = React.useMemo(() => groupDebts(awaiting), [awaiting]);
  const count = awaiting.length + conflicts.length;

  return (
    <View className="gap-3">
      <SectionHeader dot="bg-tf-pollen" label={t('Needs attention')} count={count} />

      {count === 0 ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4"
        >
          <Icon as={CheckCircle2} size={20} className="text-income" />
          <Text className="text-sm font-medium">{t('All caught up')}</Text>
        </Animated.View>
      ) : null}

      {debts.map((debt) => (
        <Animated.View
          key={debt.studentId}
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(150)}
          layout={LinearTransition.duration(200)}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          <Pressable
            onPress={() => router.push(`/(app)/students/${debt.studentId}`)}
            className="flex-row items-center gap-2 border-b border-border px-4 py-3 active:bg-accent"
          >
            <View className="min-w-0 flex-1">
              <Text className="font-medium" numberOfLines={1}>
                {nameOf(debt.studentId)}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {t('{count} unpaid', { count: debt.lessons.length })}
              </Text>
            </View>
            <Text className="text-sm font-semibold text-tf-pollen">
              {[...debt.owed.entries()].map(([c, amount]) => money(amount, c, locale)).join(' + ')}
            </Text>
            <Icon as={ChevronRight} size={16} className="text-muted-foreground" />
          </Pressable>
          {debt.lessons.map((lesson) => (
            <AwaitingRow key={lesson.id} lesson={lesson} onChanged={onChanged} />
          ))}
        </Animated.View>
      ))}

      {conflicts.length > 0 ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(150)}
          layout={LinearTransition.duration(200)}
          className="gap-1 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
        >
          <View className="mb-1 flex-row items-center gap-2">
            <Icon as={AlertTriangle} size={16} className="text-destructive" />
            <Text className="text-sm font-semibold">{t('Schedule conflicts')}</Text>
          </View>
          {conflicts.map(([a, b]) => (
            <Pressable
              key={`${a.id}-${b.id}`}
              onPress={() => router.push(`/(app)/lessons/${a.id}`)}
              className="flex-row items-center justify-between gap-2 py-1.5 active:opacity-70"
            >
              <Text className="flex-1 text-sm" numberOfLines={1}>
                {nameOf(a.studentId)} · {nameOf(b.studentId)}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {formatDate(a.startsAt, 'EEE d MMM · HH:mm', locale)}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

function AwaitingRow({ lesson, onChanged }: { lesson: Lesson; onChanged: () => void }) {
  const { locale } = useI18n();
  const router = useRouter();
  const action = primaryAction(lesson);
  const markPaid = useMutation(async () => {
    await api.patch(`lessons/${lesson.id}`, PRIMARY_ACTION_PATCH.mark_paid);
    onChanged();
  });

  return (
    <Pressable
      onPress={() => router.push(`/(app)/lessons/${lesson.id}`)}
      className="flex-row items-center gap-3 px-4 py-2.5 active:bg-accent"
    >
      <View className="flex-1">
        <Text className="text-sm">{formatDate(lesson.startsAt, 'EEE d MMM · HH:mm', locale)}</Text>
        {lesson.effectivePrice ? (
          <Text className="text-xs text-muted-foreground">
            {money(outstanding(lesson), lesson.effectivePrice.currency, locale)}
          </Text>
        ) : null}
      </View>
      {action === 'mark_paid' ? (
        <PrimaryActionButton
          lesson={lesson}
          action={action}
          size="sm"
          busy={markPaid.pending}
          onPress={() => void markPaid.run()}
        />
      ) : null}
    </Pressable>
  );
}
