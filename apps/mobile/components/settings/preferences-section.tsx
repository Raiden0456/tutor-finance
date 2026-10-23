import * as React from 'react';
import { View } from 'react-native';
import { AI_LANGUAGE_NAMES, type AiLanguage } from '@tutor-finance/shared';
import { Field } from '~/components/common/field';
import { Notice } from '~/components/common/notice';
import { SelectField } from '~/components/common/select-field';
import { Segmented } from '~/components/common/segmented';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';
import { currencyOptions } from '~/lib/catalog';
import { useI18n, type TFunction } from '~/lib/i18n';
import { useSettings } from '~/lib/settings';
import { useThemePref } from '~/lib/theme-pref';
import type { Currency, Settings, Theme, WeekStartsOn } from '~/lib/types';

const WEEK_DAY_KEYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function PreferencesSection({ settings, t }: { settings: Settings; t: TFunction }) {
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useThemePref();
  const { update } = useSettings();
  const [currency, setCurrency] = React.useState<Currency>(settings.primaryCurrency);
  const [weekStart, setWeekStart] = React.useState<WeekStartsOn>(settings.weekStartsOn);
  const [aiLanguage, setAiLanguage] = React.useState<AiLanguage>(settings.aiLanguage ?? 'auto');
  const initialReminder = settings.lessonReminderMinutes ?? 30;
  const [reminderChoice, setReminderChoice] = React.useState<string>(
    ['10', '30', '60'].includes(String(initialReminder)) ? String(initialReminder) : 'custom',
  );
  const [customMinutes, setCustomMinutes] = React.useState(String(initialReminder));
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const aiLanguageOptions = [
    { value: 'auto', label: t('Same as interface') },
    ...Object.entries(AI_LANGUAGE_NAMES).map(([value, label]) => ({ value, label })),
  ];
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
        aiLanguage,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="gap-4 pt-5">
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
        <Field label={t('Time zone')} hint={t('Detected automatically from your device')}>
          <Input value={settings.timezone} editable={false} />
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
            onChange={(v) => {
              setLocale(v);
              void update({ locale: v }).catch(() => undefined);
            }}
            options={[
              { value: 'en', label: t('English') },
              { value: 'ru', label: t('Russian') },
            ]}
          />
        </Field>
        <Field
          label={t('Assistant language')}
          hint={t('The assistant replies in the language you write in; this is used otherwise.')}
        >
          <SelectField
            value={aiLanguage}
            onValueChange={(v) => setAiLanguage(v as AiLanguage)}
            options={aiLanguageOptions}
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
