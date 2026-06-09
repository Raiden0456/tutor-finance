import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthScaffold } from '~/components/auth-scaffold';
import { Field } from '~/components/field';
import { Notice } from '~/components/notice';
import { PasswordInput } from '~/components/password-input';
import { Button } from '~/components/ui/button';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { authClient } from '~/lib/auth-client';
import { useI18n } from '~/lib/i18n';

export default function ResetPasswordScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 8) return setError(t('At least 8 characters.'));
    if (password !== confirm) return setError(t('Passwords do not match'));
    if (!token) return setError(t('Missing or invalid reset token'));

    setLoading(true);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token });
      if (err) setError(t('Could not reset password'));
      else setDone(true);
    } catch {
      setError(t('Could not reset password'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthScaffold title={t('Password updated')}>
        <View className="gap-4">
          <Notice variant="success" message={t('Password updated. You can now sign in.')} />
          <Button onPress={() => router.replace('/(auth)/login')}>
            <Text>{t('Go to sign in')}</Text>
          </Button>
        </View>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title={t('New password')}>
      <View className="gap-4">
        <Notice message={error} />
        {!token ? (
          <Notice message={t('Missing reset token. Use the link from your email.')} />
        ) : null}
        <Field label={t('New password')} hint={t('At least 8 characters.')}>
          <PasswordInput value={password} onChangeText={setPassword} autoComplete="new-password" />
        </Field>
        <Field label={t('Confirm password')}>
          <PasswordInput value={confirm} onChangeText={setConfirm} autoComplete="new-password" />
        </Field>
        <Button onPress={submit} disabled={loading || !password || !confirm}>
          {loading ? <Spinner color="#fff" /> : <Text>{t('Update password')}</Text>}
        </Button>
        <Button variant="ghost" onPress={() => router.replace('/(auth)/login')}>
          <Text>{t('Back to sign in')}</Text>
        </Button>
      </View>
    </AuthScaffold>
  );
}
