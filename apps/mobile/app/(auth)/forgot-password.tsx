import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthScaffold } from '~/components/common/auth-scaffold';
import { Field } from '~/components/common/field';
import { Notice } from '~/components/common/notice';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { authClient } from '~/lib/auth-client';
import { APP_SCHEME } from '~/lib/env';
import { useI18n } from '~/lib/i18n';

const COOLDOWN = 30;

export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${APP_SCHEME}://reset-password`,
      });
      if (err) setError(t('Could not send reset email'));
      else {
        setSent(true);
        setCooldown(COOLDOWN);
      }
    } catch {
      setError(t('Could not send reset email'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title={t('Reset password')}>
      <View className="gap-4">
        <Notice message={error} />
        {sent ? (
          <Notice
            variant="success"
            message={`${t('If an account exists for')} ${email} ${t('a reset link has been sent.')}`}
          />
        ) : null}

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

        <Button onPress={submit} disabled={loading || !email || cooldown > 0}>
          {loading ? (
            <Spinner color="#fff" />
          ) : (
            <Text>
              {cooldown > 0
                ? t('You can request another link in {seconds}s.', { seconds: cooldown })
                : sent
                  ? t('Resend reset link')
                  : t('Send reset link')}
            </Text>
          )}
        </Button>

        <Button variant="ghost" onPress={() => router.replace('/(auth)/login')}>
          <Text>{t('Back to sign in')}</Text>
        </Button>
      </View>
    </AuthScaffold>
  );
}
