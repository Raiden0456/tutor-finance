import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { startOfMonth } from 'date-fns';
import { Users } from 'lucide-react-native';
import { Screen } from '~/components/common/screen';
import { StudentCard } from '~/components/students/student-card';
import { StudentForm } from '~/components/forms/student-form';
import { Fab } from '~/components/common/fab';
import { Segmented } from '~/components/common/segmented';
import { TabFade } from '~/components/common/tab-fade';
import { StaggerItem } from '~/components/common/stagger';
import { EmptyState } from '~/components/common/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { Skeleton } from '~/components/ui/skeleton';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { useApiQuery } from '~/lib/use-query';
import { useI18n } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import { money } from '~/lib/format';
import type { Student, Tx } from '~/lib/types';

export default function StudentsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { primaryCurrency } = useSettings();
  const [tab, setTab] = React.useState<'active' | 'archived'>('active');
  const [formOpen, setFormOpen] = React.useState(false);

  const students = useApiQuery(
    () => api.get<Student[]>('students', { query: { includeArchived: true } }),
    [],
  );
  const income = useApiQuery(
    () =>
      api.get<Tx[]>('transactions', {
        query: {
          type: 'income',
          from: startOfMonth(new Date()).toISOString(),
          to: new Date().toISOString(),
          target: primaryCurrency,
          limit: 1000,
        },
      }),
    [primaryCurrency],
  );

  const earnedByStudent = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of income.data ?? []) {
      if (!tx.studentId) continue;
      map.set(tx.studentId, (map.get(tx.studentId) ?? 0) + (tx.convertedAmount ?? 0));
    }
    return map;
  }, [income.data]);

  const all = students.data ?? [];
  const active = all.filter((s) => !s.archivedAt);
  const archived = all.filter((s) => s.archivedAt);
  const list = tab === 'active' ? active : archived;

  const topEarners = React.useMemo(() => {
    return active
      .map((s) => ({ student: s, earned: earnedByStudent.get(s.id) ?? 0 }))
      .filter((e) => e.earned > 0)
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 5);
  }, [active, earnedByStudent]);
  const maxEarned = topEarners[0]?.earned ?? 0;

  return (
    <View className="flex-1">
      <Screen
        title={t('Students')}
        subtitle={t('{count} active', { count: active.length })}
        refreshing={students.loading}
        onRefresh={() => {
          void students.refetch();
          void income.refetch();
        }}
      >
        <View className="gap-4">
          {topEarners.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Top earners · this month')}</CardTitle>
              </CardHeader>
              <CardContent className="gap-3">
                {topEarners.map(({ student, earned }) => (
                  <View key={student.id} className="gap-1">
                    <View className="flex-row justify-between">
                      <Text className="text-sm" numberOfLines={1}>
                        {student.name}
                      </Text>
                      <Text className="text-sm font-semibold text-income">
                        {money(earned, primaryCurrency, locale)}
                      </Text>
                    </View>
                    <Progress
                      value={maxEarned > 0 ? (earned / maxEarned) * 100 : 0}
                      indicatorClassName="bg-income"
                    />
                  </View>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <View className="gap-3">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'active', label: t('Active') },
                { value: 'archived', label: t('Archived') },
              ]}
            />
            <TabFade tabKey={tab}>
              {students.loading && all.length === 0 ? (
                <View className="gap-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </View>
              ) : list.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('No students yet')}
                  description={t('Add your first one to start tracking lessons.')}
                />
              ) : (
                <View className="gap-2">
                  {list.map((s, i) => (
                    <StaggerItem key={s.id} index={i}>
                      <StudentCard
                        student={s}
                        earnedMinor={earnedByStudent.get(s.id)}
                        onPress={() => router.push(`/(app)/students/${s.id}`)}
                      />
                    </StaggerItem>
                  ))}
                </View>
              )}
            </TabFade>
          </View>
        </View>
      </Screen>

      <Fab onPress={() => setFormOpen(true)} />
      <StudentForm open={formOpen} onOpenChange={setFormOpen} onSaved={() => students.refetch()} />
    </View>
  );
}
