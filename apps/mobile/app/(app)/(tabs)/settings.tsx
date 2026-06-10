import * as React from 'react';
import { View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { Screen } from '~/components/common/screen';
import { Field } from '~/components/common/field';
import { Notice } from '~/components/common/notice';
import { PasswordInput } from '~/components/common/password-input';
import { SelectField } from '~/components/common/select-field';
import { Segmented } from '~/components/common/segmented';
import { GoogleCalendarCard } from '~/components/settings/google-calendar-card';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Input } from '~/components/ui/input';
import { Skeleton } from '~/components/ui/skeleton';
import { Spinner } from '~/components/ui/spinner';
import { TabFade } from '~/components/common/tab-fade';
import { Text } from '~/components/ui/text';
import { api } from '~/lib/api';
import { authClient } from '~/lib/auth-client';
import { currencyOptions } from '~/lib/catalog';
import { useI18n, type TFunction } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import { useThemePref } from '~/lib/theme-pref';
import type { Currency, Settings, Theme, WeekStartsOn } from '~/lib/types';

const WEEK_DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsScreen() {
  const { t } = useI18n();
  const { settings, loading } = useSettings();
  const [tab, setTab] = React.useState<'account' | 'preferences' | 'security'>('account');

  return (
    <Screen title={t('Settings')} subtitle={t('Personalise the app')}>
      {loading && !settings ? (
        <View className="gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full" />
        </View>
      ) : settings ? (
        <View className="gap-4">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'account', label: t('Account') },
              { value: 'preferences', label: t('Preferences') },
              { value: 'security', label: t('Security') },
            ]}
          />
          <TabFade tabKey={tab}>
            {tab === 'account' ? (
              <AccountTab settings={settings} t={t} />
            ) : tab === 'preferences' ? (
              <PreferencesTab settings={settings} t={t} />
            ) : (
              <View className="gap-4">
                <SecurityTab settings={settings} t={t} />
                <GoogleCalendarCard />
              </View>
            )}
          </TabFade>
        </View>
      ) : null}
    </Screen>
  );
}

function AccountTab({ settings, t }: { settings: Settings; t: TFunction }) {
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
      <CardHeader>
        <CardTitle>{t('Profile')}</CardTitle>
      </CardHeader>
      <CardContent className="gap-4">
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

function PreferencesTab({ settings, t }: { settings: Settings; t: TFunction }) {
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useThemePref();
  const { update } = useSettings();
  const [currency, setCurrency] = React.useState<Currency>(settings.primaryCurrency);
  const [weekStart, setWeekStart] = React.useState<WeekStartsOn>(settings.weekStartsOn);
  const initialReminder = settings.lessonReminderMinutes ?? 30;
  const [reminderChoice, setReminderChoice] = React.useState<string>(
    ['10', '30', '60'].includes(String(initialReminder)) ? String(initialReminder) : 'custom',
  );
  const [customMinutes, setCustomMinutes] = React.useState(String(initialReminder));
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const weekOptions = WEEK_DAY_KEYS.map((key, i) => ({ value: String(i), label: t(key) }));
  const reminderOptions = [
    { value: '10', label: t('{count} min', { count: 10 }) },
    { value: '30', label: t('{count} min', { count: 30 }) },
    { value: '60', label: t('1 hour') },
    { value: 'custom', label: t('Custom') },
  ];

  const reminderMinutes =
    reminderChoice === 'custom'
      ? Math.min(1440, Math.max(1, Number(customMinutes) || 30))
      : Number(reminderChoice);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await update({
        primaryCurrency: currency,
        weekStartsOn: weekStart,
        theme,
        locale,
        lessonReminderMinutes: reminderMinutes,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Preferences')}</CardTitle>
      </CardHeader>
      <CardContent className="gap-4">
        <Field label={t('Primary currency')}>
          <SelectField
            value={currency}
            onValueChange={(v) => setCurrency(v as Currency)}
            options={currencyOptions()}
          />
        </Field>
        <Field label={t('Week starts on')}>
          <SelectField
            value={String(weekStart)}
            onValueChange={(v) => setWeekStart(Number(v) as WeekStartsOn)}
            options={weekOptions}
          />
        </Field>
        <Field label={t('Lesson reminder')} hint={t('Minutes before lesson')}>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <SelectField
                value={reminderChoice}
                onValueChange={setReminderChoice}
                options={reminderOptions}
              />
            </View>
            {reminderChoice === 'custom' ? (
              <View className="w-24">
                <Input
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  keyboardType="number-pad"
                  placeholder="30"
                />
              </View>
            ) : null}
          </View>
        </Field>
        <Field label={t('Theme')}>
          <Segmented<Theme>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('Light') },
              { value: 'dark', label: t('Dark') },
              { value: 'system', label: t('System') },
            ]}
          />
        </Field>
        <Field label={t('Language')}>
          <Segmented
            value={locale}
            onChange={(v) => setLocale(v)}
            options={[
              { value: 'en', label: t('English') },
              { value: 'ru', label: t('Russian') },
            ]}
          />
        </Field>
        {saved ? <Notice variant="success" message={t('Settings saved')} /> : null}
        <Button onPress={save} disabled={saving}>
          {saving ? <Spinner color="#fff" /> : <Text>{t('Save settings')}</Text>}
        </Button>
      </CardContent>
    </Card>
  );
}

function SecurityTab({ settings, t }: { settings: Settings; t: TFunction }) {
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
