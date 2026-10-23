import * as React from 'react';
import { LogOut } from 'lucide-react-native';
import { Field } from '~/components/common/field';
import { Notice } from '~/components/common/notice';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { authClient } from '~/lib/auth-client';
import type { TFunction } from '~/lib/i18n';
import type { Settings } from '~/lib/types';

export function ProfileSection({ settings, t }: { settings: Settings; t: TFunction }) {
  const [name, setName] = React.useState(settings.profile.name ?? '');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await authClient.updateUser({ name: name.trim() });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="gap-4 pt-5">
        <Field label={t('Name')}>
          <Input value={name} onChangeText={setName} />
        </Field>
        <Field label={t('Email')}>
          <Input value={settings.profile.email} editable={false} />
        </Field>
        {saved ? <Notice variant="success" message={t('Saved')} /> : null}
        <Button onPress={save} disabled={saving}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save')}</Text>}
        </Button>
        <Button variant="outline" onPress={() => authClient.signOut()}>
          <Icon as={LogOut} size={16} />
          <Text>{t('Sign out')}</Text>
        </Button>
      </CardContent>
    </Card>
  );
}
