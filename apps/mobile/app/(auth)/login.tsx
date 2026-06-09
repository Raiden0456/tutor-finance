import * as React from 'react';
import { View } from 'react-native';
import { Link } from 'expo-router';
import { AuthScaffold } from '~/components/auth-scaffold';
import { Field } from '~/components/field';
import { GoogleButton } from '~/components/google-button';
import { Notice } from '~/components/notice';
import { PasswordInput } from '~/components/password-input';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { authClient } from '~/lib/auth-client';
import { useI18n } from '~/lib/i18n';

export default function LoginScreen() {
  const { t } = useI18n();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
      if (err) setError(t('Invalid email or password'));
    } catch {
      setError(t('Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title={t('Sign in to your Uchetka account')}>
      <View className="gap-4">
        <Notice message={error} />
        <Field label={t('Email')}>
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </Field>
        <Field label={t('Password')}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="current-password" />
        </Field>

        <View className="-mt-1 flex-row justify-end">
          <Link href="/(auth)/forgot-password" asChild>
            <Text className="text-sm text-primary">{t('Forgot password?')}</Text>
          </Link>
        </View>

        <Button onPress={submit} disabled={loading || !email || !password}>
          {loading ? <Spinner color="#fff" /> : <Text>{t('Login')}</Text>}
        </Button>

        <View className="flex-row items-center gap-3">
          <Separator className="flex-1" />
          <Text className="text-xs text-muted-foreground">{t('OR')}</Text>
          <Separator className="flex-1" />
        </View>

        <GoogleButton onError={setError} />

        <View className="flex-row justify-center gap-1.5 pt-2">
          <Text className="text-sm text-muted-foreground">{t('No account?')}</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Text className="text-sm font-medium text-primary">{t('Sign up')}</Text>
          </Link>
        </View>
      </View>
    </AuthScaffold>
  );
}
