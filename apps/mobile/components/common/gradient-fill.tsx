import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

/**
 * Absolute-fill diagonal gradient drawn with react-native-svg (already part of
 * the dev build, so no extra native module / rebuild needed). Place as the
 * first child of a relatively-positioned, overflow-hidden container; content
 * after it renders on top.
 */
export function GradientFill({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="200%" height="200%" pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </SvgLinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
