import * as React from 'react';
import { Pressable, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';

type Props = React.ComponentProps<typeof Input>;

export function PasswordInput(props: Props) {
  const [hidden, setHidden] = React.useState(true);
  return (
    <View className="relative justify-center">
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        keyboardType="default"
        {...props}
        secureTextEntry={hidden}
        className="pr-11"
      />
      <Pressable
        hitSlop={8}
        onPress={() => setHidden((h) => !h)}
        className="absolute right-3 h-8 w-8 items-center justify-center"
      >
        <Icon as={hidden ? Eye : EyeOff} size={18} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}
