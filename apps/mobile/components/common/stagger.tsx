import * as React from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * Wraps a list item so it fades + slides in, staggered by index — the native
 * counterpart of the web `.page-enter` staggered children (60ms/40ms steps,
 * clamped so long lists don't lag).
 */
export function StaggerItem({
  index,
  step = 40,
  children,
}: {
  index: number;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(260).delay(Math.min(index, 8) * step)}>
      {children}
    </Animated.View>
  );
}
