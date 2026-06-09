import * as React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

type Tone = 'income' | 'expense' | 'net' | 'planned' | 'neutral';

const toneText: Record<Tone, string> = {
  income: 'text-income',
  expense: 'text-expense',
  net: 'text-net',
  planned: 'text-tf-indigo',
  neutral: 'text-foreground',
};

const toneBg: Record<Tone, string> = {
  income: 'bg-income/15',
  expense: 'bg-expense/15',
  net: 'bg-net/15',
  planned: 'bg-tf-indigo/15',
  neutral: 'bg-muted',
};

export function FinanceStat({
  label,
  value,
  icon,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <View className={cn('flex-1 gap-2 rounded-xl border border-border bg-card p-4', className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        {icon ? (
          <View className={cn('h-7 w-7 items-center justify-center rounded-full', toneBg[tone])}>
            <Icon as={icon} size={15} className={toneText[tone]} />
          </View>
        ) : null}
      </View>
      <Text className={cn('text-xl font-bold', toneText[tone])} style={{ fontFamily: 'Onest_700Bold' }}>
        {value}
      </Text>
    </View>
  );
}
