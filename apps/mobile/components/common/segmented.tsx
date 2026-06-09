import * as React from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Text } from '~/components/ui/text';
import { cn } from '~/lib/utils';

const SPRING = { stiffness: 380, damping: 32, mass: 0.6 } as const;

type Variant = 'default' | 'primary';

// `default` — muted track + card pill (the in-page tab / form-toggle look).
// `primary` — bordered card track + primary-filled pill (the web header
//             language switcher look).
const TRACK: Record<Variant, string> = {
  default: 'bg-muted',
  primary: 'border border-border bg-card',
};
const PILL: Record<Variant, string> = {
  default: 'bg-card shadow-sm shadow-black/5 dark:bg-accent dark:ring-1 dark:ring-border',
  primary: 'bg-primary shadow-sm',
};
const ACTIVE_TEXT: Record<Variant, string> = {
  default: 'text-foreground',
  primary: 'text-primary-foreground',
};

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  variant = 'default',
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  variant?: Variant;
  className?: string;
}) {
  const [width, setWidth] = React.useState(0);
  const pad = 4; // p-1
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const seg = options.length ? (width - pad * 2) / options.length : 0;
  const x = useSharedValue(0);

  React.useEffect(() => {
    x.value = withSpring(idx * seg, SPRING);
  }, [idx, seg, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: seg }));

  return (
    <View
      className={cn('relative flex-row rounded-full p-1', TRACK[variant], className)}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {seg > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[pill, { position: 'absolute', top: pad, bottom: pad, left: pad }]}
          className={cn('rounded-full', PILL[variant])}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className="flex-1 items-center justify-center py-1.5 active:opacity-80"
          >
            <Text
              className={cn(
                'text-sm font-medium',
                active ? ACTIVE_TEXT[variant] : 'text-muted-foreground',
              )}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
