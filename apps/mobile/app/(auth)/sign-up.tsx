import * as React from 'react';
import { View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { MailCheck } from 'lucide-react-native';
import { AuthScaffold } from '~/components/auth-scaffold';
import { Field } from '~/components/field';
import { GoogleButton } from '~/components/google-button';
import { Notice } from '~/components/notice';
import { PasswordInput } from '~/components/password-input';
import { Button } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { authClient } from '~/lib/auth-client';
import { useI18n } from '~/lib/i18n';

export default function SignUpScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim(),
      });
      if (err) setError(t('Could not create account'));
      else setSent(true);
    } catch {
      setError(t('Could not create account'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { error: err } = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: '/',
      });
      if (err) setError(t('Could not resend verification email'));
      else setNotice(t('Verification email sent again. Check your inbox.'));
    } catch {
      setError(t('Could not resend verification email'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthScaffold title={t('Check your email')}>
        <View className="items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-income/15">
            <Icon as={MailCheck} size={28} className="text-income" />
          </View>
          <Text className="text-center text-sm text-muted-foreground">
            {t('We sent a verification link to')} <Text className="font-medium text-foreground">{email}</Text>.{' '}
            {t('Verify it, then sign in.')}
          </Text>
          <Notice message={error} />
          <Notice message={notice} variant="success" />
          <View className="w-full gap-2 pt-1">
            <Button variant="outline" onPress={resend} disabled={loading}>
              {loading ? <Spinner /> : <Text>{t('Resend verification email')}</Text>}
            </Button>
            <Button onPress={() => router.replace('/(auth)/login')}>
              <Text>{t('Go to sign in')}</Text>
            </Button>
          </View>
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title={t('Create account')}>
      <View className="gap-4">
        <Notice message={error} />
        <Field label={t('Name')}>
          <Input value={name} onChangeText={setName} autoComplete="name" />
        </Field>
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
        <Field label={t('Password')} hint={t('At least 8 characters.')}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="new-password" />
        </Field>

        <Button onPress={submit} disabled={loading || !email || password.length < 8}>
          {loading ? <Spinner color="#fff" /> : <Text>{t('Create account')}</Text>}
        </Button>

        <View className="flex-row items-center gap-3">
          <Separator className="flex-1" />
          <Text className="text-xs text-muted-foreground">{t('OR')}</Text>
          <Separator className="flex-1" />
        </View>

        <GoogleButton onError={setError} />

        <View className="flex-row justify-center gap-1.5 pt-2">
          <Text className="text-sm text-muted-foreground">{t('Already have an account?')}</Text>
          <Link href="/(auth)/login" asChild>
            <Text className="text-sm font-medium text-primary">{t('Sign in')}</Text>
          </Link>
        </View>
      </View>
    </AuthScaffold>
  );
}
