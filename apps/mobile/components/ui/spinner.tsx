import { ActivityIndicator } from 'react-native';
import { useColorScheme } from '~/lib/use-color-scheme';

export function Spinner({ size = 'small', color }: { size?: 'small' | 'large'; color?: string }) {
  const { colors } = useColorScheme();
  return <ActivityIndicator size={size} color={color ?? colors.primary} />;
}
