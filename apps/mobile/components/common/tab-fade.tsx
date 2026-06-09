import * as React from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * Re-fades its children whenever `tabKey` changes — the React Native analogue of
 * web's `motion.div key={activeTab}`. Mount it under a `Segmented` so each tab switch
 * plays a fresh enter animation instead of a hard cut. The `key` is load-bearing: it
 * remounts the subtree so reanimated fires `entering` again on every change.
 */
export function TabFade({
  tabKey,
  children,
  className,
}: {
  tabKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Animated.View key={tabKey} entering={FadeIn.duration(220)} className={className}>
      {children}
    </Animated.View>
  );
}
