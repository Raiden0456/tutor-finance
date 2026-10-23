import { Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';

export function Fab({ onPress, bottom }: { onPress: () => void; bottom: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ bottom }}
      className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
    >
      <Icon as={Plus} size={26} className="text-primary-foreground" />
    </Pressable>
  );
}
