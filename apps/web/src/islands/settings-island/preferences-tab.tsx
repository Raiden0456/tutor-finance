import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AI_LANGUAGE_NAMES,
  SUPPORTED_CURRENCIES,
  type AiLanguage,
  type Currency,
  type WeekStartsOn,
} from '@tutor-finance/shared';
import { Check } from 'lucide-react';
import type { Locale } from '@/lib/i18n';
import type { Theme } from '@/utils/theme';

const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const LANGUAGES: Array<{ value: Locale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
];

const AI_LANGUAGE_OPTIONS = Object.entries(AI_LANGUAGE_NAMES) as Array<[AiLanguage, string]>;

const REMINDER_PRESETS = ['10', '30', '60'];

const weekStartOptions: Array<{ value: WeekStartsOn; label: string }> = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
];

type Props = {
  appLocale: Locale;
  primaryCurrency: Currency;
  weekStartsOn: WeekStartsOn;
  lessonReminderMinutes: number;
  timezone: string;
  aiLanguage: AiLanguage;
  theme: Theme;
  saving: boolean;
  saved: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  onPrimaryCurrencyChange: (value: Currency) => void;
  onWeekStartsOnChange: (value: WeekStartsOn) => void;
  onLessonReminderChange: (value: number) => void;
  onAiLanguageChange: (value: AiLanguage) => void;
  onThemeChange: (value: Theme) => void;
  onLocaleChange: (value: Locale) => void;
  onSave: () => void;
};

export function PreferencesTab({
  appLocale,
  primaryCurrency,
  weekStartsOn,
  lessonReminderMinutes,
  timezone,
  aiLanguage,
  theme,
  saving,
  saved,
  t,
  onPrimaryCurrencyChange,
  onWeekStartsOnChange,
  onLessonReminderChange,
  onAiLanguageChange,
  onThemeChange,
  onLocaleChange,
  onSave,
}: Props) {
  const [reminderChoice, setReminderChoice] = useState<string>(
    REMINDER_PRESETS.includes(String(lessonReminderMinutes))
      ? String(lessonReminderMinutes)
      : 'custom',
  );
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('Appearance')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>{t('Theme')}</Label>
            <Select value={theme} onValueChange={(v) => onThemeChange(v as Theme)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEMES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t('Language')}</Label>
            <Select value={appLocale} onValueChange={(v) => onLocaleChange(v as Locale)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{t('Assistant language')}</Label>
            <Select value={aiLanguage} onValueChange={(v) => onAiLanguageChange(v as AiLanguage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t('Same as interface')}</SelectItem>
                {AI_LANGUAGE_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('The assistant replies in the language you write in; this is used otherwise.')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('Preferences')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>{t('Primary currency')}</Label>
            <Select
              value={primaryCurrency}
              onValueChange={(v) => onPrimaryCurrencyChange(v as Currency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('Week starts on')}</Label>
            <Select
              value={String(weekStartsOn)}
              onValueChange={(v) => onWeekStartsOnChange(Number(v) as WeekStartsOn)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekStartOptions.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {t(option.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('Lesson reminder')}</Label>
            <div className="flex gap-2">
              <Select
                value={reminderChoice}
                onValueChange={(v) => {
                  setReminderChoice(v);
                  if (v !== 'custom') onLessonReminderChange(Number(v));
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">{t('{count} min', { count: 10 })}</SelectItem>
                  <SelectItem value="30">{t('{count} min', { count: 30 })}</SelectItem>
                  <SelectItem value="60">{t('1 hour')}</SelectItem>
                  <SelectItem value="custom">{t('Custom')}</SelectItem>
                </SelectContent>
              </Select>
              {reminderChoice === 'custom' ? (
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={lessonReminderMinutes}
                  onChange={(e) => {
                    const v = Math.min(1440, Math.max(1, Number(e.target.value) || 30));
                    onLessonReminderChange(v);
                  }}
                  className="w-24"
                />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{t('Minutes before lesson')}</p>
          </div>

          <div className="grid gap-2">
            <Label>{t('Time zone')}</Label>
            <Input value={timezone} readOnly className="transition-all duration-200 ease-in-out" />
            <p className="text-xs text-muted-foreground">
              {t('Detected automatically from your device')}
            </p>
          </div>

          <div className="pt-2">
            <Button onClick={onSave} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                t('Saving…')
              ) : saved ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  {t('Saved')}
                </>
              ) : (
                t('Save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
