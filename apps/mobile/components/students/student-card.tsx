import { Pressable, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { StudentAvatar } from '~/components/students/student-avatar';
import { money } from '~/lib/format';
import { useI18n } from '~/lib/i18n';
import type { Student } from '~/lib/types';

export function StudentCard({
  student,
  earnedMinor,
  onPress,
}: {
  student: Student;
  earnedMinor?: number;
  onPress?: () => void;
}) {
  const { t, locale } = useI18n();

  const pricing =
    student.pricingMode === 'package' && student.activePackage
      ? `${t('Package')} · ${student.activePackage.remainingLessons} ${t('Remaining').toLowerCase()}`
      : `${money(student.hourlyRate.amount, student.hourlyRate.currency, locale)} / ${student.ratePeriodMin}${t('m')}`;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:opacity-80"
    >
      <StudentAvatar name={student.name} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1.5">
          <Text className="shrink font-medium" numberOfLines={1}>
            {student.name}
          </Text>
          {student.dueLessonsCount ? (
            <View className="shrink-0 flex-row items-center gap-1 rounded-full bg-tf-pollen/15 px-1.5 py-0.5">
              <View className="h-1.5 w-1.5 rounded-full bg-tf-pollen" />
              <Text className="text-[10px] font-medium text-tf-pollen">
                {t('{count} unpaid', { count: student.dueLessonsCount })}
              </Text>
            </View>
          ) : null}
        </View>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {pricing}
        </Text>
      </View>
      {typeof earnedMinor === 'number' ? (
        <View className="items-end">
          <Text className="text-[11px] text-muted-foreground">{t('Earned')}</Text>
          <Text className="font-semibold text-income">
            {money(earnedMinor, student.defaultCurrency, locale)}
          </Text>
        </View>
      ) : null}
      <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
    </Pressable>
  );
}
