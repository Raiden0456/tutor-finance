import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Banknote, CalendarClock, CalendarDays, CheckCircle2, Timer } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { useI18n } from '~/lib/i18n';
import type { Lesson } from '~/lib/types';
import { cn } from '~/lib/utils';

function fmtDuration(mins: number, t: (k: string) => string): string {
  if (mins < 60) return `${mins}${t('m')}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}${t('h')} ${m}${t('m')}` : `${h}${t('h')}`;
}

function MiniStat({
  value,
  label,
  icon,
  colorClass,
  bgClass,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-card p-3">
      <View className={cn('mb-1.5 h-8 w-8 items-center justify-center rounded-xl', bgClass)}>
        <Icon as={icon} size={16} className={colorClass} />
      </View>
      <Text className={cn('text-2xl font-bold', colorClass)} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text className="mt-0.5 text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

export function TodayOverview({ lessons }: { lessons: Lesson[] }) {
  const { t } = useI18n();

  const pending = lessons.filter((l) => l.status === 'scheduled').length;
  const due = lessons.filter(
    (l) => l.status === 'due' || l.status === 'partially_paid' || l.status === 'completed',
  ).length;
  const done = lessons.filter(
    (l) => l.status === 'cancelled' || l.status === 'no_show' || l.status === 'paid',
  ).length;
  const totalMin = lessons.reduce((sum, l) => sum + l.durationMin, 0);

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1.5">
        <Icon as={CalendarClock} size={14} className="text-muted-foreground" />
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("Today's overview")}
        </Text>
      </View>
      <View className="gap-2">
        <View className="flex-row gap-2">
          <MiniStat
            value={String(pending)}
            label={t('Upcoming')}
            icon={CalendarDays}
            colorClass="text-tf-indigo"
            bgClass="bg-tf-indigo/10"
          />
          <MiniStat
            value={String(due)}
            label={t('Due Payment')}
            icon={Banknote}
            colorClass="text-tf-pollen"
            bgClass="bg-tf-pollen/10"
          />
        </View>
        <View className="flex-row gap-2">
          <MiniStat
            value={String(done)}
            label={t('Done')}
            icon={CheckCircle2}
            colorClass="text-income"
            bgClass="bg-income/10"
          />
          <MiniStat
            value={totalMin > 0 ? fmtDuration(totalMin, t) : '—'}
            label={t('Total time')}
            icon={Timer}
            colorClass="text-net"
            bgClass="bg-net/10"
          />
        </View>
      </View>
    </View>
  );
}
