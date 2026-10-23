import * as React from 'react';
import { Field } from '~/components/common/field';
import { Notice } from '~/components/common/notice';
import { PasswordInput } from '~/components/common/password-input';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { authClient } from '~/lib/auth-client';
import type { TFunction } from '~/lib/i18n';
import type { Settings } from '~/lib/types';

export function SecuritySection({ settings, t }: { settings: Settings; t: TFunction }) {
  const hasPassword = settings.accountSecurity.hasPassword;
  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setOk(null);
    if (next.length < 8) return setError(t('At least 8 characters.'));
    setSaving(true);
    try {
      if (hasPassword) {
        const { error: err } = await authClient.changePassword({
          currentPassword: current,
          newPassword: next,
          revokeOtherSessions: true,
        });
        if (err) return setError(t('Could not update password'));
        setOk(t('Password updated'));
      } else {
        await api.post('settings/password/set', { newPassword: next });
        setOk(t('Password added'));
      }
      setCurrent('');
      setNext('');
    } catch {
      setError(t('Could not update password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{hasPassword ? t('Change password') : t('Add password')}</CardTitle>
        <CardDescription>
          {hasPassword
            ? t('Update your password for email sign-in.')
            : t('Add a password to sign in with email as well as Google.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <Notice message={error} />
        {ok ? <Notice variant="success" message={ok} /> : null}
        {hasPassword ? (
          <Field label={t('Current password')}>
            <PasswordInput value={current} onChangeText={setCurrent} />
          </Field>
        ) : null}
        <Field label={t('New password')} hint={t('At least 8 characters.')}>
          <PasswordInput value={next} onChangeText={setNext} />
        </Field>
        <Button onPress={submit} disabled={saving || !next || (hasPassword && !current)}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Update password')}</Text>}
        </Button>
      </CardContent>
    </Card>
  );
}
