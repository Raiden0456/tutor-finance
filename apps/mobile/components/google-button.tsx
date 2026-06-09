import * as React from 'react';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';
import { authClient } from '~/lib/auth-client';
import { useI18n } from '~/lib/i18n';

export function GoogleButton({ onError }: { onError?: (message: string) => void }) {
  const { t } = useI18n();
  const [loading, setLoading] = React.useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      // The Better Auth Expo client opens the system browser and returns via the
      // uchetka:// deep link; the session then refreshes and the gate redirects.
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
      if (error) onError?.(t('Could not sign in with Google'));
    } catch {
      onError?.(t('Could not sign in with Google'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onPress={handlePress} disabled={loading}>
      {loading ? <Spinner /> : <Text>{t('Sign in with Google')}</Text>}
    </Button>
  );
}
